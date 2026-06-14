const MODES = {
  easy: [15, 30, 60, 120, 240, 500, 1000],
  normal: [12, 24, 30, 60, 90, 120, 180, 240, 500, 1000],
  hard: [12, 15, 24, 30, 48, 60, 72, 90, 120, 144, 180, 240, 360, 500, 1000],
};

const TOTAL_ROUNDS = 10;
const leftCanvas = document.querySelector("#leftCanvas");
const rightCanvas = document.querySelector("#rightCanvas");
const answerButton = document.querySelector("#answerButton");
const nextButton = document.querySelector("#nextButton");
const restartButton = document.querySelector("#restartButton");
const modalRestartButton = document.querySelector("#modalRestartButton");
const minFpsInput = document.querySelector("#minFpsInput");
const maxFpsInput = document.querySelector("#maxFpsInput");
const feedback = document.querySelector("#feedback");
const leftReveal = document.querySelector("#leftReveal");
const rightReveal = document.querySelector("#rightReveal");
const scoreEl = document.querySelector("#score");
const roundEl = document.querySelector("#round");
const totalRoundsEl = document.querySelector("#totalRounds");
const resultModal = document.querySelector("#resultModal");
const resultScore = document.querySelector("#resultScore");
const resultDetail = document.querySelector("#resultDetail");
const segmentButtons = [...document.querySelectorAll(".segment")];
const choiceButtons = [...document.querySelectorAll(".choice")];
const lanes = [
  { canvas: leftCanvas, ctx: leftCanvas.getContext("2d") },
  { canvas: rightCanvas, ctx: rightCanvas.getContext("2d") },
];

let mode = "easy";
let minFps = 10;
let maxFps = 60;
let score = 0;
let round = 1;
let answered = false;
let selectedChoice = "left";
let current = makeRound();
let lastTime = performance.now();

totalRoundsEl.textContent = TOTAL_ROUNDS;

function pickPair(values) {
  const first = values[Math.floor(Math.random() * values.length)];
  const second = values[Math.floor(Math.random() * values.length)];
  return Math.random() > 0.5 ? [first, second] : [second, first];
}

function readFpsRange() {
  const rawMin = Number(minFpsInput.value);
  const rawMax = Number(maxFpsInput.value);
  minFps = Math.min(1000, Math.max(1, Number.isFinite(rawMin) ? Math.round(rawMin) : 10));
  maxFps = Math.min(1000, Math.max(1, Number.isFinite(rawMax) ? Math.round(rawMax) : 60));

  if (minFps > maxFps) {
    [minFps, maxFps] = [maxFps, minFps];
  }

  minFpsInput.value = String(minFps);
  maxFpsInput.value = String(maxFps);
}

function fpsCandidates() {
  const base = MODES[mode].filter((fps) => fps >= minFps && fps <= maxFps);
  const candidates = [...new Set([minFps, ...base, maxFps])].filter((fps) => fps >= minFps && fps <= maxFps);

  if (candidates.length >= 2) {
    return candidates.sort((a, b) => a - b);
  }

  return [minFps];
}

function makeRound() {
  const [leftFps, rightFps] = pickPair(fpsCandidates());
  return {
    leftFps,
    rightFps,
    seed: Math.random() * 1000,
  };
}

function correctChoice() {
  if (current.leftFps === current.rightFps) return "same";
  return current.leftFps > current.rightFps ? "left" : "right";
}

function choiceLabel(choice) {
  if (choice === "left") return "左";
  if (choice === "right") return "右";
  return "同じ";
}

function drawLane(lane, fps, now, phaseOffset) {
  const { canvas, ctx } = lane;
  const width = canvas.width;
  const height = canvas.height;
  const frameTime = 1000 / fps;
  const steppedTime = Math.floor(now / frameTime) * frameTime;
  const t = steppedTime / 1000;
  const centerY = height * 0.54;
  const trackLeft = 40;
  const trackRight = width - 40;
  const travel = trackRight - trackLeft;
  const wave = (Math.sin((t + phaseOffset) * Math.PI * 0.92) + 1) / 2;
  const x = trackLeft + wave * travel;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0e100f";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(244, 241, 232, 0.07)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i += 1) {
    const gx = (width / 8) * i;
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, height);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(244, 241, 232, 0.22)";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(trackLeft, centerY);
  ctx.lineTo(trackRight, centerY);
  ctx.stroke();

  ctx.fillStyle = "rgba(231, 184, 75, 0.16)";
  for (let i = 0; i < 3; i += 1) {
    const ghost = trackLeft + ((wave + i * 0.024) % 1) * travel;
    ctx.beginPath();
    ctx.arc(ghost, centerY, 17 - i * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#58c4a3";
  ctx.beginPath();
  ctx.arc(x, centerY, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f4f1e8";
  ctx.beginPath();
  ctx.arc(x - 6, centerY - 7, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(244, 241, 232, 0.72)";
  ctx.font = "600 18px Segoe UI, sans-serif";
  ctx.fillText("?", 18, 30);
}

function loop(now) {
  if (!document.hidden) {
    const delta = now - lastTime;
    lastTime = now;
    const adjustedNow = now + delta * 0.02;
    drawLane(lanes[0], current.leftFps, adjustedNow, current.seed);
    drawLane(lanes[1], current.rightFps, adjustedNow, current.seed);
  }
  requestAnimationFrame(loop);
}

function updateHeader() {
  scoreEl.textContent = score;
  roundEl.textContent = round;
}

function setChoice(choice) {
  selectedChoice = choice;
  choiceButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.choice === choice);
  });
}

function closeResultModal() {
  resultModal.hidden = true;
}

function showResultModal() {
  resultScore.textContent = `${score} / ${TOTAL_ROUNDS}`;
  resultDetail.textContent = `範囲: ${minFps}〜${maxFps} fps`;
  resultModal.hidden = false;
  modalRestartButton.focus();
}

function resetRound() {
  current = makeRound();
  answered = false;
  setChoice("left");
  leftReveal.textContent = "?";
  rightReveal.textContent = "?";
  feedback.textContent = "";
  feedback.className = "feedback";
  answerButton.disabled = false;
  nextButton.disabled = true;
  choiceButtons.forEach((button) => {
    button.disabled = false;
  });
}

function restart() {
  readFpsRange();
  closeResultModal();
  score = 0;
  round = 1;
  nextButton.textContent = "次へ";
  updateHeader();
  resetRound();
}

function answer() {
  if (answered) return;
  answered = true;

  const correct = correctChoice();
  const isCorrect = selectedChoice === correct;

  if (isCorrect) score += 1;
  updateHeader();

  leftReveal.textContent = `${current.leftFps} fps`;
  rightReveal.textContent = `${current.rightFps} fps`;
  feedback.textContent = isCorrect
    ? "正解"
    : `不正解  正解は「${choiceLabel(correct)}」です。左 ${current.leftFps} fps / 右 ${current.rightFps} fps`;
  feedback.className = `feedback ${isCorrect ? "good" : "bad"}`;
  answerButton.disabled = true;
  nextButton.disabled = false;
  choiceButtons.forEach((button) => {
    button.disabled = true;
  });

  if (round >= TOTAL_ROUNDS) {
    nextButton.textContent = "もう一度";
    showResultModal();
  }
}

function next() {
  if (round >= TOTAL_ROUNDS) {
    restart();
    return;
  }
  round += 1;
  updateHeader();
  resetRound();
}

segmentButtons.forEach((button) => {
  button.addEventListener("click", () => {
    mode = button.dataset.mode;
    segmentButtons.forEach((item) => item.classList.toggle("active", item === button));
    restart();
  });
});

[minFpsInput, maxFpsInput].forEach((input) => {
  input.addEventListener("change", restart);
});

choiceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!answered) setChoice(button.dataset.choice);
  });
});

answerButton.addEventListener("click", answer);
nextButton.addEventListener("click", next);
restartButton.addEventListener("click", restart);
modalRestartButton.addEventListener("click", restart);

restart();
requestAnimationFrame(loop);
