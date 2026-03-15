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
const scoreTotal = document.querySelector('.score-total');
const resultMessage = document.getElementById('result-message');
const circle = document.querySelector('.score-circle');

// New navigation buttons
const quizBackBtn = document.getElementById('quiz-back-btn');
const resultMenuBtn = document.getElementById('result-menu-btn');

// State Variables
let questions = [];
let currentIndex = 0;
let score = 0;
let canClick = true; // Prevents multiple clicks during animation

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
        startBtn.textContent = 'Começar Quiz';
        startBtn.disabled = false;
        
    } catch (error) {
        console.error("Erro ao carregar perguntas:", error);
        questionText.textContent = "Erro ao carregar as perguntas do arquivo questions.json. Verifique o gerador.";
        startBtn.textContent = 'Indisponível';
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

function startGame() {
    currentIndex = 0;
    score = 0;
    
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
}

function handleAnswer(selectedIndex, selectedBtn) {
    if (!canClick) return;
    canClick = false; // block other clicks
    
    const allButtons = document.querySelectorAll('.option');
    allButtons.forEach(b => b.classList.add('disabled'));
    
    if (selectedIndex === correctIndex) {
        selectedBtn.classList.add('correct');
        score++;
        updateScoreUI();
    } else {
        selectedBtn.classList.add('wrong');
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
    }, 1500); // 1.5 seconds delay for feedback
}

function showResults() {
    quizScreen.classList.remove('active');
    resultScreen.classList.add('active');
    
    // Set text
    finalScore.textContent = score;
    scoreTotal.textContent = `/ ${questions.length}`;
    
    // Calculate degree for conic gradient (0 to 360)
    const percentage = score / questions.length;
    const deg = percentage * 360;
    
    // Animate radial progress bar using CSS custom property
    circle.style.setProperty('--score-deg', '0');
    setTimeout(() => {
        circle.style.setProperty('--score-deg', deg.toString());
        circle.style.transition = 'all 1s ease-out';
    }, 100);

    // Dynamic message
    if (percentage === 1) {
        resultMessage.textContent = "🏆 Perfeito! Gabaritou!";
    } else if (percentage >= 0.7) {
        resultMessage.textContent = "👏 Muito bom! Você quase lá.";
    } else if (percentage >= 0.4) {
        resultMessage.textContent = "👍 Razoável, pode melhorar!";
    } else {
        resultMessage.textContent = "📚 Precisa estudar mais o PDF!";
    }
    
    // Complete progress bar visually
    progressBar.style.width = `100%`;
}

function updateScoreUI() {
    scoreDisplay.textContent = `Score: ${score}`;
}

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// New navigation elements
const statusBtn = document.getElementById('status-btn');
const statusScreen = document.getElementById('status-screen');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const statusContainer = document.getElementById('status-container');

statusBtn.addEventListener('click', showStatus);
backToMenuBtn.addEventListener('click', backToMenu);
quizBackBtn.addEventListener('click', backToMenu);
resultMenuBtn.addEventListener('click', backToMenu);

function showStatus() {
  // Hide current screen (menu/start)
  startScreen.classList.remove('active');
  // Show status screen
  statusScreen.classList.add('active');
  loadStatus();
}

function backToMenu() {
  statusScreen.classList.remove('active');
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

    const header = document.createElement('header');
    const title = document.createElement('h3');
    title.textContent = `${item.sonda || 'Sonda'}`;
    
    const tag = document.createElement('span');
    tag.classList.add('status-tag');
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


// Init Load on startup
document.addEventListener('DOMContentLoaded', loadQuestions);
