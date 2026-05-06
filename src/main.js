const screens = {
  platform: document.querySelector('#platformScreen'),
  menu: document.querySelector('#menuScreen'),
  settings: document.querySelector('#settingsScreen'),
  game: document.querySelector('#gameScreen'),
};

const difficultyRules = {
  easy: {
    label: 'Лёгкая',
    speed: 0.36,
    range: [10, 45],
    operations: ['+', '−', '×'],
    score: 10,
  },
  medium: {
    label: 'Средняя',
    speed: 0.54,
    range: [30, 99],
    operations: ['+', '−', '×', '÷'],
    score: 16,
  },
  hard: {
    label: 'Сложная',
    speed: 0.76,
    range: [50, 169],
    operations: ['+', '−', '×', '÷', '^'],
    score: 24,
  },
};

const state = {
  platform: 'desktop',
  difficulty: 'easy',
  expression: [],
  lastResult: null,
  score: 0,
  combo: 1,
  secondsLeft: 120,
  cubes: [],
  projectiles: [],
  running: false,
  lastFrame: 0,
  cubeTimer: 0,
  timerId: null,
  best: Number(localStorage.getItem('mathTrainerBest') || 0),
};

const $ = (selector) => document.querySelector(selector);
const numberTiles = $('#numberTiles');
const operationTiles = $('#operationTiles');
const resultTiles = $('#resultTiles');
const expressionDrop = $('#expressionDrop');
const expressionResult = $('#expressionResult');
const cubeField = $('#cubeField');
const arena = $('.arena');

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove('screen--active'));
  screens[name].classList.add('screen--active');
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createTile(value, type = 'number') {
  const tile = document.importNode($('#tileTemplate').content, true).querySelector('.tile');
  tile.textContent = value;
  tile.dataset.value = value;
  tile.dataset.type = type;
  tile.classList.toggle('tile--operator', type === 'operator');
  tile.classList.toggle('tile--result', type === 'result');
  tile.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('application/json', JSON.stringify({ value, type }));
  });
  tile.addEventListener('click', () => addToken(value, type));
  return tile;
}

function renderPalette() {
  numberTiles.replaceChildren(...Array.from({ length: 9 }, (_, index) => createTile(String(index + 1))));
  operationTiles.replaceChildren(...difficultyRules[state.difficulty].operations.map((operator) => createTile(operator, 'operator')));
}

function renderExpression() {
  expressionDrop.replaceChildren();
  if (state.expression.length === 0) {
    const placeholder = document.createElement('span');
    placeholder.className = 'placeholder';
    placeholder.textContent = '_= перетащите элементы';
    expressionDrop.append(placeholder);
    expressionResult.textContent = '—';
    return;
  }

  const prefix = document.createElement('span');
  prefix.className = 'expression-token';
  prefix.textContent = '_=';
  expressionDrop.append(prefix);

  state.expression.forEach((token) => {
    const element = document.createElement('span');
    element.className = 'expression-token';
    element.textContent = token.value;
    expressionDrop.append(element);
  });
}

function addToken(value, type) {
  const previous = state.expression.at(-1);
  const isOperator = type === 'operator';
  if (state.expression.length === 0 && isOperator) return;
  if (previous && previous.type === type && isOperator) return;
  if (previous && previous.type !== 'operator' && type !== 'operator') return;
  state.expression.push({ value: String(value), type });
  renderExpression();
}

function calculateExpression() {
  if (state.expression.length < 3 || state.expression.at(-1).type === 'operator') return null;

  let result = Number(state.expression[0].value);
  for (let index = 1; index < state.expression.length; index += 2) {
    const operator = state.expression[index].value;
    const number = Number(state.expression[index + 1].value);
    if (!Number.isFinite(number)) return null;
    if (operator === '+') result += number;
    if (operator === '−') result -= number;
    if (operator === '×') result *= number;
    if (operator === '÷') {
      if (number === 0) return null;
      result /= number;
    }
    if (operator === '^') result = Math.pow(result, number);
  }

  if (!Number.isInteger(result) || Math.abs(result) > 999) return null;
  return result;
}

function commitResult() {
  const result = calculateExpression();
  if (result === null) {
    expressionResult.textContent = 'ошибка';
    expressionResult.style.color = 'var(--danger)';
    return;
  }

  state.lastResult = result;
  expressionResult.textContent = result;
  expressionResult.style.color = 'var(--good)';
  const alreadyExists = [...resultTiles.children].some((tile) => tile.dataset.value === String(result));
  if (!alreadyExists) resultTiles.prepend(createTile(String(result), 'result'));
}

function clearExpression() {
  state.expression = [];
  state.lastResult = null;
  expressionResult.style.color = '';
  renderExpression();
}

function updateHud() {
  $('#score').textContent = state.score;
  $('#combo').textContent = `×${state.combo}`;
  $('#bestScore').textContent = state.best;
  const minutes = String(Math.floor(state.secondsLeft / 60)).padStart(2, '0');
  const seconds = String(state.secondsLeft % 60).padStart(2, '0');
  $('#timer').textContent = `${minutes}:${seconds}`;
  $('#difficultyBadge').textContent = difficultyRules[state.difficulty].label;
}

function createCube(value = randomInt(...difficultyRules[state.difficulty].range)) {
  const cube = document.createElement('div');
  cube.className = 'cube';
  cube.dataset.value = value;
  cube.style.left = `${randomInt(6, 78)}%`;
  cube.style.top = '-110px';

  ['front', 'back', 'right', 'left', 'top', 'bottom'].forEach((faceName) => {
    const face = document.createElement('div');
    face.className = `face ${faceName}`;
    face.textContent = value;
    cube.append(face);
  });

  cubeField.append(cube);
  state.cubes.push({ element: cube, value, y: -110, speed: difficultyRules[state.difficulty].speed + Math.random() * 0.18 });
}

function removeCube(cube) {
  cube.element.remove();
  state.cubes = state.cubes.filter((item) => item !== cube);
}

function fireResult() {
  const value = state.lastResult ?? calculateExpression();
  if (value === null) return;

  const projectile = document.createElement('div');
  projectile.className = 'projectile';
  projectile.textContent = value;
  const matchingCube = state.cubes.find((cube) => Number(cube.value) === Number(value));
  if (matchingCube) {
    const cubeCenter = matchingCube.element.offsetLeft + matchingCube.element.offsetWidth / 2;
    projectile.style.setProperty('--projectile-left', `${cubeCenter}px`);
  }
  arena.append(projectile);
  state.projectiles.push({ element: projectile, value, y: 20, speed: 1.7 });
}

function flashArena(className) {
  arena.classList.remove('flash-good', 'flash-bad');
  void arena.offsetWidth;
  arena.classList.add(className);
}

function reward(isMatch) {
  const rules = difficultyRules[state.difficulty];
  if (isMatch) {
    state.score += rules.score * state.combo;
    state.combo += 1;
    flashArena('flash-good');
  } else {
    state.score = Math.max(0, state.score - Math.ceil(rules.score * 0.7));
    state.combo = 1;
    flashArena('flash-bad');
  }
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem('mathTrainerBest', String(state.best));
  }
  updateHud();
}

function rectanglesIntersect(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function animate(timestamp) {
  if (!state.running) return;
  const delta = Math.min(timestamp - (state.lastFrame || timestamp), 32);
  state.lastFrame = timestamp;
  state.cubeTimer += delta;

  if (state.cubes.length < 4 && state.cubeTimer > 1450) {
    createCube();
    state.cubeTimer = 0;
  }

  const fieldHeight = cubeField.clientHeight;
  state.cubes.slice().forEach((cube) => {
    cube.y += cube.speed * delta;
    cube.element.style.top = `${cube.y}px`;
    if (cube.y > fieldHeight + 90) {
      removeCube(cube);
      reward(false);
    }
  });

  state.projectiles.slice().forEach((projectile) => {
    projectile.y += projectile.speed * delta;
    projectile.element.style.bottom = `${projectile.y}px`;
    const projectileRect = projectile.element.getBoundingClientRect();
    const target = state.cubes.find((cube) => rectanglesIntersect(projectileRect, cube.element.getBoundingClientRect()));
    if (target) {
      const isMatch = Number(projectile.value) === Number(target.value);
      projectile.element.remove();
      state.projectiles = state.projectiles.filter((item) => item !== projectile);
      removeCube(target);
      reward(isMatch);
    } else if (projectile.y > arena.clientHeight) {
      projectile.element.remove();
      state.projectiles = state.projectiles.filter((item) => item !== projectile);
      reward(false);
    }
  });

  requestAnimationFrame(animate);
}

function startGame() {
  state.score = 0;
  state.combo = 1;
  state.secondsLeft = 120;
  state.running = true;
  state.lastFrame = 0;
  state.cubeTimer = 1300;
  clearExpression();
  resultTiles.replaceChildren();
  cubeField.replaceChildren();
  state.cubes = [];
  state.projectiles.forEach((projectile) => projectile.element.remove());
  state.projectiles = [];
  renderPalette();
  updateHud();
  showScreen('game');
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    state.secondsLeft -= 1;
    updateHud();
    if (state.secondsLeft <= 0) stopGame();
  }, 1000);
  requestAnimationFrame(animate);
}

function stopGame() {
  state.running = false;
  clearInterval(state.timerId);
  showScreen('menu');
}

function setDifficulty(value) {
  state.difficulty = value;
  document.querySelectorAll('.difficulty-card').forEach((card) => {
    const selected = card.dataset.difficulty === value;
    card.classList.toggle('is-selected', selected);
    card.setAttribute('aria-checked', String(selected));
  });
  renderPalette();
}

function wireUi() {
  document.querySelectorAll('.platform-btn').forEach((button) => {
    button.addEventListener('click', () => {
      state.platform = button.dataset.platform;
      document.body.classList.toggle('platform-mobile', state.platform === 'mobile');
      $('#platformLabel').textContent = state.platform === 'mobile' ? 'Телефон' : 'ПК';
      showScreen('menu');
    });
  });

  $('#playBtn').addEventListener('click', startGame);
  $('#settingsBtn').addEventListener('click', () => showScreen('settings'));
  $('#backToMenuBtn').addEventListener('click', () => showScreen('menu'));
  $('#backBtn').addEventListener('click', stopGame);
  $('#clearBtn').addEventListener('click', clearExpression);
  $('#calculateBtn').addEventListener('click', commitResult);
  $('#fireBtn').addEventListener('click', fireResult);

  document.querySelectorAll('.difficulty-card').forEach((button) => {
    button.addEventListener('click', () => setDifficulty(button.dataset.difficulty));
  });

  expressionDrop.addEventListener('dragover', (event) => {
    event.preventDefault();
    expressionDrop.classList.add('is-over');
  });
  expressionDrop.addEventListener('dragleave', () => expressionDrop.classList.remove('is-over'));
  expressionDrop.addEventListener('drop', (event) => {
    event.preventDefault();
    expressionDrop.classList.remove('is-over');
    const payload = JSON.parse(event.dataTransfer.getData('application/json'));
    addToken(payload.value, payload.type);
  });

  $('#collisionZone').addEventListener('dragover', (event) => event.preventDefault());
  $('#collisionZone').addEventListener('drop', (event) => {
    event.preventDefault();
    const payload = JSON.parse(event.dataTransfer.getData('application/json'));
    if (payload.type !== 'operator') {
      state.lastResult = Number(payload.value);
      fireResult();
    }
  });
}

wireUi();
renderPalette();
renderExpression();
updateHud();
