const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DATA_DIR = path.join(__dirname, 'data', 'controle de equipamentos a bordo');
const SPREADSHEET_FILE = path.join(DATA_DIR, 'lista equipamentos.xlsx');
const OUTPUT_FILE = path.join(__dirname, 'equipments.json');

async function generateEquipmentData() {
    console.log("📦 Iniciando Sincronização de Equipamentos...");

    if (!fs.existsSync(SPREADSHEET_FILE)) {
        console.warn(`⚠️ Planilha não encontrada em: ${SPREADSHEET_FILE}`);
        console.log("Criando uma planilha de exemplo...");
        
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
        
        const wb = XLSX.utils.book_new();
        const ws_data = [
            ["ID", "Nome", "Localização", "Status", "Quantidade"],
            ["EQP-001", "Balança de Teste", "Laboratório", "Disponível", 2],
            ["EQP-002", "Compressor de Ar", "Deck de Operações", "Em Uso", 1],
            ["EQP-003", "Multímetro Digital", "Oficina Elétrica", "Manutenção", 3],
            ["EQP-004", "Guincho Hidráulico", "Deck de Carga", "Disponível", 1]
        ];
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        XLSX.utils.book_append_sheet(wb, ws, "Equipamentos");
        XLSX.writeFile(wb, SPREADSHEET_FILE);
    }

    try {
        const workbook = XLSX.readFile(SPREADSHEET_FILE);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        let jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Map user columns to our standard format
        const mappedData = jsonData.map(row => ({
            ID: row['ID'] || row['id'] || 'N/A',
            NS: row['NS'] || row['ns'] || '-',
            Nome: row['Descrição do equipamento'] || row['Nome'] || 'Equipamento',
            Localização: row['Localização'] || row['localização'] || 'Não informado',
            Status: row['Status'] || 'Disponível', // Default as it might not be in their list
            Quantidade: row['Quantidade'] || row['qtd'] || 1
        }));

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mappedData, null, 2));
        console.log(`✅ Sucesso! ${mappedData.length} equipamentos salvos em ${OUTPUT_FILE}`);
    } catch (error) {
        console.error("❌ Erro ao converter planilha:", error);
    }
}

generateEquipmentData();
