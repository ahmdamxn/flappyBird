const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const FPS = 60;

const GRAVITY = 0.45;
const FLAP_VELOCITY = -8.5;

const PIPE_SPEED = 3.2;
const PIPE_WIDTH = 74;
const PIPE_GAP = 170;
const PIPE_SPAWN_MS = 1350;

const GROUND_HEIGHT = 90;

// Colors
const SKY = "#87ceeb";
const GROUND = "#deb887";
const GROUND_DARK = "#cdaa7d";
const PIPE_GREEN = "#28aa50";
const PIPE_DARK = "#1e823c";
const WHITE = "#ffffff";
const BLACK = "#000000";

const READY = "ready";
const PLAYING = "playing";
const GAME_OVER = "game_over";

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const playBtn = document.getElementById("play");

let state = READY;
let pipes = [];
let score = 0;
let best = Number(localStorage.getItem("flappy-best") || 0);
let lastSpawn = performance.now();
let scroll = 0;

class Bird {
  constructor() {
    this.x = WIDTH * 0.28;
    this.y = HEIGHT * 0.45;
    this.r = 16;
    this.vy = 0;
  }

  reset() {
    this.y = HEIGHT * 0.45;
    this.vy = 0;
  }

  flap() {
    this.vy = FLAP_VELOCITY;
  }

  update() {
    this.vy += GRAVITY;
    this.y += this.vy;
  }

  rect() {
    return {
      x: this.x - this.r,
      y: this.y - this.r,
      w: this.r * 2,
      h: this.r * 2,
    };
  }

  draw() {
    ctx.fillStyle = "#ffd c3c".replace(/\s+/g, "");
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();

    // eye
    ctx.fillStyle = BLACK;
    ctx.beginPath();
    ctx.arc(this.x + 6, this.y - 5, 3, 0, Math.PI * 2);
    ctx.fill();

    // beak
    ctx.fillStyle = "#ff9632";
    ctx.beginPath();
    ctx.moveTo(this.x + 12, this.y);
    ctx.lineTo(this.x + 26, this.y + 4);
    ctx.lineTo(this.x + 12, this.y + 8);
    ctx.closePath();
    ctx.fill();
  }
}

class PipePair {
  constructor(x) {
    this.x = x;
    const gapCenter = randInt(140, HEIGHT - GROUND_HEIGHT - 140);
    this.gapTop = gapCenter - PIPE_GAP / 2;
    this.gapBottom = gapCenter + PIPE_GAP / 2;
    this.passed = false;
  }

  update() {
    this.x -= PIPE_SPEED;
  }

  offscreen() {
    return this.x + PIPE_WIDTH < 0;
  }

  rects() {
    const topH = this.gapTop;
    const bottomY = this.gapBottom;
    const bottomH = HEIGHT - GROUND_HEIGHT - bottomY;
    return [
      { x: this.x, y: 0, w: PIPE_WIDTH, h: topH },
      { x: this.x, y: bottomY, w: PIPE_WIDTH, h: bottomH },
    ];
  }

  draw() {
    const [topRect, bottomRect] = this.rects();
    ctx.fillStyle = PIPE_GREEN;
    ctx.fillRect(topRect.x, topRect.y, topRect.w, topRect.h);
    ctx.fillRect(bottomRect.x, bottomRect.y, bottomRect.w, bottomRect.h);

    // pipe lips
    const lipH = 16;
    ctx.fillStyle = PIPE_DARK;
    ctx.fillRect(topRect.x - 4, topRect.h - lipH, PIPE_WIDTH + 8, lipH);
    ctx.fillRect(bottomRect.x - 4, bottomRect.y, PIPE_WIDTH + 8, lipH);

    // shading
    const shadeW = 10;
    ctx.fillRect(topRect.x, topRect.y, shadeW, topRect.h);
    ctx.fillRect(bottomRect.x, bottomRect.y, shadeW, bottomRect.h);
  }
}

const bird = new Bird();

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function resetGame() {
  state = READY;
  pipes = [];
  score = 0;
  bird.reset();
  updateScoreboard();
}

function updateScoreboard() {
  scoreEl.textContent = score;
  bestEl.textContent = best;
}

function clamp(val, lo, hi) {
  return Math.max(lo, Math.min(hi, val));
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function drawGround() {
  const groundY = HEIGHT - GROUND_HEIGHT;
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, groundY, WIDTH, GROUND_HEIGHT);

  const stripeW = 24;
  for (let i = -2; i < WIDTH / stripeW + 3; i++) {
    const x = (i * stripeW + scroll) % (stripeW * 2);
    ctx.fillStyle = GROUND_DARK;
    ctx.fillRect(x, groundY, stripeW, GROUND_HEIGHT);
  }
}

function drawText(text, size, y, color = WHITE) {
  ctx.fillStyle = color;
  ctx.font = `${size}px Inter, system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, WIDTH / 2, y);
}

function spawnPipe(now) {
  if (now - lastSpawn >= PIPE_SPAWN_MS && state === PLAYING) {
    pipes.push(new PipePair(WIDTH + 10));
    lastSpawn = now;
  }
}

function handleInput() {
  if (state === READY) {
    state = PLAYING;
    bird.flap();
  } else if (state === PLAYING) {
    bird.flap();
  } else if (state === GAME_OVER) {
    resetGame();
  }
}

function update(dt) {
  if (state !== PLAYING) return;

  bird.update();
  for (const pipe of pipes) {
    pipe.update();
    if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
      pipe.passed = true;
      score += 1;
      updateScoreboard();
    }
  }

  pipes = pipes.filter((p) => !p.offscreen());

  const birdRect = bird.rect();

  if (bird.y - bird.r < 0) {
    bird.y = bird.r;
    bird.vy = 0;
  }

  if (bird.y + bird.r >= HEIGHT - GROUND_HEIGHT) {
    endGame();
  }

  for (const pipe of pipes) {
    const [topRect, bottomRect] = pipe.rects();
    if (rectsOverlap(birdRect, topRect) || rectsOverlap(birdRect, bottomRect)) {
      endGame();
      break;
    }
  }
}

function endGame() {
  if (state !== GAME_OVER) {
    state = GAME_OVER;
    best = Math.max(best, score);
    localStorage.setItem("flappy-best", best.toString());
    updateScoreboard();
  }
}

function render() {
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const pipe of pipes) pipe.draw();
  bird.draw();
  drawGround();

  if (state === PLAYING || state === GAME_OVER) {
    drawText(String(score), 44, 80, WHITE);
  }

  if (state === READY) {
    drawText("FLAPPY", 44, 150, WHITE);
    drawText("BIRD", 44, 200, WHITE);
    drawText("Tap / Space to start", 20, 270, WHITE);
    drawText("Tap/Space to flap • R to reset", 20, 310, WHITE);
  }

  if (state === GAME_OVER) {
    const boxX = 40;
    const boxY = 240;
    const boxW = WIDTH - 80;
    const boxH = 180;

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    drawText("GAME OVER", 28, boxY + 30, WHITE);
    drawText(`Score: ${score}`, 22, boxY + 70, WHITE);
    drawText(`Best: ${best}`, 22, boxY + 105, WHITE);
    drawText("Tap / Space to restart", 18, boxY + 145, WHITE);
  }
}

let lastTime = performance.now();

function loop(now) {
  const dt = now - lastTime;
  lastTime = now;

  scroll = (scroll - PIPE_SPEED * 3) % (24 * 2);
  spawnPipe(now);
  update(dt);
  render();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
updateScoreboard();

playBtn.addEventListener("click", handleInput);
canvas.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  handleInput();
});

window.addEventListener("touchstart", (e) => {
  e.preventDefault();
  handleInput();
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    handleInput();
  } else if (e.code === "KeyR") {
    resetGame();
  }
});

function resizeCanvas() {
  const maxW = 520;
  const scale = Math.min(1, (document.querySelector(".hero").clientWidth - 32) / maxW);
  canvas.style.transform = `scale(${scale})`;
  canvas.style.transformOrigin = "top center";
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
