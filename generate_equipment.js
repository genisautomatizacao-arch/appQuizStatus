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
        
        // Use raw row arrays to handle merged cells and complex headers
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        let mappedData = [];
        let currentCategory = "Geral";
        let headerFound = false;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            // The items usually start after row 10 and row[1] is a number (id/counter)
            const itemNum = parseInt(row[1]);
            if (!isNaN(itemNum)) {
                headerFound = true;
                
                // If column 2 has content, it's either a new category or the first item of one
                if (row[2] && typeof row[2] === 'string' && row[2].trim() !== '') {
                    currentCategory = row[2].trim().toUpperCase();
                }

                mappedData.push({
                    Categoria: currentCategory,
                    Equip: row[2] || 'N/A',
                    Qtd: row[3] || 0,
                    NP: row[4] || 'N/A',
                    NS: row[5] || '-',
                    Descricao: row[6] || 'Sem descrição',
                    Localizacao: row[10] || 'N/A',
                    Status: row[10] || 'Disponível'
                });
            }
        }

        if (mappedData.length === 0) {
            console.warn("⚠️ Nenhum dado mapeado. Tentando fallback para mapeamento por nomes de colunas...");
            // Fallback to simpler mapping if row-based fails
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            mappedData = jsonData.map(row => ({
                Categoria: row['Categoria'] || 'Geral',
                ID: row['NS'] || row['ID'] || 'N/A',
                NS: row['NS'] || '-',
                Nome: row['Descrição do equipamento'] || row['Nome'] || 'Equipamento',
                Localização: row['Localização'] || 'Não informado',
                Status: row['Status'] || 'Disponível',
                Quantidade: row['Quantidade'] || 1
            }));
        }

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mappedData, null, 2));
        console.log(`✅ Sucesso! ${mappedData.length} equipamentos salvos com categorias em ${OUTPUT_FILE}`);
    } catch (error) {
        console.error("❌ Erro ao converter planilha:", error);
    }
}

generateEquipmentData();
