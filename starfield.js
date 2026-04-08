const STAR_COUNT = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) ? 40 : 80;
const MIN_RADIUS = 0.3;
const MAX_RADIUS = 0.8;
const MIN_OPACITY = 0.08;
const MAX_OPACITY = 0.18;

let stars = [];
let initialized = false;

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function getCanvasBounds(canvas) {
  return {
    width: canvas.clientWidth || window.innerWidth,
    height: canvas.clientHeight || window.innerHeight,
  };
}

function initStars(canvas) {
  const bounds = getCanvasBounds(canvas);

  stars = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * bounds.width,
    y: Math.random() * bounds.height,
    radius: randomInRange(MIN_RADIUS, MAX_RADIUS),
    opacity: randomInRange(MIN_OPACITY, MAX_OPACITY),
  }));

  initialized = true;
}

export function drawStarfield(ctx) {
  if (!ctx || !ctx.canvas) {
    return;
  }

  if (!initialized) {
    initStars(ctx.canvas);
  }

  for (const star of stars) {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
    ctx.fill();
  }
}

export function createStarfield(canvas) {
  const context = canvas.getContext('2d');

  function start() {
    if (!initialized) {
      initStars(canvas);
    }
    drawStarfield(context);
  }

  return { start, draw: () => drawStarfield(context) };
}
