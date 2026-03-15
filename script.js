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
const rigTabs = document.querySelectorAll('.rig-tab');

// State Variables
let questions = [];
let currentIndex = 0;
let score = 0;
let canClick = true; 
let timerInterval;
const TIME_PER_QUESTION = 30;
let equipments = []; // Global store for filtering
let activeRig = "Sonda 1";
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

// Event Listeners
if (startBtn) startBtn.addEventListener('click', startGame);
if (restartBtn) restartBtn.addEventListener('click', startGame);
if (statusBtn) statusBtn.addEventListener('click', showStatus);
if (equipmentBtn) equipmentBtn.addEventListener('click', showEquipment);
if (backToMenuBtn) backToMenuBtn.addEventListener('click', backToMenu);
if (backFromEquipBtn) backFromEquipBtn.addEventListener('click', backToMenu);
if (quizBackBtn) quizBackBtn.addEventListener('click', backToMenu);
if (resultMenuBtn) resultMenuBtn.addEventListener('click', backToMenu);

rigTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    rigTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeRig = tab.dataset.rig;
    renderEquipments(filterEquipments());
  });
});

function filterEquipments() {
  const searchTerm = equipmentSearch.value.toLowerCase();
  return equipments.filter(item => 
    String(item.Nome || '').toLowerCase().includes(searchTerm) ||
    String(item.ID || '').toLowerCase().includes(searchTerm) ||
    String(item.Localização || '').toLowerCase().includes(searchTerm) ||
    String(item.NS || '').toLowerCase().includes(searchTerm)
  );
}

equipmentSearch.addEventListener('input', () => {
  renderEquipments(filterEquipments());
});

function showEquipment() {
  startScreen.classList.remove('active');
  equipmentScreen.classList.add('active');
  loadEquipments();
}

function backToMenu() {
  clearInterval(timerInterval); 
  statusScreen.classList.remove('active');
  equipmentScreen.classList.remove('active');
  quizScreen.classList.remove('active');
  resultScreen.classList.remove('active');
  startScreen.classList.add('active');
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
    const saved = localStorage.getItem('quiz_app_rig_states');
    if (saved) rigStates = JSON.parse(saved);

    const response = await fetch('equipments.json');
    if (!response.ok) throw new Error('Falha ao carregar equipamentos');
    equipments = await response.json();
    renderEquipments(equipments);
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
  renderEquipments(filterEquipments());
}

function renderEquipments(items) {
  equipmentContainer.innerHTML = '';
  const checkedForActiveRig = rigStates[activeRig] || [];

  items.forEach((item, index) => {
    const uniqueId = item.NS && item.NS !== '-' ? item.NS : `${item.ID}-${index}`;
    const isChecked = checkedForActiveRig.includes(uniqueId);
    
    const card = document.createElement('div');
    card.classList.add('equipment-card');
    if (isChecked) card.classList.add('checked');
    
    const info = document.createElement('div');
    info.classList.add('equip-info');
    info.innerHTML = `
      <h3>${item.Nome || 'Equipamento'}</h3>
      <p>ID: ${item.ID || 'N/A'} | NS: ${item.NS || '-'}</p>
      <p>Local: ${item.Localização || 'Não informado'}</p>
    `;

    const statusRight = document.createElement('div');
    statusRight.style.display = 'flex';
    statusRight.style.alignItems = 'center';

    const statusDiv = document.createElement('div');
    statusDiv.classList.add('equip-status');
    
    const statusTag = document.createElement('span');
    statusTag.classList.add('status-indicator');
    
    const status = (item.Status || '').toLowerCase();
    if (status.includes('disponível')) statusTag.classList.add('status-available');
    else if (status.includes('uso')) statusTag.classList.add('status-busy');
    else statusTag.classList.add('status-maintenance');
    
    statusTag.textContent = item.Status || 'Status';
    
    const qty = document.createElement('span');
    qty.classList.add('qty-badge');
    qty.textContent = `Qtd: ${item.Quantidade || 0}`;

    statusDiv.appendChild(statusTag);
    statusDiv.appendChild(qty);
    
    const checkBtn = document.createElement('div');
    checkBtn.classList.add('check-btn');
    checkBtn.innerHTML = isChecked ? '✓' : '';
    checkBtn.addEventListener('click', () => toggleItem(uniqueId));

    statusRight.appendChild(statusDiv);
    statusRight.appendChild(checkBtn);
    
    card.appendChild(info);
    card.appendChild(statusRight);
    equipmentContainer.appendChild(card);
  });
}


// Init Load on startup
document.addEventListener('DOMContentLoaded', loadQuestions);
