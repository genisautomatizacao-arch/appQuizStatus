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
                results.push(filePath);
            }
        });
        return results;
    }

    const files = getPdfFiles(PDF_DIR);
    
    if (files.length === 0) {
        console.log("⚠️ Nenhum arquivo PDF encontrado na pasta data/pdfs/.");
        return combinedText;
    }

    console.log(`📄 Encontrados ${files.length} arquivos PDF. Extraindo texto...`);

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
        // Generate a fallback mock if no PDFs are present just to test the frontend
        createMockQuestions();
        return;
    }

    console.log("🤖 Enviando texto para a Inteligência Artificial (Gemini) gerar as perguntas...");

    const prompt = `Você é um Engenheiro Subsea Sênior elaborando um teste de certificação EXTREMAMENTE TÉCNICO e de alta dificuldade com base ESTRITAMENTE nos documentos fornecidos.
SUA TAREFA É CRIAR EXATAMENTE 15 PERGUNTAS DE NÍVEL AVANÇADO. NÃO ACEITAREI MENOS DE 15.

FOCO TÉCNICO (MUITO IMPORTANTE): As perguntas devem abordar detalhes críticos e específicos de engenharia e operação, como:
- Valores exatos de setpoints (pressões de testes, vazões, ranges de torque, tensões de operação).
- Diagnóstico de falhas complexas e procedimentos rigorosos de emergência (ESD/PSD).
- Intertravamentos mecânicos, lógicas de válvulas e características exclusivas do sistema DPR 5KII / HPU / IWOCS.
Evite perguntas conceituais fáceis. Exija conhecimento profundo dos manuais técnicos fornecidos.

REQUISITO OBRIGATÓRIO DE CITAÇÃO NA PERGUNTA:
Para *CADA* pergunta que você criar, você deve explicitamente citar o nome completo do documento (e seção/página, se possível) de onde tirou a informação.
Exemplo: "De acordo com o documento 'D-0737819 - INSTRUÇÃO DE TRABALHO - MOBILIZAÇÃO E INICIALIZAÇÃO DA HPU', qual é o procedimento de..."

IMPORTANTE: Você ESTRITAMENTE DEVE retornar um Array JSON válido com os 15 objetos, sem formatações markdown (como \`\`\`json), apenas o array cru.
Exemplo de formato esperado:
[
  {
    "question": "De acordo com o documento 'Sistema de Controle DPR 5KII', qual a pressão máxima?",
    "options": ["100 psi", "300 psi", "500 psi", "1000 psi"],
    "correctAnswer": 1
  }
]

Aqui estão os textos dos materiais de estudo (separados por marcadores de documento):
"""
${textSource}
"""
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.2, // Low temp for factual consistency
            }
        });

        let resultText = response.text;
        
        // Clean up markdown markers if the AI ignores our instruction
        resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();

        // Validate JSON
        const questions = JSON.parse(resultText);
        
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(questions, null, 2));
        console.log(`🎉 Sucesso! ${questions.length} perguntas foram geradas e salvas em ${OUTPUT_FILE}`);

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
        },
        {
            "question": "Qual destas tecnologias é usada para estilizar páginas web?",
            "options": ["HTML", "Python", "CSS", "Java"],
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
