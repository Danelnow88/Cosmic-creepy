const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const startButton = document.getElementById('startButton');
const playButton = document.getElementById('playButton');

const W = canvas.width;
const H = canvas.height;

let active = false;
let running = false;
let lastTime = 0;
let score = 0;
let lives = 3;
let spawnTimer = 0;
let flashTimer = 0;

const keys = new Set();
const stars = Array.from({ length: 150 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H,
  r: Math.random() * 2.2 + 0.8,
  speed: Math.random() * 80 + 30,
  alpha: Math.random() * 0.8 + 0.2,
}));

const player = {
  x: W / 2,
  y: H - 60,
  w: 38,
  h: 52,
  speed: 420,
  invulnerable: 0,
};

const hazards = [];

function resetGame() {
  score = 0;
  lives = 3;
  spawnTimer = 0;
  hazards.length = 0;
  player.x = W / 2;
  player.invulnerable = 0;
  updateHud();
}

function updateHud() {
  scoreEl.textContent = Math.floor(score).toString();
  livesEl.textContent = lives.toString();
}

function startGame() {
  resetGame();
  running = true;
  active = true;
  overlay.classList.add('hidden');
}

function endGame() {
  running = false;
  overlayTitle.textContent = 'Partida finalizada';
  overlayText.textContent = `Puntuación: ${Math.floor(score)}. Pulsa para volver a intentarlo.`;
  overlay.classList.remove('hidden');
  startButton.textContent = 'Reiniciar';
}

function addHazard() {
  const size = 18 + Math.random() * 22;
  const lane = Math.random() * (W - 80) + 40;
  hazards.push({
    x: lane,
    y: -size,
    radius: size,
    speed: 180 + Math.random() * 170 + score * 0.08,
    drift: (Math.random() - 0.5) * 60,
    rotation: Math.random() * Math.PI * 2,
    type: Math.random() > 0.7 ? 'orb' : 'rock',
  });
}

function update(dt) {
  if (!running) return;

  score += dt * 18;
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    addHazard();
    spawnTimer = Math.max(0.42, 1.0 - score * 0.005);
  }

  if (keys.has('ArrowLeft') || keys.has('a')) {
    player.x -= player.speed * dt;
  }
  if (keys.has('ArrowRight') || keys.has('d')) {
    player.x += player.speed * dt;
  }

  player.x = Math.max(40, Math.min(W - 40, player.x));

  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    h.y += h.speed * dt;
    h.x += h.drift * dt;
    h.rotation += dt * 1.8;

    if (h.y - h.radius > H + 20) {
      hazards.splice(i, 1);
      continue;
    }

    const dx = h.x - player.x;
    const dy = h.y - (player.y + 6);
    const distance = Math.hypot(dx, dy);
    const collisionRadius = h.radius + player.w * 0.7;

    if (distance < collisionRadius) {
      hazards.splice(i, 1);
      if (player.invulnerable <= 0) {
        lives -= 1;
        player.invulnerable = 1.2;
        flashTimer = 0.22;
        if (lives <= 0) {
          endGame();
          return;
        }
      }
      updateHud();
    }
  }

  player.invulnerable = Math.max(0, player.invulnerable - dt);
  flashTimer = Math.max(0, flashTimer - dt);
  updateHud();
}

function drawBackground() {
  ctx.fillStyle = '#070b17';
  ctx.fillRect(0, 0, W, H);

  for (const star of stars) {
    star.y += star.speed * 0.016;
    if (star.y > H) {
      star.y = -5;
      star.x = Math.random() * W;
    }

    ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const horizon = ctx.createLinearGradient(0, 0, 0, H);
  horizon.addColorStop(0, '#091225');
  horizon.addColorStop(0.5, '#101d34');
  horizon.addColorStop(1, '#1c1b35');
  ctx.fillStyle = horizon;
  ctx.fillRect(0, 0, W, H);
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;
  const blink = player.invulnerable > 0 && Math.floor(player.invulnerable * 18) % 2 === 0;
  if (blink) return;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = '#75e6ff';
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(16, 18);
  ctx.lineTo(0, 12);
  ctx.lineTo(-16, 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#6ef7d2';
  ctx.beginPath();
  ctx.arc(0, 4, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0c2540';
  ctx.fillRect(-6, 18, 12, 12);
  ctx.restore();
}

function drawHazards() {
  for (const h of hazards) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.rotation);

    if (h.type === 'orb') {
      const g = ctx.createRadialGradient(-4, -4, 3, 0, 0, h.radius);
      g.addColorStop(0, '#ffd166');
      g.addColorStop(0.4, '#ff7c5c');
      g.addColorStop(1, '#783dff');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, h.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ff5e7d';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 / 6) * i;
        const px = Math.cos(angle) * h.radius;
        const py = Math.sin(angle) * h.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawUI() {
  if (flashTimer > 0) {
    ctx.fillStyle = 'rgba(255, 94, 125, 0.22)';
    ctx.fillRect(0, 0, W, H);
  }
}

function render() {
  drawBackground();
  drawHazards();
  drawPlayer();
  drawUI();
}

function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000 || 0.016, 0.028);
  lastTime = ts;

  if (active) {
    update(dt);
    render();
  } else {
    drawBackground();
    drawPlayer();
    drawHazards();
    drawUI();
  }

  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.add(key);
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === ' ' || event.key === 'a' || event.key === 'd') {
    event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.delete(key);
});

playButton.addEventListener('click', () => {
  startGame();
});

startButton.addEventListener('click', () => {
  startGame();
});

updateHud();
render();
requestAnimationFrame(loop);
