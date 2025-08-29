// Game elements
const gameBoard = document.querySelector('.game-board');
const scoreDisplay = document.querySelector('.score');
const highScoreDisplay = document.querySelector('.high-score');
const startScreen = document.querySelector('.start-screen');
const gameOverScreen = document.querySelector('.game-over');
const finalScoreDisplay = document.querySelector('.final-score');
const startBtn = document.querySelector('.start-btn');
const restartBtn = document.querySelector('.restart-btn');
const homeBtn = document.querySelector('.home-btn-large');
const inGameHomeBtn = document.querySelector('#in-game-home');
const difficultyBtns = document.querySelectorAll('.difficulty-btn');
const pausedIndicator = document.querySelector('.paused-indicator');

// Game state
const gridSize = 20;
let boardWidth = window.innerWidth;
let boardHeight = window.innerHeight;
let snake = [];
let food = {x: 0, y: 0, type: 'standard'};
let specialFood = null;
let obstacles = [];
let dx = gridSize;
let dy = 0;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameSpeed = 120; // Default speed (easy)
let gameInterval;
let gameActive = false;
let gamePaused = false;
let difficultyLevel = 'easy';
let bonusFoodTimer;
let currentDirection = 'right';
let specialFoodActive = false;
let specialFoodTimer = null;

// Initialize high score display
highScoreDisplay.textContent = `Best: ${highScore}`;

// Set up difficulty buttons
difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        difficultyBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        gameSpeed = parseInt(btn.dataset.speed);
        
        // Set difficulty level
        if (gameSpeed === 120) difficultyLevel = 'easy';
        else if (gameSpeed === 80) difficultyLevel = 'medium';
        else difficultyLevel = 'hard';
    });
});

// Start button handler
startBtn.addEventListener('click', startGame);

// Restart button handler
restartBtn.addEventListener('click', () => {
    gameOverScreen.style.display = 'none';
    startGame();
});

// Add event listeners for home buttons
homeBtn.addEventListener('click', returnToHome);
inGameHomeBtn.addEventListener('click', returnToHome);

// Function to return to home screen
function returnToHome() {
    // Clear any active intervals
    if (gameInterval) clearInterval(gameInterval);
    if (bonusFoodTimer) clearTimeout(bonusFoodTimer);
    if (specialFoodTimer) clearTimeout(specialFoodTimer);
    
    // Reset game state
    gameActive = false;
    gamePaused = false;
    score = 0;
    scoreDisplay.textContent = `Score: ${score}`;
    pausedIndicator.style.display = 'none';
    
    // Hide game over screen and in-game home button
    gameOverScreen.style.display = 'none';
    inGameHomeBtn.style.display = 'none';
    
    // Show start screen
    startScreen.style.display = 'flex';
    
    // Reset difficulty to default
    difficultyBtns.forEach(btn => {
        if (btn.dataset.speed === '120') {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
    gameSpeed = 120;
    difficultyLevel = 'easy';
}

// Generate random food position
function generateFood() {
    // Ensure food is within visible area
    const maxX = Math.floor((boardWidth - gridSize) / gridSize);
    const maxY = Math.floor((boardHeight - gridSize) / gridSize);
    
    food.x = Math.floor(Math.random() * maxX) * gridSize;
    food.y = Math.floor(Math.random() * maxY) * gridSize;
    food.type = 'standard';
    
    // Make sure food doesn't appear on snake or obstacles
    let validPosition = false;
    while (!validPosition) {
        validPosition = true;
        
        // Check if on snake
        for (let i = 0; i < snake.length; i++) {
            if (food.x === snake[i].x && food.y === snake[i].y) {
                validPosition = false;
                food.x = Math.floor(Math.random() * maxX) * gridSize;
                food.y = Math.floor(Math.random() * maxY) * gridSize;
                break;
            }
        }
        
        // Check if on obstacle
        if (validPosition) {
            for (let obstacle of obstacles) {
                if (food.x >= obstacle.x && food.x < obstacle.x + obstacle.width &&
                    food.y >= obstacle.y && food.y < obstacle.y + obstacle.height) {
                    validPosition = false;
                    food.x = Math.floor(Math.random() * maxX) * gridSize;
                    food.y = Math.floor(Math.random() * maxY) * gridSize;
                    break;
                }
            }
        }
    }
}

// Generate special food
function generateSpecialFood() {
    if (!gameActive) return;
    
    const maxX = Math.floor((boardWidth - gridSize) / gridSize);
    const maxY = Math.floor((boardHeight - gridSize) / gridSize);
    
    specialFood = {
        x: Math.floor(Math.random() * maxX) * gridSize,
        y: Math.floor(Math.random() * maxY) * gridSize
    };
    specialFoodActive = true;
    
    // Make special food disappear after 5 seconds
    clearTimeout(specialFoodTimer);
    specialFoodTimer = setTimeout(() => {
        specialFoodActive = false;
    }, 5000);
}

// Schedule bonus food
function scheduleBonusFood() {
    // Special food appears randomly between 10-20 seconds
    bonusFoodTimer = setTimeout(() => {
        if (gameActive && !gamePaused) {
            generateSpecialFood();
        }
        scheduleBonusFood();
    }, Math.random() * 10000 + 10000);
}

// Generate obstacles (based on difficulty)
function generateObstacles() {
    obstacles = [];
    
    // Only add obstacles on medium and hard difficulty
    if (difficultyLevel === 'easy') return;
    
    const obstacleCount = difficultyLevel === 'medium' ? 3 : 6;
    
    for (let i = 0; i < obstacleCount; i++) {
        const width = Math.floor(Math.random() * 3 + 2) * gridSize;
        const height = Math.floor(Math.random() * 3 + 1) * gridSize;
        
        const obstacle = {
            x: Math.floor(Math.random() * (boardWidth - width) / gridSize) * gridSize,
            y: Math.floor(Math.random() * (boardHeight - height) / gridSize) * gridSize,
            width: width,
            height: height
        };
        
        // Make sure obstacle is not on snake or food
        let validPosition = true;
        
        // Check if on snake
        for (let segment of snake) {
            if (segment.x >= obstacle.x && segment.x < obstacle.x + obstacle.width &&
                segment.y >= obstacle.y && segment.y < obstacle.y + obstacle.height) {
                validPosition = false;
                break;
            }
        }
        
        // If valid, add to obstacles
        if (validPosition) {
            obstacles.push(obstacle);
        }
    }
}

function startGame() {
    // Hide start screen
    startScreen.style.display = 'none';
    
    // Show in-game home button
    inGameHomeBtn.style.display = 'block';
    
    // Reset game state
    score = 0;
    scoreDisplay.textContent = `Score: ${score}`;
    
    // Initialize snake at center of screen
    snake = [
        {x: Math.floor(boardWidth/2/gridSize) * gridSize, y: Math.floor(boardHeight/2/gridSize) * gridSize},
        {x: Math.floor(boardWidth/2/gridSize) * gridSize - gridSize, y: Math.floor(boardHeight/2/gridSize) * gridSize},
        {x: Math.floor(boardWidth/2/gridSize) * gridSize - gridSize * 2, y: Math.floor(boardHeight/2/gridSize) * gridSize}
    ];
    
    // Set initial direction
    dx = gridSize;
    dy = 0;
    currentDirection = 'right';
    
    // Generate food and obstacles
    generateFood();
    generateObstacles();
    
    // Start game loop
    gameActive = true;
    gamePaused = false;
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, gameSpeed);
    
    // Schedule bonus food to appear
    scheduleBonusFood();
}

// Update game state
function update() {
    if (!gameActive || gamePaused) return;
    
    const newHead = {
        x: snake[0].x + dx,
        y: snake[0].y + dy
    };

    // Check wall collision - ALWAYS allow snake to go out
    if (newHead.x >= boardWidth || newHead.x < 0 || 
        newHead.y >= boardHeight || newHead.y < 0) {
        gameOver();
        return;
    }

    // Check self collision
    for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
            gameOver();
            return;
        }
    }
    
    // Check obstacle collision
    for (let obstacle of obstacles) {
        if (newHead.x >= obstacle.x && newHead.x < obstacle.x + obstacle.width &&
            newHead.y >= obstacle.y && newHead.y < obstacle.y + obstacle.height) {
            gameOver();
            return;
        }
    }

    snake.unshift(newHead);

    // Check food collision
    if (newHead.x === food.x && newHead.y === food.y) {
        score += 1;
        scoreDisplay.textContent = `Score: ${score}`;
        generateFood();
        
        // Update high score if needed
        if (score > highScore) {
            highScore = score;
            highScoreDisplay.textContent = `Best: ${highScore}`;
            localStorage.setItem('snakeHighScore', highScore);
        }
        
        // Increase speed based on score
        if (score % 5 === 0 && difficultyLevel !== 'easy') {
            gameSpeed = Math.max(30, gameSpeed - 5);
            clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, gameSpeed);
        }
    } else if (specialFoodActive && newHead.x === specialFood.x && newHead.y === specialFood.y) {
        score += 5; // Special food worth more points
        scoreDisplay.textContent = `Score: ${score}`;
        specialFoodActive = false;
        
        // Update high score if needed
        if (score > highScore) {
            highScore = score;
            highScoreDisplay.textContent = `Best: ${highScore}`;
            localStorage.setItem('snakeHighScore', highScore);
        }
        
        clearTimeout(specialFoodTimer);
    } else {
        snake.pop();
    }
}

// Draw game elements with realistic snake appearance
function draw() {
    gameBoard.innerHTML = '';
    
    // Draw obstacles
    obstacles.forEach(obstacle => {
        const obstacleElement = document.createElement('div');
        obstacleElement.className = 'obstacle';
        obstacleElement.style.left = obstacle.x + 'px';
        obstacleElement.style.top = obstacle.y + 'px';
        obstacleElement.style.width = obstacle.width + 'px';
        obstacleElement.style.height = obstacle.height + 'px';
        gameBoard.appendChild(obstacleElement);
    });
    
    // Draw snake body first (to ensure head is on top)
    for (let i = 1; i < snake.length; i++) {
        const segment = snake[i];
        const prevSegment = snake[i - 1];
        
        // Create segment
        const snakeElement = document.createElement('div');
        snakeElement.className = 'snake-segment';
        snakeElement.style.left = segment.x + 'px';
        snakeElement.style.top = segment.y + 'px';
        
        // Add gradient effect based on position in snake
        const hue = 120 - Math.min(20, i) * 2; // Green to darker green
        snakeElement.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
        
        gameBoard.appendChild(snakeElement);
        
        // Draw connector between segments for a smoother appearance
        if (i > 0) {
            const connector = document.createElement('div');
            connector.className = 'snake-connector';
            
            // Calculate connector position and size based on segments
            if (prevSegment.x === segment.x) {
                // Vertical connector
                connector.style.width = '14px';
                connector.style.height = Math.abs(prevSegment.y - segment.y) + 'px';
                connector.style.left = (segment.x + 3) + 'px';
                connector.style.top = Math.min(prevSegment.y, segment.y) + 'px';
            } else {
                // Horizontal connector
                connector.style.height = '14px';
                connector.style.width = Math.abs(prevSegment.x - segment.x) + 'px';
                connector.style.top = (segment.y + 3) + 'px';
                connector.style.left = Math.min(prevSegment.x, segment.x) + 'px';
            }
            
            // Match color of the segment
            connector.style.backgroundColor = snakeElement.style.backgroundColor;
            
            gameBoard.appendChild(connector);
        }
    }
    
    // Draw snake head
    if (snake.length > 0) {
        const head = snake[0];
        const headElement = document.createElement('div');
        headElement.className = `snake-head ${currentDirection}`;
        headElement.style.left = (head.x - 1) + 'px'; // Slightly larger than body
        headElement.style.top = (head.y - 1) + 'px';
        gameBoard.appendChild(headElement);
        
        // Add eyes to the snake head
        const leftEye = document.createElement('div');
        leftEye.className = 'snake-eye';
        const rightEye = document.createElement('div');
        rightEye.className = 'snake-eye';
        
        // Position eyes based on direction
        if (currentDirection === 'right') {
            leftEye.style.left = '15px';
            leftEye.style.top = '5px';
            rightEye.style.left = '15px';
            rightEye.style.top = '12px';
        } else if (currentDirection === 'left') {
            leftEye.style.left = '3px';
            leftEye.style.top = '5px';
            rightEye.style.left = '3px';
            rightEye.style.top = '12px';
        } else if (currentDirection === 'up') {
            leftEye.style.left = '5px';
            leftEye.style.top = '3px';
            rightEye.style.left = '12px';
            rightEye.style.top = '3px';
        } else {
            leftEye.style.left = '5px';
            leftEye.style.top = '15px';
            rightEye.style.left = '12px';
            rightEye.style.top = '15px';
        }
        
        headElement.appendChild(leftEye);
        headElement.appendChild(rightEye);
    }

    // Draw food
    const foodElement = document.createElement('div');
    foodElement.className = 'food';
    foodElement.style.left = food.x + 'px';
    foodElement.style.top = food.y + 'px';
    gameBoard.appendChild(foodElement);
    
    // Draw special food
    if (specialFoodActive) {
        const specialFoodElement = document.createElement('div');
        specialFoodElement.className = 'special-food';
        specialFoodElement.style.left = specialFood.x + 'px';
        specialFoodElement.style.top = specialFood.y + 'px';
        gameBoard.appendChild(specialFoodElement);
    }
    
    // Display game paused message
    if (gamePaused) {
        pausedIndicator.style.display = 'block';
    } else {
        pausedIndicator.style.display = 'none';
    }
}

// Game loop
function gameLoop() {
    update();
    draw();
}

function gameOver() {
    gameActive = false;
    
    // Save high score
    if (score > highScore) {
        localStorage.setItem('snakeHighScore', score);
    }
    
    // Update final score display
    finalScoreDisplay.textContent = score;
    
    // Show game over screen
    gameOverScreen.style.display = 'flex';
    
    // Hide in-game home button (we have one in the game over screen)
    inGameHomeBtn.style.display = 'none';
}

// Handle keyboard controls
document.addEventListener('keydown', (event) => {
    // Add H key to return to home
    if (event.key === 'h' || event.key === 'H') {
        returnToHome();
        return;
    }
    
    // Pause game with Space or Escape
    if (event.key === ' ' || event.key === 'Spacebar' || event.key === 'Escape') {
        if (gameActive) {
            gamePaused = !gamePaused;
        }
        return;
    }
    
    // Skip if game is paused or not active
    if (!gameActive || gamePaused) return;
    
    switch(event.key) {
        case 'ArrowUp':
            if (currentDirection !== 'down') {
                dx = 0;
                dy = -gridSize;
                currentDirection = 'up';
            }
            break;
        case 'ArrowDown':
            if (currentDirection !== 'up') {
                dx = 0;
                dy = gridSize;
                currentDirection = 'down';
            }
            break;
        case 'ArrowLeft':
            if (currentDirection !== 'right') {
                dx = -gridSize;
                dy = 0;
                currentDirection = 'left';
            }
            break;
        case 'ArrowRight':
            if (currentDirection !== 'left') {
                dx = gridSize;
                dy = 0;
                currentDirection = 'right';
            }
            break;
    }
});

// Mobile touch controls
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
});

document.addEventListener('touchend', (e) => {
    if (!gameActive || gamePaused) return;
    
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // Determine swipe direction
    if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (diffX > 0 && currentDirection !== 'left') {
            // Right swipe
            dx = gridSize;
            dy = 0;
            currentDirection = 'right';
        } else if (diffX < 0 && currentDirection !== 'right') {
            // Left swipe
            dx = -gridSize;
            dy = 0;
            currentDirection = 'left';
        }
    } else {
        // Vertical swipe
        if (diffY > 0 && currentDirection !== 'up') {
            // Down swipe
            dx = 0;
            dy = gridSize;
            currentDirection = 'down';
        } else if (diffY < 0 && currentDirection !== 'down') {
            // Up swipe
            dx = 0;
            dy = -gridSize;
            currentDirection = 'up';
        }
    }
    
    // Prevent default behavior
    e.preventDefault();
});

// Handle window resize
window.addEventListener('resize', () => {
    boardWidth = window.innerWidth;
    boardHeight = window.innerHeight;
    
    // Adjust snake position if needed
    if (snake.length > 0) {
        if (snake[0].x >= boardWidth) snake[0].x = boardWidth - gridSize;
        if (snake[0].y >= boardHeight) snake[0].y = boardHeight - gridSize;
    }
});