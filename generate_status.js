require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const { GoogleGenAI } = require('@google/genai');

const STATUS_DIR = path.join(__dirname, 'data', 'statusSonda');
const OUTPUT_FILE = path.join(__dirname, 'status.json');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("⚠️ AVISO: Variável GEMINI_API_KEY não encontrada.");
}

const ai = new GoogleGenAI({ apiKey: apiKey });

// Function to get PDFs and DOCXs within a specific directory
function getFilesInDir(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFilesInDir(filePath));
        } else if (file.toLowerCase().endsWith('.pdf') || file.toLowerCase().endsWith('.docx')) {
            results.push(filePath);
        }
    });
    return results;
}

async function extractTextFromFile(filePath) {
    const file = path.basename(filePath);
    const ext = path.extname(file).toLowerCase();
    
    try {
        let text = '';
        if (ext === '.pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const parser = new PDFParse({ data: dataBuffer });
            const data = await parser.getText();
            await parser.destroy();
            text = data.text;
        } else if (ext === '.docx') {
            const result = await mammoth.extractRawText({ path: filePath });
            text = result.value;
        }
        console.log(`✅ Extraído: ${file}`);
        return `\n\n--- INÍCIO DO RELATÓRIO: ${file} ---\n${text}\n--- FIM DO RELATÓRIO: ${file} ---\n\n`;
    } catch (error) {
        console.error(`❌ Erro ao ler ${file}:`, error);
        return '';
    }
}

async function generateStatusCards() {
    console.log("🚀 Iniciando Motor de Resumo de Sondas por Categoria...");

    if (!fs.existsSync(STATUS_DIR)) {
        fs.mkdirSync(STATUS_DIR, { recursive: true });
        console.log(`📂 Criado diretório para Status de Sonda: ${STATUS_DIR}`);
        createMockStatus();
        return;
    }

    // Get top-level directories (e.g., 'ns-38', 'ss-73')
    const sondaFolders = fs.readdirSync(STATUS_DIR).filter(file => {
        return fs.statSync(path.join(STATUS_DIR, file)).isDirectory();
    });

    if (sondaFolders.length === 0) {
         console.log("⚠️ Nenhuma pasta de sonda encontrada dentro de data/statusSonda/.");
         createMockStatus();
         return;
    }

    let allStatusCards = [];

    // Process each folder individually
    for (const folderName of sondaFolders) {
        console.log(`\n=================================================`);
        console.log(`🔍 Processando Sonda: ${folderName.toUpperCase()}`);
        
        const folderPath = path.join(STATUS_DIR, folderName);
        const files = getFilesInDir(folderPath);

        if (files.length === 0) {
            console.log(`⚠️ Nenhum arquivo suportado encontrado para a sonda ${folderName}. Pulando...`);
            continue;
        }

        let combinedText = '';
        for (const filePath of files) {
             combinedText += await extractTextFromFile(filePath);
        }

        console.log(`🤖 Enviando relatórios de ${folderName.toUpperCase()} para a IA resumir...`);

        const prompt = `Você é um Analista de Operações experiente, focado em resumir relatórios diários de Passagem de Serviço de técnicos de campo.
A sonda alvo da análise é: ${folderName.toUpperCase()}.
Abaixo, você receberá o conteúdo extraído dos PDFs de passagem de serviço desta sonda.

Sua tarefa é analisar os textos e criar UM (1) OBJETO JSON detalhado que resuma o status atual desta sonda.

O objeto deve ESTRITAMENTE ter a seguinte estrutura:
{
  "sonda": "${folderName.toUpperCase()}",
  "statusGeral": "Resumo em no máximo 5 palavras (ex: Operação Normal, Manutenção Crítica, Aguardando Peças)",
  "resumoRealizado": "Um parágrafo claro e direto resumindo as principais atividades/testes que foram CONCLUÍDOS ou em andamento durante o dia.",
  "pendencias": [
    "Lista com as pendências 1...",
    "Lista com a pendência 2...",
    "Lista com a pendência 3..."
  ],
  "riscosOuAlertas": "Mencione se houve algum incidente, vazamento ou falha. Se não houve, escreva 'Nenhum reportado'."
}

IMPORTANTE: 
- Retorne SOMENTE o objeto JSON. Não use decorações Markdown (\`\`\`json).
- O array de pendências deve conter itens extraídos ESPECIFICAMENTE do relatório como a fazer/pendente/próximos passos.
- Não invente informações. Baseie-se apenas no texto abaixo.

"""
${combinedText}
"""
`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    temperature: 0.1, 
                }
            });

            let resultText = response.text;
            resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();

            const statusObj = JSON.parse(resultText);
            allStatusCards.push(statusObj);
            console.log(`✅ Status gerado com sucesso para ${folderName.toUpperCase()}`);

        } catch (error) {
            console.error(`❌ Erro ao gerar os Status para ${folderName} com a IA:`, error);
        }
    }

    if (allStatusCards.length > 0) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allStatusCards, null, 2));
        console.log(`\n🎉 Sucesso! ${allStatusCards.length} cards de sondas gerados e salvos em ${OUTPUT_FILE}`);
    } else {
        createMockStatus();
    }
}

function createMockStatus() {
    console.log("📝 Criando cards de Status mock (teste vazio)...");
    const mock = [
        {
            "sonda": "Nenhuma",
            "statusGeral": "Aguardando Relatórios",
            "resumoRealizado": "Crie pastas com os nomes das sondas em data/statusSonda/ e coloque os PDFs dentro.",
            "pendencias": ["Adicionar PDFs"],
            "riscosOuAlertas": "Nenhum"
        }
    ];
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mock, null, 2));
    console.log(`✅ Arquivo mock salvo em ${OUTPUT_FILE}`);
}

generateStatusCards();
