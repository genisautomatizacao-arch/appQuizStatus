require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');

const PDF_DIR = path.join(__dirname, 'data', 'pdfs');
const OUTPUT_FILE = path.join(__dirname, 'questions.json');

// Get API Key from environment
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("⚠️ AVISO: Variável GEMINI_API_KEY não encontrada. O aplicativo irá gerar um JSON de teste (mock).");
}

// Initialize Gemini SDK
const ai = new GoogleGenAI({ apiKey: apiKey });

async function extractTextFromPDFs() {
    let combinedText = '';
    
    // Ensure dir exists
    if (!fs.existsSync(PDF_DIR)) {
        fs.mkdirSync(PDF_DIR, { recursive: true });
        console.log(`📂 Criado diretório para PDFs: ${PDF_DIR}`);
        return combinedText;
    }

    function getPdfFiles(dir) {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach((file) => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat && stat.isDirectory()) {
                results = results.concat(getPdfFiles(filePath));
            } else if (file.toLowerCase().endsWith('.pdf')) {
                results.push({ path: filePath, mtime: stat.mtime });
            }
        });
        return results;
    }

    // Get files, sort by most recent, and take top 20 to avoid token limits
    const allFiles = getPdfFiles(PDF_DIR);
    const files = allFiles
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, 20)
        .map(f => f.path);
    
    if (files.length === 0) {
        console.log("⚠️ Nenhum arquivo PDF encontrado na pasta data/pdfs/.");
        return combinedText;
    }

    console.log(`📄 Encontrados ${allFiles.length} arquivos PDF. Processando os 20 mais recentes para evitar limites de cota...`);

    for (const filePath of files) {
        const file = path.basename(filePath);
        const dataBuffer = fs.readFileSync(filePath);
        try {
            const parser = new PDFParse({ data: dataBuffer });
            const data = await parser.getText();
            combinedText += `\n\n--- INÍCIO DO DOCUMENTO: ${file} ---\n`;
            combinedText += data.text + '\n';
            combinedText += `--- FIM DO DOCUMENTO: ${file} ---\n\n`;
            await parser.destroy();
            console.log(`✅ Extraído: ${file}`);
        } catch (error) {
            console.error(`❌ Erro ao ler ${file}:`, error);
        }
    }

    return combinedText;
}

async function generateQuizQuestions(textSource) {
    if (!textSource.trim()) {
        console.log("⚠️ Sem texto para processar. Crie um arquivo questions.json manual ou adicione PDFs.");
        createMockQuestions();
        return;
    }

    // Load existing questions to prevent duplicates
    let existingQuestions = [];
    if (fs.existsSync(OUTPUT_FILE)) {
        try {
            existingQuestions = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
            console.log(`📂 Carregadas ${existingQuestions.length} perguntas existentes para evitar repetições.`);
        } catch (e) {
            console.warn("⚠️ Erro ao ler questions.json existente. Começando do zero.");
        }
    }

    const currentTitles = existingQuestions.map(q => q.question).join('\n');

    console.log("🤖 Enviando texto para a Inteligência Artificial (Gemini) gerar NOVAS perguntas...");

    const prompt = `Você é um Engenheiro Subsea Sênior elaborando um teste de certificação EXTREMAMENTE TÉCNICO.
SUA TAREFA É CRIAR EXATAMENTE 15 NOVAS PERGUNTAS DE NÍVEL AVANÇADO que NÃO estejam na lista abaixo.

LISTA DE PERGUNTAS JÁ EXISTENTES (NÃO REPITA ESTAS):
---
${currentTitles.slice(0, 5000)} ... (truncado)
---

FOCO TÉCNICO: Detalhes críticos de engenharia, setpoints, pressões, torques e lógicas do sistema DPR 5KII / HPU / IWOCS.
CITE O DOCUMENTO: Para cada pergunta, cite o nome completo do manual/documento de origem.

RETORNE APENAS O ARRAY JSON CRU com as 15 novas perguntas.

Estudo:
"""
${textSource}
"""
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                temperature: 0.3,
            }
        });

        let resultText = response.text;
        resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();

        const newQuestions = JSON.parse(resultText);
        
        // Merge with existing
        const combined = [...existingQuestions, ...newQuestions];
        
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(combined, null, 2));
        console.log(`🎉 Sucesso! ${newQuestions.length} novas perguntas adicionadas. Total no banco: ${combined.length}`);

    } catch (error) {
        console.error("❌ Erro ao gerar perguntas com a IA:", error);
    }
}

function createMockQuestions() {
    console.log("📝 Criando perguntas de teste (mock)...");
    const mock = [
        {
            "question": "Como você não adicionou PDFs, esta é uma pergunta teste. Qual a cor do cavalo branco de Napoleão?",
            "options": ["Preto", "Marrom", "Branco", "Malhado"],
            "correctAnswer": 2
        }
    ];
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mock, null, 2));
    console.log(`✅ Arquivo mock salvo em ${OUTPUT_FILE}`);
}

async function main() {
    console.log("🚀 Iniciando Gerador de Quiz...");
    const text = await extractTextFromPDFs();
    await generateQuizQuestions(text);
}

main();
