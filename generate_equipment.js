const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DATA_DIR = path.join(__dirname, 'data', 'controle de equipamentos a bordo');
const OUTPUT_FILE = path.join(__dirname, 'equipments.json');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            if (file.endsWith('.xlsx') && !file.startsWith('.~link')) {
                arrayOfFiles.push(fullPath);
            }
        }
    });

    return arrayOfFiles;
}

async function generateEquipmentData() {
    console.log("📦 Iniciando Sincronização de Múltiplos Bancos de Equipamentos...");

    const fileList = getAllFiles(DATA_DIR);
    console.log(`🔍 Encontrados ${fileList.length} arquivos de inventário.`);

    let allMappedData = [];
    const seenItems = new Map(); // To track duplicates across files

    for (const filePath of fileList) {
        try {
            const fileName = path.basename(filePath, '.xlsx');
            console.log(`📄 Processando: ${fileName}`);
            
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            const rigName = fileName; // File name is now the rig name
            const date = worksheet['G6'] ? worksheet['G6'].v : 'Sem data';
            
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            let currentCategory = "GERAL";
            let fileDataCount = 0;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const itemNum = parseInt(row[1]);
                
                if (!isNaN(itemNum)) {
                    if (row[2] && typeof row[2] === 'string' && row[2].trim() !== '') {
                        currentCategory = row[2].trim().toUpperCase();
                    }

                    const item = {
                        Categoria: currentCategory,
                        Equip: row[2] || 'N/A',
                        Qtd: row[3] || 0,
                        NP: row[4] || 'N/A',
                        NS: row[5] || '-',
                        Descricao: row[6] || 'Sem descrição',
                        Localizacao: row[10] || 'N/A',
                        Status: row[10] || 'Disponível',
                        Source: path.basename(filePath),
                        RigName: rigName,
                        Date: date
                    };

                    // De-duplication key: combine core identifying fields
                    const key = `${item.Equip}|${item.NP}|${item.NS}|${item.Descricao}`.toUpperCase();
                    
                    if (!seenItems.has(key)) {
                        seenItems.set(key, item);
                        allMappedData.push(item);
                        fileDataCount++;
                    }
                }
            }

            if (fileDataCount > 0) {
                console.log(`   ✅ ${fileDataCount} novos itens únicos extraídos de ${rigName}`);
            }

        } catch (error) {
            console.error(`   ❌ Erro ao converter ${filePath}:`, error.message);
        }
    }

    if (allMappedData.length > 0) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allMappedData, null, 2));
        console.log(`\n🎉 SUCESSO! ${allMappedData.length} itens únicos salvos em ${OUTPUT_FILE}`);
        console.log(`📉 Redução de duplicatas: de ~2300 para ${allMappedData.length} itens.`);
    } else {
        console.error("\n❌ Nenhum dado foi extraído dos arquivos.");
    }
}

generateEquipmentData();
