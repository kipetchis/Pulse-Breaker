const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const comboEl = document.querySelector("#combo");
const livesEl = document.querySelector("#lives");
const bestEl = document.querySelector("#best");
const powerEl = document.querySelector("#power");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const startButton = document.querySelector("#start-button");
const musicButton = document.querySelector("#music-button");
const difficultyPanel = document.querySelector("#difficulty");
const difficultyButtons = document.querySelectorAll("[data-difficulty]");
const themeButtons = document.querySelectorAll("[data-theme]");
const trackButtons = document.querySelectorAll("[data-track]");
const sfxButton = document.querySelector("#sfx-button");
const resetBestButton = document.querySelector("#reset-best-button");

const palette = ["#ff4f79", "#ffb000", "#ffeb5c", "#25d07f", "#28c7f5", "#9a6bff"];
const brickTypes = {
  normal: { label: "", score: 1 },
  armored: { label: "II", score: 1.4 },
  explosive: { label: "!", score: 1.2 },
  mover: { label: ">", score: 1.5 },
  beat: { label: "*", score: 2 },
  wall: { label: "#", score: 0 },
};
const difficulties = {
  chill: { label: "Chill", lives: 5, speed: 0.88, score: 0.8 },
  arcade: { label: "Arcade", lives: 3, speed: 1, score: 1 },
  hardcore: { label: "Hardcore", lives: 1, speed: 1.18, score: 1.45 },
};
const themes = {
  neon: { a: "#ff4f79", b: "#28c7f5", c: "#ffeb5c", grid: "#fffaf3" },
  sunset: { a: "#ff7a3d", b: "#ffdf5d", c: "#37d7b2", grid: "#ffe6cf" },
  matrix: { a: "#25d07f", b: "#9dff6b", c: "#28c7f5", grid: "#b9ffd8" },
  void: { a: "#9a6bff", b: "#28c7f5", c: "#ff4f79", grid: "#e8ddff" },
};
const tracks = {
  pulse: {
    bpm: 138,
    bass: [55, null, 82, null, 55, 73, null, 98, 65, null, 98, null, 73, 82, null, 110],
    arp: [220, 277.18, 329.63, 440, 329.63, 277.18, 246.94, 329.63],
    kick: [0, 8],
    snare: [4, 12],
  },
  drive: {
    bpm: 152,
    bass: [73, 73, null, 110, 98, null, 73, null, 82, 82, null, 123.47, 110, null, 98, null],
    arp: [293.66, 369.99, 440, 587.33, 493.88, 440, 369.99, 293.66],
    kick: [0, 3, 8, 11],
    snare: [4, 12],
  },
  dream: {
    bpm: 124,
    bass: [49, null, null, 73, null, 82, null, null, 55, null, null, 82, null, 98, null, null],
    arp: [196, 246.94, 293.66, 392, 493.88, 392, 293.66, 246.94],
    kick: [0, 10],
    snare: [6, 14],
  },
};
const state = {
  width: 0,
  height: 0,
  dpr: 1,
  running: false,
  paused: false,
  overlayMode: "start",
  difficulty: "arcade",
  theme: "neon",
  themeLocked: false,
  track: "pulse",
  sfxLevel: 1,
  score: 0,
  best: readBestScore(),
  bestLevel: readBestLevel(),
  combo: 1,
  lives: 3,
  level: 1,
  shake: 0,
  beat: 0,
  beatFlash: 0,
  feverFlash: 0,
  lastComboTier: 0,
  slowTime: 0,
  shieldTime: 0,
  laserTime: 0,
  glueTime: 0,
  laserCooldown: 0,
  serveCountdown: 0,
  ballHeld: false,
  keys: new Set(),
  pointerX: null,
  bricks: [],
  balls: [],
  lasers: [],
  particles: [],
  brickBreaks: [],
  floaters: [],
  pickups: [],
  paddle: {
    x: 0,
    y: 0,
    width: 126,
    height: 16,
    targetX: 0,
    previousX: 0,
    velocity: 0,
    speed: 620,
  },
};

let lastTime = 0;
let audioContext = null;
let musicGain = null;
let sfxGain = null;
let musicTimer = null;
let musicStep = 0;
let nextMusicTime = 0;
let musicMuted = false;

function resize() {
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  canvas.width = Math.floor(state.width * state.dpr);
  canvas.height = Math.floor(state.height * state.dpr);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  state.paddle.y = state.height - Math.max(58, state.height * 0.09);
  state.paddle.width = Math.max(92, Math.min(154, state.width * 0.18));
  state.paddle.x = clamp(state.paddle.x || state.width / 2, state.paddle.width / 2, state.width - state.paddle.width / 2);
  state.paddle.targetX = state.paddle.x;
  state.paddle.previousX = state.paddle.x;
  if (!state.running) buildBricks();
}

function resetGame() {
  state.running = true;
  state.paused = false;
  state.overlayMode = "game";
  state.score = 0;
  state.combo = 1;
  state.lives = difficulties[state.difficulty].lives;
  state.level = 1;
  state.shake = 0;
  state.beatFlash = 0;
  state.feverFlash = 0;
  state.lastComboTier = 0;
  state.slowTime = 0;
  state.shieldTime = 0;
  state.laserTime = 0;
  state.glueTime = 0;
  state.laserCooldown = 0;
  state.serveCountdown = 0;
  state.ballHeld = false;
  state.particles = [];
  state.brickBreaks = [];
  state.floaters = [];
  state.pickups = [];
  state.lasers = [];
  state.paddle.x = state.width / 2;
  state.paddle.targetX = state.width / 2;
  state.paddle.previousX = state.paddle.x;
  buildBricks();
  floatingText(state.width / 2, state.height * 0.34, `LEVEL 1 - ${difficulties[state.difficulty].label}`, "#ffeb5c");
  launchBall();
  updateHud();
  startMusic();
  overlay.classList.add("hidden");
}

function buildBricks() {
  if (!state.width || !state.height) return;
  const columns = state.width < 620 ? 7 : 10;
  const rows = Math.min(7, 4 + state.level);
  const gap = 8;
  const margin = Math.max(16, state.width * 0.07);
  const top = Math.max(96, state.height * 0.16);
  const brickWidth = (state.width - margin * 2 - gap * (columns - 1)) / columns;
  const brickHeight = Math.max(22, Math.min(34, state.height * 0.045));
  state.bricks = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (!isBrickInPattern(row, column, rows, columns, state.level)) continue;
      const offset = row % 2 && state.level % 4 !== 0 ? brickWidth * 0.18 : 0;
      const x = margin + column * (brickWidth + gap) + offset;
      if (x + brickWidth > state.width - margin / 2) continue;
      const type = chooseBrickType(row, column, state.level);
      const baseHits = row < 2 + Math.floor(state.level / 3) ? 2 : 1;
      const hits = type === "armored" ? baseHits + 2 : baseHits;
      state.bricks.push({
        x,
        baseX: x,
        y: top + row * (brickHeight + gap),
        width: brickWidth,
        height: brickHeight,
        hits,
        maxHits: hits,
        color: type === "wall" ? "#7d8495" : palette[(row + column + state.level) % palette.length],
        phase: (row * 0.2 + column * 0.11) % 1,
        row,
        column,
        type,
        drift: type === "mover" ? 22 + state.level * 2 : 0,
        speed: type === "mover" ? 1.1 + row * 0.08 : 0,
      });
    }
  }
}

function isBrickInPattern(row, column, rows, columns, level) {
  const middle = (columns - 1) / 2;
  const pattern = level % 5;
  if (pattern === 1) return true;
  if (pattern === 2) return Math.abs(column - middle) <= row + 1 || row > rows - 3;
  if (pattern === 3) return (row + column) % 2 === 0 || row === 0 || row === rows - 1;
  if (pattern === 4) return Math.abs(column - middle) + Math.abs(row - rows / 2) < rows * 0.9;
  return row % 2 === 0 || column % 3 !== 1;
}

function chooseBrickType(row, column, level) {
  if (level >= 4 && row > 1 && column > 0 && column % 5 === 0 && (row + level) % 3 === 0) return "wall";
  if (level >= 2 && (row + column + level) % 11 === 0) return "explosive";
  if (level >= 3 && row < 2 && (column + level) % 4 === 0) return "armored";
  if (level >= 4 && row > 1 && (row * 3 + column + level) % 13 === 0) return "mover";
  if ((row + column + level) % 9 === 0) return "beat";
  return "normal";
}

function launchBall() {
  const speed = Math.min(860, (390 + state.level * 34) * difficulties[state.difficulty].speed);
  state.balls = [
    {
      x: state.paddle.x,
      y: state.paddle.y - 22,
      vx: 0,
      vy: 0,
      radius: 8,
      speed,
      baseSpeed: speed,
      trail: [],
      stuck: true,
    },
  ];
  state.ballHeld = true;
  state.serveCountdown = 0;
  if (state.slowTime > 0) slowBalls();
}

function update(time = 0) {
  const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
  lastTime = time;
  state.beat += dt;

  if (state.running && !state.paused) {
    updateBricks(dt);
    movePaddle(dt);
    updateHeldBalls();
    updateLasers(dt);
    moveBalls(dt);
    movePickups(dt);
    updateParticles(dt);
    updateBrickBreaks(dt);
    updateFloaters(dt);
    updatePowers(dt);
    state.shake = Math.max(0, state.shake - dt * 22);
    state.beatFlash = Math.max(0, state.beatFlash - dt * 3.2);
    state.feverFlash = Math.max(0, state.feverFlash - dt * 1.8);
    state.serveCountdown = Math.max(0, state.serveCountdown - dt);
  }

  draw();
  requestAnimationFrame(update);
}

function updateBricks(dt) {
  for (const brick of state.bricks) {
    if (brick.type !== "mover") continue;
    brick.phase += dt * brick.speed;
    brick.x = brick.baseX + Math.sin(state.beat * 2 + brick.phase * Math.PI * 2) * brick.drift;
    brick.x = clamp(brick.x, 12, state.width - brick.width - 12);
  }
}

function movePaddle(dt) {
  const paddle = state.paddle;
  paddle.previousX = paddle.x;
  if (state.pointerX !== null) {
    paddle.targetX = state.pointerX;
  } else {
    const direction = Number(state.keys.has("ArrowRight") || state.keys.has("KeyD")) - Number(state.keys.has("ArrowLeft") || state.keys.has("KeyA"));
    paddle.targetX += direction * paddle.speed * dt;
  }

  paddle.targetX = clamp(paddle.targetX, paddle.width / 2, state.width - paddle.width / 2);
  paddle.x += (paddle.targetX - paddle.x) * Math.min(1, dt * 14);
  paddle.velocity = (paddle.x - paddle.previousX) / Math.max(dt, 0.001);
}

function updateHeldBalls() {
  const held = state.balls.filter((ball) => ball.stuck);
  state.ballHeld = held.length > 0;
  for (const ball of held) {
    ball.x = state.paddle.x;
    ball.y = state.paddle.y - state.paddle.height / 2 - ball.radius - 6;
    ball.trail = [];
  }
}

function releaseHeldBalls() {
  if (!state.running || state.paused || state.serveCountdown > 0) return;
  const held = state.balls.filter((ball) => ball.stuck);
  if (!held.length) return;
  for (const ball of held) {
    const speed = ball.speed || ball.baseSpeed;
    ball.stuck = false;
    ball.vx = speed * 0.22 * (Math.random() > 0.5 ? 1 : -1);
    ball.vy = -speed;
  }
  state.ballHeld = false;
  floatingText(state.paddle.x, state.paddle.y - 50, "GO", "#ffeb5c");
  ping(620, 0.08, "square");
}

function moveBalls(dt) {
  for (const ball of state.balls) {
    if (ball.stuck) continue;
    ball.trail.unshift({ x: ball.x, y: ball.y });
    ball.trail = ball.trail.slice(0, 8);
    const steps = Math.max(1, Math.ceil((Math.hypot(ball.vx, ball.vy) * dt) / 12));
    const stepDt = dt / steps;
    for (let i = 0; i < steps; i += 1) {
      ball.x += ball.vx * stepDt;
      ball.y += ball.vy * stepDt;

      if (ball.x < ball.radius) {
        ball.x = ball.radius;
        ball.vx *= -1;
        ping(250, 0.025, "sine");
      }
      if (ball.x > state.width - ball.radius) {
        ball.x = state.width - ball.radius;
        ball.vx *= -1;
        ping(250, 0.025, "sine");
      }
      if (ball.y < ball.radius) {
        ball.y = ball.radius;
        ball.vy *= -1;
        ping(330, 0.025, "sine");
      }

      collidePaddle(ball);
      collideBricks(ball);
      if (ball.stuck) break;
    }
  }

  state.balls = state.balls.filter((ball) => ball.y < state.height + 80);
  if (state.balls.length === 0) {
    if (state.shieldTime > 0) {
      state.shieldTime = 0;
      updateHud();
      launchBall();
      state.serveCountdown = 0.9;
      floatingText(state.width / 2, state.paddle.y - 58, "SHIELD SAVE", "#28c7f5");
      burst(state.width / 2, state.paddle.y, "#28c7f5", 38);
      ping(520, 0.16, "square");
    } else {
      loseLife();
    }
  }
}

function collidePaddle(ball) {
  const p = state.paddle;
  const withinX = ball.x > p.x - p.width / 2 - ball.radius && ball.x < p.x + p.width / 2 + ball.radius;
  const withinY = ball.y + ball.radius > p.y - p.height / 2 && ball.y - ball.radius < p.y + p.height / 2;

  if (ball.vy > 0 && withinX && withinY) {
    const hit = (ball.x - p.x) / (p.width / 2);
    const angle = hit * 1.32;
    ball.vx = Math.sin(angle) * ball.speed;
    ball.vy = -Math.cos(angle) * ball.speed;
    ball.y = p.y - p.height / 2 - ball.radius - 1;
    if (state.glueTime > 0) {
      ball.stuck = true;
      ball.vx = 0;
      ball.vy = 0;
      state.ballHeld = true;
    }
    state.combo = 1;
    updateHud();
    burst(ball.x, ball.y, "#fff48a", 9);
    ping(180 + Math.abs(hit) * 180, 0.04, "triangle");
  }
}

function collideBricks(ball) {
  for (const brick of state.bricks) {
    const closestX = clamp(ball.x, brick.x, brick.x + brick.width);
    const closestY = clamp(ball.y, brick.y, brick.y + brick.height);
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    if (dx * dx + dy * dy > ball.radius * ball.radius) continue;

    if (brick.type === "wall") {
      bounceBallFromHit(ball, dx, dy);
      burst(ball.x, ball.y, "#fffaf3", 8);
      ping(180, 0.04, "triangle");
      return;
    }

    const beatScore = getBeatScore();
    const isBeatBonus = brick.type === "beat" && beatScore.perfect;
    brick.hits -= 1;
    addScore((beatScore.perfect ? 45 : 25) * state.combo * brickTypes[brick.type].score);
    state.combo = Math.min(12, state.combo + 1);
    state.shake = isBeatBonus ? 7 : beatScore.perfect ? 5 : 2.8;
    state.beatFlash = beatScore.perfect ? 1 : state.beatFlash;
    updateHud();
    burst(ball.x, ball.y, beatScore.perfect ? "#fff48a" : brick.color, isBeatBonus ? 44 : beatScore.perfect ? 30 : 16);
    if (isBeatBonus) {
      addScore(120 * state.combo);
      floatingText(ball.x, ball.y - 18, "BEAT BREAK", "#ffeb5c");
      updateHud();
    } else if (beatScore.perfect) {
      floatingText(ball.x, ball.y - 18, "PERFECT BEAT", "#ffeb5c");
    }
    ping(beatScore.perfect ? 820 : 360 + state.combo * 28, beatScore.perfect ? 0.07 : 0.045, "square");

    bounceBallFromHit(ball, dx, dy);

    if (brick.hits <= 0) {
      if (brick.type === "explosive") {
        explodeBrick(brick);
      }
      brickBreak(brick);
      if (Math.random() < 0.2) {
        spawnPickup(brick);
      }
    }

    state.bricks = state.bricks.filter((item) => item.hits > 0);
    if (clearableBrickCount() === 0) {
      nextLevel();
    }
    return;
  }
}

function bounceBallFromHit(ball, dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) {
    ball.vx *= -1;
  } else {
    ball.vy *= -1;
  }
}

function explodeBrick(source) {
  floatingText(source.x + source.width / 2, source.y, "BOOM", source.color);
  burst(source.x + source.width / 2, source.y + source.height / 2, source.color, 54);
  ping(120, 0.12, "sawtooth");
  const radius = source.width * 1.75;
  for (const brick of state.bricks) {
    if (brick === source || brick.hits <= 0) continue;
    const dx = brick.x + brick.width / 2 - (source.x + source.width / 2);
    const dy = brick.y + brick.height / 2 - (source.y + source.height / 2);
    if (dx * dx + dy * dy > radius * radius) continue;
    if (brick.type === "wall") continue;
    brick.hits -= brick.type === "armored" ? 1 : 2;
    addScore(18 * state.combo);
    burst(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 10);
    if (brick.hits <= 0) {
      brickBreak(brick);
      if (Math.random() < 0.08) spawnPickup(brick);
    }
  }
  updateHud();
}

function brickBreak(brick) {
  state.brickBreaks.push({
    x: brick.x + brick.width / 2,
    y: brick.y + brick.height / 2,
    width: brick.width,
    height: brick.height,
    color: brick.color,
    life: 0.12,
    maxLife: 0.12,
  });
}

function clearableBrickCount() {
  return state.bricks.filter((brick) => brick.type !== "wall").length;
}

function spawnPickup(brick) {
  state.pickups.push({
    x: brick.x + brick.width / 2,
    y: brick.y + brick.height / 2,
    vy: 150,
    type: randomPickupType(),
    color: brick.color,
  });
}

function movePickups(dt) {
  const p = state.paddle;
  for (const pickup of state.pickups) {
    pickup.y += pickup.vy * dt;
    const caught =
      pickup.y > p.y - 18 &&
      pickup.y < p.y + 20 &&
      pickup.x > p.x - p.width / 2 &&
      pickup.x < p.x + p.width / 2;

    if (caught) {
      pickup.caught = true;
      if (pickup.type === "wide") {
        p.width = Math.min(p.width + 28, Math.min(190, state.width * 0.28));
        floatingText(pickup.x, pickup.y - 28, "WIDE", pickup.color);
      } else if (pickup.type === "narrow") {
        p.width = Math.max(76, p.width - 28);
        floatingText(pickup.x, pickup.y - 28, "NARROW", "#ff4f79");
      } else if (pickup.type === "multi") {
        splitBall();
        floatingText(pickup.x, pickup.y - 28, "MULTI", pickup.color);
      } else if (pickup.type === "shield") {
        state.shieldTime = 10;
        floatingText(pickup.x, pickup.y - 28, "SHIELD", pickup.color);
      } else if (pickup.type === "laser") {
        state.laserTime = 7;
        state.laserCooldown = 0;
        floatingText(pickup.x, pickup.y - 28, "LASER", pickup.color);
      } else if (pickup.type === "glue") {
        state.glueTime = 9;
        floatingText(pickup.x, pickup.y - 28, "GLUE", pickup.color);
      } else if (pickup.type === "fast") {
        fastBalls();
        floatingText(pickup.x, pickup.y - 28, "FAST", "#ff4f79");
      } else {
        slowBalls();
        state.slowTime = 7;
        floatingText(pickup.x, pickup.y - 28, "SLOW", pickup.color);
      }
      addScore(150);
      burst(pickup.x, pickup.y, pickup.color, 24);
      ping(720, 0.09, "sawtooth");
      updateHud();
    }
  }
  state.pickups = state.pickups.filter((pickup) => !pickup.caught && pickup.y < state.height + 30);
}

function updateLasers(dt) {
  state.laserCooldown = Math.max(0, state.laserCooldown - dt);
  if (state.laserTime > 0 && state.laserCooldown <= 0) {
    state.laserCooldown = 0.22;
    const p = state.paddle;
    state.lasers.push(
      { x: p.x - p.width * 0.32, y: p.y - 14, vy: -720, color: "#ff4f79" },
      { x: p.x + p.width * 0.32, y: p.y - 14, vy: -720, color: "#28c7f5" },
    );
    ping(980, 0.025, "square");
  }

  for (const laser of state.lasers) {
    laser.y += laser.vy * dt;
    for (const brick of state.bricks) {
      if (laser.used || brick.type === "wall") continue;
      const hit = laser.x > brick.x && laser.x < brick.x + brick.width && laser.y > brick.y && laser.y < brick.y + brick.height;
      if (!hit) continue;
      laser.used = true;
      brick.hits -= 1;
      addScore(12 * state.combo * brickTypes[brick.type].score);
      burst(laser.x, laser.y, laser.color, 10);
      if (brick.hits <= 0) {
        if (brick.type === "explosive") explodeBrick(brick);
        brickBreak(brick);
        if (Math.random() < 0.08) spawnPickup(brick);
      }
      updateHud();
    }
  }

  state.lasers = state.lasers.filter((laser) => !laser.used && laser.y > -30);
  state.bricks = state.bricks.filter((brick) => brick.hits > 0);
  if (state.running && clearableBrickCount() === 0) nextLevel();
}

function splitBall() {
  const extra = [];
  const activeBalls = state.balls.filter((ball) => !ball.stuck).slice(0, 2);
  if (!activeBalls.length) {
    floatingText(state.paddle.x, state.paddle.y - 58, "RELEASE FIRST", "#ffeb5c");
    return;
  }
  for (const ball of activeBalls) {
    extra.push({ ...ball, vx: -ball.vx * 0.9 + 90, vy: ball.vy * 0.96, trail: [] });
  }
  state.balls.push(...extra);
}

function fastBalls() {
  for (const ball of state.balls) {
    const current = Math.hypot(ball.vx, ball.vy);
    const nextSpeed = Math.min((ball.baseSpeed || ball.speed) * 1.28, 980);
    ball.baseSpeed = Math.max(ball.baseSpeed || ball.speed, nextSpeed / 1.28);
    ball.speed = nextSpeed;
    if (current > 0 && !ball.stuck) {
      const ratio = nextSpeed / current;
      ball.vx *= ratio;
      ball.vy *= ratio;
    }
  }
}

function slowBalls() {
  for (const ball of state.balls) {
    if (ball.slowed) continue;
    ball.vx *= 0.78;
    ball.vy *= 0.78;
    ball.speed *= 0.82;
    ball.slowed = true;
  }
}

function restoreSlowBalls() {
  for (const ball of state.balls) {
    if (!ball.slowed) continue;
    const speed = ball.baseSpeed || ball.speed;
    const current = Math.hypot(ball.vx, ball.vy);
    if (current > 0) {
      const ratio = speed / current;
      ball.vx *= ratio;
      ball.vy *= ratio;
    }
    ball.speed = speed;
    ball.slowed = false;
  }
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 360 * dt;
    particle.life -= dt;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function updateBrickBreaks(dt) {
  for (const brickBreak of state.brickBreaks) {
    brickBreak.life -= dt;
  }
  state.brickBreaks = state.brickBreaks.filter((brickBreak) => brickBreak.life > 0);
}

function updateFloaters(dt) {
  for (const floater of state.floaters) {
    floater.y -= 58 * dt;
    floater.life -= dt;
  }
  state.floaters = state.floaters.filter((floater) => floater.life > 0);
}

function updatePowers(dt) {
  const previousPower = activePowerText();
  const hadSlow = state.slowTime > 0;
  state.slowTime = Math.max(0, state.slowTime - dt);
  state.shieldTime = Math.max(0, state.shieldTime - dt);
  state.laserTime = Math.max(0, state.laserTime - dt);
  state.glueTime = Math.max(0, state.glueTime - dt);
  if (hadSlow && state.slowTime <= 0) restoreSlowBalls();
  if (previousPower !== activePowerText()) updateHud();
}

function loseLife() {
  state.lives -= 1;
  state.combo = 1;
  updateHud();
  state.paddle.width = Math.max(92, Math.min(154, state.width * 0.18));

  if (state.lives <= 0) {
    state.running = false;
    state.paused = false;
    state.overlayMode = "gameover";
    stopMusic();
    showOverlay("Game over", `Score final : ${state.score}. Record : ${state.best}. Niveau max : ${state.bestLevel}. Relance une partie et vise le combo parfait.`, "Rejouer");
    descendingChord();
    ping(95, 0.18, "sawtooth");
    return;
  }

  launchBall();
  state.serveCountdown = 1.1;
  floatingText(state.width / 2, state.paddle.y - 58, "READY", "#ffeb5c");
  descendingChord();
}

function nextLevel() {
  state.level += 1;
  if (state.level > state.bestLevel) {
    state.bestLevel = state.level;
    saveBestLevel(state.bestLevel);
  }
  state.combo = Math.min(12, state.combo + 2);
  state.paddle.width = Math.max(92, Math.min(154, state.width * 0.18));
  rotateThemeForLevel();
  buildBricks();
  floatingText(state.width / 2, state.height * 0.34, `LEVEL ${state.level}`, "#ffeb5c");
  launchBall();
  updateHud();
}

function rotateThemeForLevel() {
  if (state.themeLocked) return;
  const names = Object.keys(themes);
  state.theme = names[(state.level - 1) % names.length];
  themeButtons.forEach((button) => button.classList.toggle("is-selected", button.dataset.theme === state.theme));
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, state.width, state.height);
  const pulse = 0.5 + Math.sin(state.beat * Math.PI * 2 * 1.4) * 0.5;
  const shakeX = (Math.random() - 0.5) * state.shake;
  const shakeY = (Math.random() - 0.5) * state.shake;
  ctx.translate(shakeX, shakeY);

  drawBackground(pulse);
  drawGrid(pulse);
  drawFeverAura();
  drawBricks(pulse);
  drawBrickBreaks();
  drawBeatFlash();
  drawPickups();
  drawShield(pulse);
  drawPaddle(pulse);
  drawLasers();
  drawBalls(pulse);
  drawParticles();
  drawFloaters();
  drawServeHint();

  ctx.restore();
}

function drawServeHint() {
  if (!state.running || state.paused || (!state.ballHeld && state.serveCountdown <= 0)) return;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 18px Inter, sans-serif";
  ctx.fillStyle = "#fffaf3";
  ctx.shadowColor = "#ffeb5c";
  ctx.shadowBlur = 14;
  const text = state.serveCountdown > 0 ? Math.ceil(state.serveCountdown) : "CLIC / ESPACE";
  ctx.fillText(text, state.width / 2, state.paddle.y - 84);
  ctx.restore();
}

function drawBackground(pulse) {
  const theme = themes[state.theme];
  const gradient = ctx.createLinearGradient(0, 0, state.width, state.height);
  gradient.addColorStop(0, shade(theme.a, -72));
  gradient.addColorStop(0.5, "#08080d");
  gradient.addColorStop(1, shade(theme.b, -82));
  ctx.fillStyle = gradient;
  ctx.fillRect(-20, -20, state.width + 40, state.height + 40);

  if (state.theme === "sunset") {
    drawSunsetBackground(theme, pulse);
  } else if (state.theme === "matrix") {
    drawMatrixBackground(theme);
  } else if (state.theme === "void") {
    drawVoidBackground(theme, pulse);
  } else {
    drawNeonBackground(theme, pulse);
  }
}

function drawNeonBackground(theme, pulse) {
  ctx.save();
  ctx.globalAlpha = 0.22 + pulse * 0.08;
  for (let i = 0; i < 5; i += 1) {
    const x = ((state.beat * 22 + i * state.width * 0.24) % (state.width + 180)) - 90;
    const y = state.height * (0.18 + i * 0.13);
    ctx.strokeStyle = i % 2 ? theme.a : theme.b;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 160, y + 44);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSunsetBackground(theme, pulse) {
  ctx.save();
  ctx.globalAlpha = 0.24 + pulse * 0.1;
  ctx.fillStyle = theme.b;
  ctx.beginPath();
  ctx.arc(state.width * 0.72, state.height * 0.26, Math.min(state.width, state.height) * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = theme.a;
  for (let y = state.height * 0.38; y < state.height; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(state.beat * 2 + y) * 8);
    ctx.lineTo(state.width, y + Math.cos(state.beat * 2 + y) * 8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMatrixBackground(theme) {
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = theme.a;
  ctx.font = "700 13px monospace";
  for (let x = 12; x < state.width; x += 34) {
    const offset = (state.beat * 70 + x * 1.7) % (state.height + 80);
    for (let y = -80; y < state.height; y += 86) {
      ctx.fillText(Math.random() > 0.5 ? "1" : "0", x, y + offset);
    }
  }
  ctx.restore();
}

function drawVoidBackground(theme, pulse) {
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = theme.a;
  ctx.lineWidth = 2;
  const rings = 5;
  for (let i = 0; i < rings; i += 1) {
    ctx.beginPath();
    ctx.arc(
      state.width * 0.5,
      state.height * 0.42,
      70 + i * 54 + pulse * 14,
      state.beat * 0.4 + i,
      state.beat * 0.4 + i + Math.PI * 1.35,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawFeverAura() {
  if (state.combo < 5 && state.feverFlash <= 0) return;
  const intensity = Math.max(state.feverFlash, Math.min(0.55, (state.combo - 4) / 12));
  ctx.save();
  ctx.globalAlpha = intensity * 0.22;
  ctx.strokeStyle = state.combo >= 10 ? "#ff4f79" : "#28c7f5";
  ctx.lineWidth = 14;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 24;
  ctx.strokeRect(10, 10, state.width - 20, state.height - 20);
  ctx.restore();
}

function drawGrid(pulse) {
  const theme = themes[state.theme];
  const spacing = 44;
  ctx.save();
  ctx.globalAlpha = 0.12 + pulse * 0.06;
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  for (let x = (state.beat * 18) % spacing; x < state.width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.height);
    ctx.stroke();
  }
  for (let y = (state.beat * 28) % spacing; y < state.height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBricks(pulse) {
  for (const brick of state.bricks) {
    const isBeat = brick.type === "beat";
    const localPulse = 0.88 + Math.sin((state.beat + brick.phase) * Math.PI * 2) * (isBeat ? 0.16 : 0.07);
    const alpha = brick.hits / brick.maxHits;
    roundRect(brick.x, brick.y, brick.width, brick.height, 7);
    ctx.fillStyle = shade(brick.color, alpha < 1 ? -24 : 0);
    ctx.shadowColor = brick.color;
    ctx.shadowBlur = (isBeat ? 20 : 12) + pulse * 10;
    ctx.globalAlpha = localPulse;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    drawBrickMark(brick, pulse);
  }
}

function drawBrickMark(brick, pulse) {
  if (brick.type === "normal") return;
  const centerX = brick.x + brick.width / 2;
  const centerY = brick.y + brick.height / 2;

  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = brick.type === "beat" ? "#08080d" : "#fffaf3";
  ctx.strokeStyle = "rgba(8, 8, 13, 0.55)";
  ctx.lineWidth = 2;

  if (brick.type === "armored") {
    for (let x = brick.x + 10; x < brick.x + brick.width - 8; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, brick.y + 5);
      ctx.lineTo(x - 8, brick.y + brick.height - 5);
      ctx.stroke();
    }
  } else if (brick.type === "explosive") {
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (brick.type === "mover") {
    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY - 7);
    ctx.lineTo(centerX + 8, centerY);
    ctx.lineTo(centerX - 8, centerY + 7);
    ctx.closePath();
    ctx.fill();
  } else if (brick.type === "beat") {
    ctx.font = "900 16px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("*", centerX, centerY + 1);
  } else if (brick.type === "wall") {
    ctx.strokeStyle = "#fffaf3";
    ctx.lineWidth = 3;
    for (let x = brick.x + 7; x < brick.x + brick.width; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, brick.y + 4);
      ctx.lineTo(x - 10, brick.y + brick.height - 4);
      ctx.stroke();
    }
  }

  if (brick.hits > 1) {
    ctx.globalAlpha = 0.92;
    ctx.font = "900 11px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#08080d";
    ctx.fillText(String(brick.hits), brick.x + brick.width - 7, brick.y + 5);
  }
  ctx.restore();
}

function drawPaddle(pulse) {
  const p = state.paddle;
  const squash = clamp(Math.abs(p.velocity) / 1300, 0, 0.18);
  const width = p.width * (1 + squash);
  const height = p.height * (1 - squash * 0.5);
  roundRect(p.x - width / 2, p.y - height / 2, width, height, 8);
  const gradient = ctx.createLinearGradient(p.x - width / 2, p.y, p.x + width / 2, p.y);
  gradient.addColorStop(0, "#28c7f5");
  gradient.addColorStop(0.5, "#fffaf3");
  gradient.addColorStop(1, "#ff4f79");
  ctx.fillStyle = gradient;
  ctx.shadowColor = "#fffaf3";
  ctx.shadowBlur = 14 + pulse * 12;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawShield(pulse) {
  if (state.shieldTime <= 0) return;
  const y = state.paddle.y + 32;
  ctx.save();
  ctx.globalAlpha = 0.36 + pulse * 0.24;
  ctx.strokeStyle = "#28c7f5";
  ctx.lineWidth = 5;
  ctx.shadowColor = "#28c7f5";
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.moveTo(34, y);
  ctx.lineTo(state.width - 34, y);
  ctx.stroke();
  ctx.restore();
}

function drawBalls(pulse) {
  for (const ball of state.balls) {
    for (let i = ball.trail.length - 1; i >= 0; i -= 1) {
      const point = ball.trail[i];
      const alpha = (ball.trail.length - i) / ball.trail.length;
      ctx.globalAlpha = alpha * 0.22;
      ctx.beginPath();
      ctx.arc(point.x, point.y, ball.radius * alpha, 0, Math.PI * 2);
      ctx.fillStyle = "#ffeb5c";
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    const stuckPulse = ball.stuck ? 2.8 + pulse * 3.5 : pulse * 1.6;
    ctx.arc(ball.x, ball.y, ball.radius + stuckPulse, 0, Math.PI * 2);
    ctx.fillStyle = "#fffaf3";
    ctx.shadowColor = "#ffeb5c";
    ctx.shadowBlur = ball.stuck ? 30 + pulse * 12 : 20;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawLasers() {
  ctx.save();
  for (const laser of state.lasers) {
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 11;
    ctx.strokeStyle = laser.color;
    ctx.shadowColor = laser.color;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.moveTo(laser.x, laser.y + 16);
    ctx.lineTo(laser.x, laser.y - 16);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 4;
    ctx.strokeStyle = laser.color;
    ctx.shadowColor = laser.color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(laser.x, laser.y + 12);
    ctx.lineTo(laser.x, laser.y - 12);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPickups() {
  for (const pickup of state.pickups) {
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.rotate(state.beat * 5);
    roundRect(-13, -13, 26, 26, 6);
    ctx.fillStyle = pickupColor(pickup.type, pickup.color);
    ctx.shadowColor = pickup.color;
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#08080d";
    ctx.font = "900 14px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pickupLabel(pickup.type), 0, 1);
    ctx.restore();
  }
}

function drawBrickBreaks() {
  ctx.save();
  for (const brickBreak of state.brickBreaks) {
    const progress = brickBreak.life / brickBreak.maxLife;
    const scale = 0.82 + progress * 0.18;
    ctx.save();
    ctx.globalAlpha = progress;
    ctx.translate(brickBreak.x, brickBreak.y);
    roundRect((-brickBreak.width * scale) / 2, (-brickBreak.height * scale) / 2, brickBreak.width * scale, brickBreak.height * scale, 7);
    ctx.fillStyle = brickBreak.color;
    ctx.shadowColor = brickBreak.color;
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fillStyle = particle.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 18px Inter, sans-serif";
  for (const floater of state.floaters) {
    ctx.globalAlpha = Math.max(0, floater.life / floater.maxLife);
    ctx.fillStyle = floater.color;
    ctx.shadowColor = floater.color;
    ctx.shadowBlur = 16;
    ctx.fillText(floater.text, floater.x, floater.y);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawBeatFlash() {
  if (state.beatFlash <= 0) return;
  ctx.save();
  ctx.globalAlpha = state.beatFlash * 0.22;
  ctx.fillStyle = "#ffeb5c";
  ctx.fillRect(0, 0, state.width, state.height);
  ctx.restore();
}

function burst(x, y, color, amount) {
  for (let i = 0; i < amount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 360;
    const life = 0.35 + Math.random() * 0.45;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 4,
      color,
      life,
      maxLife: life,
    });
  }
}

function updateHud() {
  if (state.score > state.best) {
    state.best = state.score;
    saveBestScore(state.best);
  }
  const previousScore = scoreEl.textContent;
  scoreEl.textContent = String(state.score);
  if (previousScore !== String(state.score)) flashScore();
  comboEl.textContent = `x${state.combo}`;
  livesEl.textContent = String(state.lives);
  bestEl.textContent = String(state.best);
  powerEl.textContent = activePowerText();
  updateComboTier();
  updateMusicIntensity();
}

function addScore(amount) {
  state.score += Math.round(amount * difficulties[state.difficulty].score);
}

function flashScore() {
  scoreEl.classList.remove("score-pop");
  void scoreEl.offsetWidth;
  scoreEl.classList.add("score-pop");
}

function updateComboTier() {
  const tier = state.combo >= 10 ? 2 : state.combo >= 5 ? 1 : 0;
  if (tier <= state.lastComboTier) return;
  state.lastComboTier = tier;
  state.feverFlash = 1;
  floatingText(state.width / 2, state.height * 0.48, tier === 2 ? "HYPER COMBO" : "COMBO FEVER", tier === 2 ? "#ff4f79" : "#28c7f5");
  ping(tier === 2 ? 980 : 760, 0.12, "square");
}

function getBeatScore() {
  const step = (state.beat * tracks[state.track].bpm * 4) / 60;
  const phase = step - Math.floor(step);
  const distance = Math.min(phase, 1 - phase);
  return { perfect: distance < 0.14 };
}

function randomPickupType() {
  const roll = Math.random();
  if (roll < 0.18) return "wide";
  if (roll < 0.34) return "multi";
  if (roll < 0.48) return "shield";
  if (roll < 0.62) return "laser";
  if (roll < 0.74) return "glue";
  if (roll < 0.86) return "slow";
  if (roll < 0.94) return "narrow";
  return "fast";
}

function pickupLabel(type) {
  if (type === "wide") return "<>";
  if (type === "multi") return "x3";
  if (type === "shield") return "[]";
  if (type === "laser") return "||";
  if (type === "glue") return "@";
  if (type === "narrow") return "><";
  if (type === "fast") return ">>";
  return "~";
}

function pickupColor(type, fallback) {
  if (type === "wide") return "#ffeb5c";
  if (type === "multi") return "#28c7f5";
  if (type === "shield") return "#25d07f";
  if (type === "laser") return "#ff4f79";
  if (type === "glue") return "#9a6bff";
  if (type === "slow") return "#37d7b2";
  if (type === "narrow") return "#ff4f79";
  if (type === "fast") return "#ff7a3d";
  return fallback;
}

function floatingText(x, y, text, color) {
  state.floaters.push({ x, y, text, color, life: 0.82, maxLife: 0.82 });
}

function activePowerText() {
  const active = [];
  if (state.laserTime > 0) active.push("LAS");
  if (state.glueTime > 0) active.push("GLU");
  if (state.shieldTime > 0) active.push("SHD");
  if (state.slowTime > 0) active.push("SLOW");
  return active.length ? active.join("+") : "-";
}

function readBestScore() {
  try {
    return Number(localStorage.getItem("pulse-breaker-best") || 0);
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    localStorage.setItem("pulse-breaker-best", String(score));
  } catch {
    // Le jeu continue meme si le stockage local est bloque.
  }
}

function readBestLevel() {
  try {
    return Number(localStorage.getItem("pulse-breaker-best-level") || 1);
  } catch {
    return 1;
  }
}

function saveBestLevel(level) {
  try {
    localStorage.setItem("pulse-breaker-best-level", String(level));
  } catch {
    // Le jeu continue meme si le stockage local est bloque.
  }
}

function showOverlay(title, copy, button) {
  overlayTitle.textContent = title;
  overlayCopy.textContent = copy;
  startButton.textContent = button;
  difficultyPanel.hidden = state.overlayMode === "pause";
  overlay.classList.remove("hidden");
}

function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused;
  if (state.paused) {
    state.overlayMode = "pause";
    stopMusic();
    showOverlay("Pause", `Score : ${state.score} | Niveau : ${state.level} | Combo : x${state.combo}. Reprends quand tu veux.`, "Reprendre");
  } else {
    state.overlayMode = "game";
    overlay.classList.add("hidden");
    startMusic();
  }
}

function ping(frequency, duration, type) {
  if (!audioContext || !sfxGain) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(sfxGain);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration + 0.02);
}

function descendingChord() {
  if (!audioContext || !sfxGain) return;
  [330, 247, 196].forEach((frequency, index) => {
    const time = audioContext.currentTime + index * 0.07;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.12, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    oscillator.connect(gain).connect(sfxGain);
    oscillator.start(time);
    oscillator.stop(time + 0.18);
  });
}

async function ensureAudio() {
  audioContext ||= new AudioContext();
  if (!musicGain) {
    musicGain = audioContext.createGain();
    musicGain.gain.value = musicMuted ? 0 : 0.28;
    musicGain.connect(audioContext.destination);
  }
  if (!sfxGain) {
    sfxGain = audioContext.createGain();
    sfxGain.gain.value = 0.82 * state.sfxLevel;
    sfxGain.connect(audioContext.destination);
  }
  if (audioContext.state === "suspended") await audioContext.resume();
}

function startMusic() {
  if (!audioContext || !musicGain || musicTimer || musicMuted) return;
  musicGain.gain.setTargetAtTime(currentMusicVolume(), audioContext.currentTime, 0.04);
  musicStep = 0;
  nextMusicTime = audioContext.currentTime + 0.04;
  musicTimer = window.setInterval(scheduleMusic, 25);
  scheduleMusic();
}

function restartMusic() {
  const wasPlaying = Boolean(musicTimer);
  stopMusic();
  if ((wasPlaying || state.running) && !state.paused) startMusic();
}

function stopMusic() {
  if (!musicTimer) return;
  window.clearInterval(musicTimer);
  musicTimer = null;
}

function scheduleMusic() {
  if (!audioContext || !musicGain) return;
  const secondsPerStep = 60 / tracks[state.track].bpm / 4;
  while (nextMusicTime < audioContext.currentTime + 0.16) {
    scheduleMusicStep(musicStep, nextMusicTime);
    nextMusicTime += secondsPerStep;
    musicStep = (musicStep + 1) % 64;
  }
}

function scheduleMusicStep(step, time) {
  const track = tracks[state.track];
  const patternStep = step % 16;
  const section = Math.floor(step / 16) % 4;
  const bass = track.bass[patternStep];

  if (track.kick.includes(patternStep)) playDrum(time, state.track === "drive" ? 112 : 95, 0.16, "kick");
  if (track.snare.includes(patternStep)) playDrum(time, state.track === "dream" ? 160 : 190, 0.07, "snare");
  if (patternStep % (state.track === "dream" ? 4 : 2) === 0) playNoise(time, 0.025, patternStep % 4 === 0 ? 0.09 : 0.045);

  if (bass) {
    playTone(bass * (section === 2 && patternStep > 7 ? 1.5 : 1), time, state.track === "dream" ? 0.14 : 0.095, "square", state.track === "drive" ? 0.15 : 0.13);
  }

  if (patternStep % (state.track === "drive" ? 1 : 2) === 1 || (state.track === "drive" && patternStep % 2 === 0)) {
    const note = track.arp[(step + section * 2) % track.arp.length] * (section === 3 ? 2 : 1);
    playTone(note, time + 0.012, state.track === "dream" ? 0.09 : 0.055, state.track === "dream" ? "triangle" : "square", state.track === "drive" ? 0.055 : 0.07);
  }
}

function playTone(frequency, time, duration, type, volume) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, time);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  oscillator.connect(gain).connect(musicGain);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.015);
}

function playDrum(time, frequency, duration, kind) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = kind === "kick" ? "square" : "triangle";
  oscillator.frequency.setValueAtTime(frequency, time);
  oscillator.frequency.exponentialRampToValueAtTime(kind === "kick" ? 42 : 120, time + duration);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(kind === "kick" ? 0.18 : 0.11, time + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  oscillator.connect(gain).connect(musicGain);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.02);
}

function playNoise(time, duration, volume) {
  const bufferSize = Math.floor(audioContext.sampleRate * duration);
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  source.connect(gain).connect(musicGain);
  source.start(time);
}

function toggleMusic() {
  musicMuted = !musicMuted;
  updateMusicButton();
  if (musicGain && audioContext) {
    const volume = musicMuted ? 0.0001 : currentMusicVolume();
    musicGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.025);
  }
  if (musicMuted) {
    stopMusic();
  } else if (state.running) {
    startMusic();
  }
}

function updateMusicIntensity() {
  if (!musicGain || !audioContext || musicMuted) return;
  musicGain.gain.setTargetAtTime(currentMusicVolume(), audioContext.currentTime, 0.08);
}

function currentMusicVolume() {
  return 0.24 + Math.min(0.14, state.combo * 0.012);
}

function updateMusicButton() {
  musicButton.classList.toggle("is-muted", musicMuted);
  musicButton.textContent = musicMuted ? "×" : "♪";
  musicButton.setAttribute("aria-label", musicMuted ? "Activer la musique" : "Couper la musique");
}

function cycleSfxLevel() {
  const levels = [1, 0.6, 0.25, 0];
  const index = levels.indexOf(state.sfxLevel);
  state.sfxLevel = levels[(index + 1) % levels.length];
  updateSfxButton();
  if (sfxGain && audioContext) {
    sfxGain.gain.setTargetAtTime(0.82 * state.sfxLevel, audioContext.currentTime, 0.03);
  }
}

function updateSfxButton() {
  sfxButton.textContent = `SFX ${Math.round(state.sfxLevel * 100)}%`;
}

function resetBestScore() {
  state.best = 0;
  state.bestLevel = 1;
  saveBestScore(0);
  saveBestLevel(1);
  bestEl.textContent = "0";
  floatingText(state.width / 2, state.height * 0.42, "RECORD RESET", "#ffeb5c");
}

function roundRect(x, y, width, height, radius) {
  if (!ctx.roundRect) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    return;
  }
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function shade(hex, amount) {
  const clean = hex.replace("#", "");
  const channels = [0, 2, 4].map((index) => clamp(parseInt(clean.slice(index, index + 2), 16) + amount, 0, 255));
  return `rgb(${channels.join(", ")})`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  state.keys.add(event.code);
  if (event.code === "Escape") {
    togglePause();
    return;
  }
  if (event.code === "Space" && state.paused) {
    event.preventDefault();
    togglePause();
  } else if (event.code === "Space" && state.running && state.ballHeld) {
    event.preventDefault();
    releaseHeldBalls();
  } else if (event.code === "Space" && !state.running) {
    event.preventDefault();
    ensureAudio().then(resetGame);
  }
});
window.addEventListener("keyup", (event) => state.keys.delete(event.code));
canvas.addEventListener("pointermove", (event) => {
  event.preventDefault();
  state.pointerX = event.clientX;
});
canvas.addEventListener("pointerleave", () => {
  state.pointerX = null;
});
canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (state.running && state.ballHeld) {
    releaseHeldBalls();
  } else if (!state.running) {
    ensureAudio().then(resetGame);
  }
});
startButton.addEventListener("click", async () => {
  await ensureAudio();
  if (state.paused) {
    togglePause();
  } else {
    resetGame();
  }
});
musicButton.addEventListener("click", async () => {
  await ensureAudio();
  toggleMusic();
});
difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (state.running) return;
    state.difficulty = button.dataset.difficulty;
    difficultyButtons.forEach((item) => item.classList.toggle("is-selected", item === button));
  });
});
themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.theme = button.dataset.theme;
    state.themeLocked = true;
    themeButtons.forEach((item) => item.classList.toggle("is-selected", item === button));
  });
});
trackButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.track = button.dataset.track;
    trackButtons.forEach((item) => item.classList.toggle("is-selected", item === button));
    if (audioContext && !musicMuted) restartMusic();
  });
});
sfxButton.addEventListener("click", () => {
  cycleSfxLevel();
});
resetBestButton.addEventListener("click", () => {
  resetBestScore();
});

resize();
updateHud();
updateMusicButton();
updateSfxButton();
requestAnimationFrame(update);
