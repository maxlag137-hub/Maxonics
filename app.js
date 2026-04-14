const TEXT = {
  en: {
    start: '▶️ Start',
    stop: '⏸️ Stop',
    continue: '▶️ Continue',
    reset: '🔄 Reset',
    settings: 'Settings',
    back: 'Back',
    soon: 'Soon',
    language: 'Language',
  },
  ru: {
    start: '▶️ Старт',
    stop: '⏸️ Стоп',
    continue: '▶️ Продолжить',
    reset: '🔄 Сброс',
    settings: 'Настройки',
    back: 'Назад',
    soon: 'Скоро будет',
    language: 'Язык',
  },
};

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const controls = document.getElementById('controls');
const settingsButton = document.getElementById('settingsButton');
const settingsModal = document.getElementById('settingsModal');
const languageSelect = document.getElementById('languageSelect');
const backButton = document.getElementById('backButton');
const soonButton = document.getElementById('soonButton');
const settingsTitle = document.getElementById('settingsTitle');
const languageLabel = document.getElementById('languageLabel');

let language = 'ru';
let state = 'idle'; // idle | running | paused

const world = {
  center: { x: 400, y: 400 },
  halfSize: 220,
  angle: 0,
  angularVelocity: 0.42,
  gravity: 1200,
  ball: {
    radius: 24,
    position: { x: 400, y: 400 },
    velocity: { x: 0, y: 0 },
    restitution: 0.82,
    friction: 0.985,
  },
};

let lastTs = performance.now();

function createButton(action, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'action-button';
  button.dataset.action = action;
  button.textContent = label;
  return button;
}

function renderControls() {
  controls.innerHTML = '';
  const t = TEXT[language];

  if (state === 'idle') {
    controls.appendChild(createButton('start', t.start));
  } else if (state === 'running') {
    controls.appendChild(createButton('stop', t.stop));
  } else {
    controls.appendChild(createButton('continue', t.continue));
    controls.appendChild(createButton('reset', t.reset));
  }
}

function updateUiText() {
  const t = TEXT[language];
  settingsButton.setAttribute('aria-label', t.settings);
  settingsTitle.textContent = t.settings;
  languageLabel.textContent = t.language;
  soonButton.textContent = t.soon;
  backButton.textContent = t.back;
  renderControls();
}

function resetWorld() {
  world.angle = 0;
  world.ball.position.x = world.center.x;
  world.ball.position.y = world.center.y;
  world.ball.velocity.x = 0;
  world.ball.velocity.y = 0;
}

function setState(nextState) {
  state = nextState;
  if (state === 'idle') {
    resetWorld();
  }
  renderControls();
}

controls.addEventListener('click', (event) => {
  const action = event.target.dataset.action;
  if (!action) return;

  if (action === 'start') {
    setState('running');
    return;
  }
  if (action === 'stop') {
    setState('paused');
    return;
  }
  if (action === 'continue') {
    setState('running');
    return;
  }
  if (action === 'reset') {
    setState('idle');
  }
});

settingsButton.addEventListener('click', () => {
  settingsModal.classList.remove('hidden');
});

backButton.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

soonButton.addEventListener('click', () => {
  soonButton.animate(
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
    { duration: 180 }
  );
});

languageSelect.addEventListener('change', (event) => {
  language = event.target.value;
  updateUiText();
});

function rotateToLocal(point, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: point.x * c + point.y * s,
    y: -point.x * s + point.y * c,
  };
}

function rotateToWorld(point, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: point.x * c - point.y * s,
    y: point.x * s + point.y * c,
  };
}

function normalize(vec) {
  const m = Math.hypot(vec.x, vec.y) || 1;
  return { x: vec.x / m, y: vec.y / m };
}

function simulate(dt) {
  const ball = world.ball;

  if (state === 'running') {
    world.angle += world.angularVelocity * dt;

    ball.velocity.y += world.gravity * dt;
    ball.velocity.x *= ball.friction;
    ball.velocity.y *= ball.friction;

    ball.position.x += ball.velocity.x * dt;
    ball.position.y += ball.velocity.y * dt;

    // Collision with rotating square in local coordinates.
    const relativePos = {
      x: ball.position.x - world.center.x,
      y: ball.position.y - world.center.y,
    };
    const localPos = rotateToLocal(relativePos, world.angle);
    const localVel = rotateToLocal(ball.velocity, world.angle);

    const min = -world.halfSize + ball.radius;
    const max = world.halfSize - ball.radius;

    let collided = false;
    let collisionNormal = { x: 0, y: 0 };

    if (localPos.x < min) {
      localPos.x = min;
      collisionNormal = { x: 1, y: 0 };
      collided = true;
    } else if (localPos.x > max) {
      localPos.x = max;
      collisionNormal = { x: -1, y: 0 };
      collided = true;
    }

    if (localPos.y < min) {
      localPos.y = min;
      collisionNormal = { x: 0, y: 1 };
      collided = true;
    } else if (localPos.y > max) {
      localPos.y = max;
      collisionNormal = { x: 0, y: -1 };
      collided = true;
    }

    if (collided) {
      const n = normalize(collisionNormal);
      const vn = localVel.x * n.x + localVel.y * n.y;
      if (vn < 0) {
        localVel.x -= (1 + ball.restitution) * vn * n.x;
        localVel.y -= (1 + ball.restitution) * vn * n.y;
      }
      localVel.x *= 0.995;
      localVel.y *= 0.995;
    }

    const correctedRelative = rotateToWorld(localPos, world.angle);
    ball.position.x = world.center.x + correctedRelative.x;
    ball.position.y = world.center.y + correctedRelative.y;

    const worldVel = rotateToWorld(localVel, world.angle);
    ball.velocity.x = worldVel.x;
    ball.velocity.y = worldVel.y;
  }
}

function drawScene() {
  const { center, halfSize, angle, ball } = world;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#111';
  ctx.strokeRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2);
  ctx.restore();

  ctx.beginPath();
  ctx.fillStyle = '#111';
  ctx.arc(ball.position.x, ball.position.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
}

function frame(ts) {
  const dt = Math.min((ts - lastTs) / 1000, 1 / 30);
  lastTs = ts;

  simulate(dt);
  drawScene();
  requestAnimationFrame(frame);
}

updateUiText();
resetWorld();
requestAnimationFrame(frame);
