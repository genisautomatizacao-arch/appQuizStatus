// Global Debug/Error Handling
window.onerror = function(msg, url, lineNo, columnNo, error) {
    alert("Erro detectado: " + msg + "\nLinha: " + lineNo);
    return false;
};

// Elements
const startScreen = document.getElementById('menu-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');

const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const questionCounter = document.getElementById('question-counter');
const scoreDisplay = document.getElementById('score-display');
const progressBar = document.getElementById('progress-bar');
const finalScore = document.getElementById('final-score');
const circle = document.querySelector('.score-circle');
const scoreTotal = document.querySelector('.score-total');
const resultMessage = document.getElementById('result-message');

// New navigation buttons
const quizBackBtn = document.getElementById('quiz-back-btn');
const resultMenuBtn = document.getElementById('result-menu-btn');

// New navigation elements
const statusBtn = document.getElementById('status-btn');
const statusScreen = document.getElementById('status-screen');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const statusContainer = document.getElementById('status-container');

const equipmentBtn = document.getElementById('equipment-btn');
const equipmentScreen = document.getElementById('equipment-screen');
const backFromEquipBtn = document.getElementById('back-from-equip-btn');
const equipmentContainer = document.getElementById('equipment-container');
const equipmentSearch = document.getElementById('equipment-search');
const rigTabsContainer = document.getElementById('rig-tabs');
const addRigBtn = document.getElementById('add-rig-btn');
const pickerModal = document.getElementById('equipment-picker-modal');
const openPickerBtn = document.getElementById('open-picker-btn');
const closePickerBtn = document.getElementById('close-picker-btn');
const pickerSearch = document.getElementById('picker-search');
const pickerContainer = document.getElementById('picker-container');

// State Variables
let activePickerCategory = '';
let questions = [];
let currentIndex = 0;
let score = 0;
let canClick = true; 
let timerInterval;
const TIME_PER_QUESTION = 30;
let equipments = []; // Global store for filtering
let activeRig = "Sonda 1";
let activeRigs = ["Sonda 1"]; // Fleet management
let rigStates = {}; // Persisted state { "Sonda 1": ["ID1", "ID2"] }

// Initialize
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) {
           throw new Error("O arquivo JSON de perguntas está vazio ou não é um Array válido.");
        }
        
        questions = data;
        const btnSpan = startBtn.querySelector('span');
        if (btnSpan) btnSpan.textContent = '🎯 Iniciar Treinamento';
        startBtn.disabled = false;
        console.log("✅ Perguntas carregadas com sucesso:", questions.length);
        
    } catch (error) {
        console.error("❌ Erro ao carregar perguntas:", error);
        const btnSpan = startBtn.querySelector('span');
        if (btnSpan) btnSpan.textContent = '❌ Erro ao Carregar';
        alert("Falha ao carregar as perguntas do servidor. Verifique sua conexão ou se o arquivo questions.json existe.");
        startBtn.disabled = true;
    }
}

// Fisher-Yates Shuffle Algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

async function startGame() {
    currentIndex = 0;
    score = 0;

    if (questions.length === 0) {
        console.warn("⚠️ Tentativa de iniciar quiz sem perguntas carregadas.");
        await loadQuestions();
        if (questions.length === 0) return; // If still no questions, exit
    }
    
    // Copy the full question pool
    let activeQuestions = [...questions];
    
    // Shuffle the entire pool
    shuffleArray(activeQuestions);
    
    // Select a subset (e.g., 15 questions) for this session
    // This allows the bank to grow to 100 while keeping the game session short
    questions = activeQuestions.slice(0, 15);
    
    // Switch Screen
    startScreen.classList.remove('active');
    resultScreen.classList.remove('active');
    quizScreen.classList.add('active');
    
    updateScoreUI();
    showQuestion();
}

function startTimer() {
    let timeLeft = TIME_PER_QUESTION;
    const timerText = document.getElementById('timer-text');
    timerText.textContent = timeLeft;
    timerText.classList.remove('timer-low');
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        timerText.textContent = timeLeft;
        
        if (timeLeft <= 5) {
            timerText.classList.add('timer-low');
        }
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleAnswer(-1, null); // Auto-fail
        }
    }, 1000);
}

function showQuestion() {
    canClick = true;
    const q = questions[currentIndex];
    
    // Update Header Text
    questionCounter.textContent = `Pergunta ${currentIndex + 1}/${questions.length}`;
    
    // Update Progress Bar
    const percent = ((currentIndex) / questions.length) * 100;
    progressBar.style.width = `${percent}%`;
    
    // Inject Question
    questionText.textContent = q.question;
    optionsContainer.innerHTML = '';
    
    // Inject Options
    q.options.forEach((optionText, index) => {
        const btn = document.createElement('div');
        btn.classList.add('option');
        btn.textContent = optionText;
        
        btn.addEventListener('click', () => handleAnswer(index, btn));
        optionsContainer.appendChild(btn);
    });
    
    startTimer();
}

function handleAnswer(selectedIndex, selectedBtn) {
    if (!canClick) return;
    canClick = false; // block other clicks
    
    const correctIndex = questions[currentIndex].correctAnswer;
    const allButtons = document.querySelectorAll('.option');
    allButtons.forEach(b => b.classList.add('disabled'));
    
    clearInterval(timerInterval); // Stop timer when answered
    
    if (selectedIndex === correctIndex) {
        if (selectedBtn) selectedBtn.classList.add('correct');
        score++;
        updateScoreUI();
    } else {
        if (selectedBtn) selectedBtn.classList.add('wrong');
        allButtons[correctIndex].classList.add('correct');
    }
    
    // Wait slightly, then go to next
    setTimeout(() => {
        currentIndex++;
        if (currentIndex < questions.length) {
            showQuestion();
        } else {
            showResults();
        }
    }, 1500); 
}

function showResults() {
    quizScreen.classList.remove('active');
    resultScreen.classList.add('active');
    
    // Set text
    if (finalScore) finalScore.textContent = score;
    if (scoreTotal) scoreTotal.textContent = `/ ${questions.length}`;
    
    // Calculate degree for conic gradient (0 to 360)
    const percentage = score / questions.length;
    const deg = percentage * 360;
    
    // Animate radial progress bar using CSS custom property
    if (circle) {
        circle.style.setProperty('--score-deg', '0');
        setTimeout(() => {
            circle.style.setProperty('--score-deg', deg.toString());
            circle.style.transition = 'all 1s ease-out';
        }, 100);
    }

    // Dynamic message
    if (resultMessage) {
        if (percentage === 1) {
            resultMessage.textContent = "🏆 Perfeito! Gabaritou!";
        } else if (percentage >= 0.7) {
            resultMessage.textContent = "👏 Muito bom! Você quase lá.";
        } else if (percentage >= 0.4) {
            resultMessage.textContent = "👍 Razoável, pode melhorar!";
        } else {
            resultMessage.textContent = "📚 Precisa estudar mais o PDF!";
        }
    }
    
    // Complete progress bar visually
    progressBar.style.width = `100%`;
}

function updateScoreUI() {
    scoreDisplay.textContent = `Score: ${score}`;
}

// Event Listeners Initialization
function initEventListeners() {
  console.log("⚙️ Inicializando Event Listeners...");
  
  // Repair App Button (Secret)
  const repairBtn = document.getElementById('repair-app-btn');
  if (repairBtn) {
    repairBtn.addEventListener('click', () => {
      if (confirm("Deseja forçar a atualização e limpar o cache do app?")) {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) { registration.unregister(); }
            caches.keys().then(names => {
              for (let name of names) caches.delete(name);
              alert("App resetado. A página será recarregada.");
              window.location.reload(true);
            });
          });
        }
      }
    });
  }

  if (startBtn) startBtn.addEventListener('click', startGame);
  if (restartBtn) restartBtn.addEventListener('click', startGame);
  if (statusBtn) statusBtn.addEventListener('click', showStatus);
  if (equipmentBtn) equipmentBtn.addEventListener('click', showEquipment);
  if (backToMenuBtn) backToMenuBtn.addEventListener('click', backToMenu);
  if (backFromEquipBtn) backFromEquipBtn.addEventListener('click', backToMenu);
  if (quizBackBtn) quizBackBtn.addEventListener('click', backToMenu);
  if (resultMenuBtn) resultMenuBtn.addEventListener('click', backToMenu);

  if (addRigBtn) addRigBtn.addEventListener('click', addRig);

  if (openPickerBtn) openPickerBtn.addEventListener('click', openPicker);
  if (closePickerBtn) closePickerBtn.addEventListener('click', closePicker);
  
  if (pickerSearch) {
    pickerSearch.addEventListener('input', () => {
      renderPickerResults(filterPicker(pickerSearch.value));
    });
  }
}

function openPicker(category = '') {
  activePickerCategory = category;
  pickerModal.classList.add('active');
  pickerSearch.value = '';
  
  const modalTitle = document.querySelector('.modal-header h2');
  if (modalTitle) modalTitle.textContent = `Buscar em: ${category || 'Mestre'}`;
  
  renderPickerResults(filterPicker(''));
}

function closePicker() {
  pickerModal.classList.remove('active');
}

function filterPicker(term) {
  const search = term.toLowerCase();
  return equipments.filter(item => {
    const itemCat = item.Categoria || 'Geral';
    const isInActiveCat = activePickerCategory ? itemCat === activePickerCategory : true;
    
    const matchesTerm = String(item.Nome || '').toLowerCase().includes(search) ||
                        String(item.ID || '').toLowerCase().includes(search) ||
                        String(item.NS || '').toLowerCase().includes(search);
                        
    return isInActiveCat && matchesTerm;
  });
}

function renderPickerResults(items) {
  pickerContainer.innerHTML = '';
  const onBoardIds = rigStates[activeRig] || [];
  
  let lastCategory = '';

  items.forEach((item, index) => {
    const currentCategory = item.Categoria || 'Geral';
    if (currentCategory !== lastCategory) {
      const header = document.createElement('div');
      header.classList.add('equipment-category-header');
      header.textContent = currentCategory;
      header.style.fontSize = '0.7rem'; // Compact for modal
      pickerContainer.appendChild(header);
      lastCategory = currentCategory;
    }

    const uniqueId = getUniqueId(item);
    const isOnBoard = onBoardIds.includes(uniqueId);
    
    const div = document.createElement('div');
    div.classList.add('equipment-card');
    div.style.padding = '10px';
    div.style.marginBottom = '5px';
    
    div.innerHTML = `
      <div class="equip-info">
        <h4 style="font-size: 0.85rem">${item.Equip || 'Equipamento'}</h4>
        <p style="font-size: 0.7rem">NP: ${item.NP || 'N/A'} | NS: ${item.NS || '-'}</p>
        <p style="font-size: 0.7rem; opacity: 0.8;">${item.Descricao || ''}</p>
      </div>
    `;

    const addBtn = document.createElement('button');
    addBtn.className = isOnBoard ? 'remove-item-btn' : 'add-item-btn';
    addBtn.textContent = isOnBoard ? 'Remover' : 'Adicionar';
    addBtn.addEventListener('click', () => toggleItem(uniqueId));

    div.appendChild(addBtn);
    pickerContainer.appendChild(div);
  });
}

function renderRigTabs() {
  if (!rigTabsContainer) return;
  rigTabsContainer.innerHTML = '';
  
  activeRigs.forEach(rigName => {
    const btn = document.createElement('button');
    btn.className = `rig-tab ${activeRig === rigName ? 'active' : ''}`;
    btn.textContent = rigName;
    btn.dataset.rig = rigName;
    btn.addEventListener('click', () => {
      activeRig = rigName;
      renderRigTabs();
      renderEquipments(filterEquipments());
    });
    rigTabsContainer.appendChild(btn);
  });
}

function addRig() {
  if (activeRigs.length >= 7) {
    alert("Limite máximo de 7 sondas atingido.");
    return;
  }
  
  const nextNum = activeRigs.length + 1;
  const newRig = `Sonda ${nextNum}`;
  
  if (!activeRigs.includes(newRig)) {
    activeRigs.push(newRig);
    localStorage.setItem('quiz_app_active_rigs', JSON.stringify(activeRigs));
    renderRigTabs();
    console.log(`✅ Adicionada: ${newRig}`);
  }
}

function filterEquipments() {
  const searchTerm = equipmentSearch.value.toLowerCase();
  const onBoardIds = rigStates[activeRig] || [];
  
  // Only show items that are ON BOARD
  return equipments.filter(item => {
    const uniqueId = item.NS && item.NS !== '-' ? item.NS : `${item.ID}-${item.Nome}`; // Improved matching
    // Fallback search in master but only if they are on board
    const fitsSearch = String(item.Nome || '').toLowerCase().includes(searchTerm) ||
                       String(item.ID || '').toLowerCase().includes(searchTerm) ||
                       String(item.NS || '').toLowerCase().includes(searchTerm);
    
    // We need to re-match IDs carefully
    return fitsSearch; 
  }).filter(item => {
      const uniqueId = getUniqueId(item);
      return onBoardIds.includes(uniqueId);
  });
}

// Initial Search Event Listener removed as it's now in initEventListeners

function showEquipment() {
  if (startScreen && equipmentScreen) {
    startScreen.classList.remove('active');
    equipmentScreen.classList.add('active');
    loadEquipments();
  }
}

function showStatus() {
  if (startScreen && statusScreen) {
    startScreen.classList.remove('active');
    statusScreen.classList.add('active');
    loadStatus();
  }
}

function backToMenu() {
  if (timerInterval) clearInterval(timerInterval); 
  [statusScreen, equipmentScreen, quizScreen, resultScreen].forEach(s => {
    if (s) s.classList.remove('active');
  });
  if (startScreen) startScreen.classList.add('active');
}

async function loadStatus() {
  try {
    const response = await fetch('status.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    renderStatus(data);
  } catch (error) {
    console.error('Erro ao carregar status das sondas:', error);
    statusContainer.innerHTML = '<p>Erro ao carregar dados de status.</p>';
  }
}

function renderStatus(items) {
  statusContainer.innerHTML = '';
  if (!Array.isArray(items) || items.length === 0) {
    statusContainer.innerHTML = '<p>Nenhum dado de status disponível.</p>';
    return;
  }
  items.forEach(item => {
    const card = document.createElement('div');
    card.classList.add('status-card');

    const isCritical = (item.statusGeral || '').toLowerCase().includes('crítica') || 
                       (item.riscosOuAlertas || '').toLowerCase() !== 'nenhum reportado';
    
    if (isCritical) card.classList.add('critical');

    const header = document.createElement('header');
    const title = document.createElement('h3');
    title.textContent = `${item.sonda || 'Sonda'}`;
    
    const tag = document.createElement('span');
    tag.classList.add('status-tag');
    if (isCritical) tag.classList.add('critical');
    tag.textContent = item.statusGeral || 'Em espera';
    
    header.appendChild(title);
    header.appendChild(tag);

    const content = document.createElement('div');
    content.classList.add('status-content');

    const resumo = document.createElement('p');
    resumo.textContent = item.resumoRealizado || 'Sem dados recentes.';

    const pendenciasHead = document.createElement('h4');
    pendenciasHead.textContent = "Pendências Ativas";
    
    const list = document.createElement('ul');
    list.classList.add('status-list');
    if (Array.isArray(item.pendencias)) {
        item.pendencias.forEach(p => {
            const li = document.createElement('li');
            li.textContent = p;
            list.appendChild(li);
        });
    }

    content.appendChild(resumo);
    content.appendChild(pendenciasHead);
    content.appendChild(list);
    
    card.appendChild(header);
    card.appendChild(content);
    statusContainer.appendChild(card);
  });
}

// Equipment Management
async function loadEquipments() {
  try {
    // Load persisted state from localStorage
    const savedStates = localStorage.getItem('quiz_app_rig_states');
    if (savedStates) rigStates = JSON.parse(savedStates);
    
    const savedRigs = localStorage.getItem('quiz_app_active_rigs');
    if (savedRigs) activeRigs = JSON.parse(savedRigs);

    renderRigTabs();

    const response = await fetch('equipments.json');
    if (!response.ok) throw new Error('Falha ao carregar equipamentos');
    equipments = await response.json();
    renderEquipments(filterEquipments());
  } catch (error) {
    console.error(error);
    equipmentContainer.innerHTML = '<p>Erro ao carregar inventário.</p>';
  }
}

function toggleItem(itemId) {
  if (!rigStates[activeRig]) rigStates[activeRig] = [];
  
  const index = rigStates[activeRig].indexOf(itemId);
  if (index > -1) {
    rigStates[activeRig].splice(index, 1);
  } else {
    rigStates[activeRig].push(itemId);
  }
  
  // Save to localStorage
  localStorage.setItem('quiz_app_rig_states', JSON.stringify(rigStates));
  
  // Refresh both views
  renderEquipments(filterEquipments());
  if (pickerModal.classList.contains('active')) {
    renderPickerResults(filterPicker(pickerSearch.value));
  }
}

function renderEquipments(items) {
  equipmentContainer.innerHTML = '';
  const onBoardIds = rigStates[activeRig] || [];
  
  // Identify ALL categories from the master list
  const allCategories = [...new Set(equipments.map(e => e.Categoria || 'Geral'))];
  
  // Group currently ON BOARD items by category
  const onBoardByCat = {};
  items.forEach(item => {
    const cat = item.Categoria || 'Geral';
    if (!onBoardByCat[cat]) onBoardByCat[cat] = [];
    onBoardByCat[cat].push(item);
  });

  allCategories.forEach(catName => {
    const categoryGroup = document.createElement('div');
    categoryGroup.className = 'category-group';
    
    const header = document.createElement('div');
    header.className = 'equipment-category-header';
    header.style.justifyContent = 'space-between';
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = catName;
    header.appendChild(titleSpan);

    const addBtn = document.createElement('button');
    addBtn.className = 'cat-add-btn';
    addBtn.innerHTML = '<span>➕</span> Adicionar';
    addBtn.onclick = (e) => {
        e.stopPropagation();
        openPicker(catName);
    };
    header.appendChild(addBtn);

    categoryGroup.appendChild(header);

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'category-items';
    
    const itemsInCat = onBoardByCat[catName] || [];
    
    if (itemsInCat.length === 0) {
        itemsContainer.innerHTML = '<p style="font-size: 0.75rem; color: var(--text-dim); padding: 10px; text-align: center; opacity: 0.5;">Nenhum item a bordo nesta categoria.</p>';
    } else {
        itemsInCat.forEach((item) => {
          const uniqueId = getUniqueId(item);
          const isChecked = onBoardIds.includes(uniqueId);
          
          const card = document.createElement('div');
          card.className = `equipment-card ${isChecked ? 'checked' : ''}`;
          
          card.innerHTML = `
            <div class="equip-info">
              <h3>${item.Equip || 'Equipamento'}</h3>
              <p>NP: ${item.NP || 'N/A'} | NS: ${item.NS || '-'}</p>
              <p style="font-size: 0.8rem; margin: 4px 0;">${item.Descricao || ''}</p>
              <p>Local: ${item.Localizacao || 'N/A'}</p>
            </div>
            <div class="equip-status-right">
              <div class="equip-status">
                <span class="status-indicator ${getStatusClass(item.Status)}">${item.Status || 'Status'}</span>
                <span class="qty-badge">Qtd: ${item.Qtd || 0}</span>
              </div>
              <button class="remove-item-btn" onclick="toggleItem('${uniqueId}')">Remover</button>
            </div>
          `;
          itemsContainer.appendChild(card);
        });
    }

    categoryGroup.appendChild(itemsContainer);
    equipmentContainer.appendChild(categoryGroup);
  });
}

function getStatusClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('disponível')) return 'status-available';
  if (s.includes('uso')) return 'status-busy';
  return 'status-maintenance';
}

function getUniqueId(item) {
  if (!item) return '';
  const masterIndex = equipments.indexOf(item);
  if (item.NS && item.NS !== '-' && item.NS !== 'N/A') {
    return `NS-${item.NS}`;
  }
  return `NP-${item.NP || 'NONE'}-${masterIndex}`;
}


// Init Load on startup
document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
    initEventListeners();
});
