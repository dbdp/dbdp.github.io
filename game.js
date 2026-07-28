(() => {
  const canvas = document.querySelector('#game-board');
  const scoreElement = document.querySelector('#score');
  const highScoreElement = document.querySelector('#high-score');
  const statusElement = document.querySelector('#game-status');
  const powerupElement = document.querySelector('#powerup-status');
  const startButton = document.querySelector('#start-game');
  const pauseButton = document.querySelector('#pause-game');
  const restartButton = document.querySelector('#restart-game');
  const directionButtons = document.querySelectorAll('[data-direction]');

  if (!canvas || !scoreElement || !highScoreElement || !statusElement || !powerupElement) return;

  const context = canvas.getContext('2d');
  const gridSize = 40;
  const cellSize = canvas.width / gridSize;
  const baseSpeed = 220;
  const maxSpeedMultiplier = 4;
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  const keyDirections = {
    ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right'
  };

  let snake;
  let food;
  let pill;
  let direction;
  let queuedDirection;
  let score;
  let highScore = Number(localStorage.getItem('snake-high-score') || 0);
  let timerId = null;
  let powerupTimerId = null;
  let invincibleUntil = 0;
  let speedMultiplier = 1;
  let trail = [];
  let running = false;
  let paused = false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  highScoreElement.textContent = String(highScore);

  function resetState() {
    stopTimer();
    clearPowerupTimer();
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    direction = directions.right;
    queuedDirection = direction;
    score = 0;
    speedMultiplier = 1;
    trail = [];
    food = randomFreeCell();
    pill = randomFreeCell([food]);
    invincibleUntil = 0;
    running = false;
    paused = false;
    updateScore();
    updatePowerupStatus();
    statusElement.textContent = '준비';
    pauseButton.disabled = true;
    pauseButton.textContent = '일시정지';
    draw();
  }

  function randomFreeCell(blocked = []) {
    let cell;
    do {
      cell = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
    } while ((snake && snake.some((part) => part.x === cell.x && part.y === cell.y))
      || blocked.some((part) => part.x === cell.x && part.y === cell.y));
    return cell;
  }

  function updateScore() {
    scoreElement.textContent = String(score);
    if (score > highScore) {
      highScore = score;
      highScoreElement.textContent = String(highScore);
      localStorage.setItem('snake-high-score', String(highScore));
    }
  }

  function setDirection(name) {
    const next = directions[name];
    if (!next || (next.x + queuedDirection.x === 0 && next.y + queuedDirection.y === 0)) return;
    queuedDirection = next;
  }

  function startTimer() {
    stopTimer();
    timerId = window.setInterval(tick, Math.max(45, Math.round(baseSpeed / speedMultiplier)));
  }

  function stopTimer() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function clearPowerupTimer() {
    if (powerupTimerId !== null) {
      window.clearTimeout(powerupTimerId);
      powerupTimerId = null;
    }
  }

  function refreshTimerSpeed() {
    if (running && !paused) startTimer();
  }

  function activatePowerup() {
    const now = Date.now();
    speedMultiplier = Math.min(maxSpeedMultiplier, speedMultiplier + 1);
    invincibleUntil = Math.max(now, invincibleUntil) + 10000;
    clearPowerupTimer();
    powerupTimerId = window.setTimeout(() => {
      invincibleUntil = 0;
      powerupTimerId = null;
      updatePowerupStatus();
      refreshTimerSpeed();
      if (running) endGame();
    }, Math.max(0, invincibleUntil - now));
    updatePowerupStatus();
    refreshTimerSpeed();
  }

  function updatePowerupStatus() {
    const remaining = Math.max(0, invincibleUntil - Date.now());
    powerupElement.textContent = remaining > 0
      ? `알약 무적·속도 ${speedMultiplier}배: ${Math.ceil(remaining / 1000)}초`
      : `알약: 없음 · 현재 속도 ${speedMultiplier}배`;
  }

  function tick() {
    direction = queuedDirection;
    const nextDirection = { x: direction.x, y: direction.y };
    let nextHead = { x: snake[0].x + nextDirection.x, y: snake[0].y + nextDirection.y };
    if (nextHead.x < 0 || nextHead.x >= gridSize) {
      nextDirection.x *= -1;
    }
    if (nextHead.y < 0 || nextHead.y >= gridSize) {
      nextDirection.y *= -1;
    }
    direction = nextDirection;
    queuedDirection = nextDirection;
    nextHead = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    if (!reduceMotion) {
      trail.unshift({ x: snake[0].x, y: snake[0].y });
      trail = trail.slice(0, Math.min(16, 4 + speedMultiplier * 3));
    }
    snake.unshift(nextHead);
    if (nextHead.x === food.x && nextHead.y === food.y) {
      score += 10;
      food = randomFreeCell([pill]);
      updateScore();
    } else if (nextHead.x === pill.x && nextHead.y === pill.y) {
      score += 25;
      pill = randomFreeCell([food]);
      activatePowerup();
      updateScore();
    } else {
      snake.pop();
    }
    updatePowerupStatus();
    draw();
  }

  function startGame() {
    if (running && !paused) return;
    running = true;
    paused = false;
    statusElement.textContent = '진행 중';
    pauseButton.disabled = false;
    pauseButton.textContent = '일시정지';
    startTimer();
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    if (paused) {
      stopTimer();
      trail = [];
      draw();
      statusElement.textContent = '일시정지';
      pauseButton.textContent = '계속';
    } else {
      statusElement.textContent = '진행 중';
      pauseButton.textContent = '일시정지';
      startTimer();
    }
  }

  function endGame() {
    running = false;
    paused = false;
    stopTimer();
    trail = [];
    statusElement.textContent = '게임 오버';
    pauseButton.disabled = true;
    draw();
  }

  function drawCell(cell, color, radius = 4) {
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(cell.x * cellSize + 2, cell.y * cellSize + 2, cellSize - 4, cellSize - 4, radius);
    context.fill();
  }

  function draw() {
    context.fillStyle = '#101820';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(255,255,255,.045)';
    for (let i = 1; i < gridSize; i += 1) {
      context.beginPath();
      context.moveTo(i * cellSize, 0);
      context.lineTo(i * cellSize, canvas.height);
      context.moveTo(0, i * cellSize);
      context.lineTo(canvas.width, i * cellSize);
      context.stroke();
    }
    trail.forEach((cell, index) => {
      const alpha = Math.max(0.025, (trail.length - index) / trail.length * 0.18 * speedMultiplier / maxSpeedMultiplier);
      drawCell(cell, `rgba(114, 183, 255, ${alpha})`, 6);
    });
    drawCell(food, '#55d88a', 8);
    drawCell(pill, '#f7c948', 8);
    snake.forEach((part, index) => drawCell(part, index === 0 ? '#72b7ff' : '#1877f2', 6));
  }

  document.addEventListener('keydown', (event) => {
    if (keyDirections[event.key]) {
      event.preventDefault();
      setDirection(keyDirections[event.key]);
    }
    if (event.key === ' ' || event.key === 'p' || event.key === 'P') {
      event.preventDefault();
      togglePause();
    }
  });
  directionButtons.forEach((button) => button.addEventListener('click', () => setDirection(button.dataset.direction)));
  startButton.addEventListener('click', startGame);
  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', () => { resetState(); startGame(); });

  resetState();
})();
