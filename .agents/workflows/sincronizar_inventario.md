---
description: Sincronizar o inventário de equipamentos a partir dos arquivos Excel - Atualiza o banco de dados (equipments.json) lendo todos os arquivos .xlsx da pasta de controle e faz o deploy para o GitHub Pages.
---

# Skill: Sincronizar Inventário de Equipamentos

Use este workflow sempre que o usuário editar, adicionar ou remover arquivos `.xlsx` na pasta de controle de equipamentos, ou quando quiser atualizar o banco de dados do app.

## Passos

### 1. Confirmar que o usuário terminou de editar os arquivos
Pergunte ao usuário se ele terminou de editar os arquivos Excel na pasta:
`C:\Users\genis\.gemini\antigravity\scratch\quiz-app\data\controle de equipamentos a bordo`

### 2. Listar os arquivos encontrados
// turbo
Execute o comando abaixo para confirmar quais arquivos serão processados:
```powershell
cmd /c dir "C:\Users\genis\.gemini\antigravity\scratch\quiz-app\data\controle de equipamentos a bordo\" /s /b
```
Mostre a lista ao usuário e confirme se está correta.

### 3. Rodar o gerador de inventário
// turbo
Execute o script que lê os arquivos Excel e gera o `equipments.json` atualizado:
```powershell
node generate_equipment.js
```
Aguarde a conclusão e confirme o número de itens únicos gerados.

### 4. Publicar no GitHub Pages
// turbo
Faça o commit e push das alterações:
```powershell
git add .; git commit -m "Data: Inventory sync from Excel files"; git push origin main
```

### 5. Confirmar publicação
Informe ao usuário que a atualização foi publicada em:
**https://genisautomatizacao-arch.github.io/appQuizStatus/**

> **Nota:** O GitHub Pages pode levar 1-2 minutos para refletir as mudanças.
