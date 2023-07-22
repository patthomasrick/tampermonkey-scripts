window._confetti = window._confetti || {};
window._confetti.config = {
  // Starting angle of the confetti blast in degrees. Lower is better for top.
  // Higher is better for bottom.
  angle: 60,

  // Standard deviation of the angle.
  spread: 10,

  // Starting velocity of the confetti in pixels per second. Bottom requires a
  // higher velocity.
  startVelocity: 90,

  // Standard deviation of the starting velocity.
  startVelocityStdev: 20,

  // Number of confetti pieces to create.
  elementCount: 200,

  // Drag coefficient. Higher means more drag. High means it behaves like paper.
  dragFriction: 0.8,

  // How far off the screen the confetti should go before getting removed.
  stopMargin: 10,

  // Size of the confetti pieces in pixels.
  particleSize: 10,

  // Standard deviation of the particle size.
  particleSizeStdev: 2,

  // Time scale between physics calculations. Lower is slower. Higher is faster.
  timeStep: 1 / 30,

  // Colors of the confetti pieces.
  colors: ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"],
};

// Hook CMD + SHIFT + ALT + C to confetti
$(document).keydown((e) => {
  if (e.keyCode == 67 && e.metaKey && e.shiftKey && e.altKey) {
    window.confetti();
  }
});

/**
 * Returns a random number from a normal distribution.
 *
 * @param {number} mean Mean of the normal distribution
 * @param {number} stdDev Standard deviation of the normal distribution
 * @returns {number} A random number from a normal distribution
 */
const randNorm = (mean, stdDev) => {
  // Ziggurat algorithm
  // https://en.wikipedia.org/wiki/Ziggurat_algorithm
  let x, y;
  do {
    x = Math.random() * 2 - 1;
    y = Math.random() * 2 - 1;
  } while (x * x + y * y > 1 || (x == 0 && y == 0));

  return (
    mean + stdDev * x * Math.sqrt((-2 * Math.log(x * x + y * y)) / (x * x))
  );
};

/**
 * CONFETTI BLAST!
 *
 * @returns {JQuery<HTMLElement>} The confetti div
 */
window.confetti = () => {
  console.log("confetti!");

  // Create a div for the confetti
  const confetti = $("#confetti").length
    ? $("#confetti")
    : $("<div id='confetti'></div>").css({
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 999999,
      });

  // Add the confetti div to the body
  $("body").append(confetti);

  // Start the confetti animation
  for (let i = 0; i < window._confetti.config.elementCount; i++) {
    window.confettiPiece(confetti, i % 2 == 0 ? "BOTTOM_LEFT" : "BOTTOM_RIGHT");
  }

  return confetti;
};

/**
 * Creates a new confetti piece and starts the animation.
 *
 * @param {JQuery<HTMLElement>} parent
 * @param {"TOP_LEFT" | "TOP_RIGHT" | "BOTTOM_LEFT" | "BOTTOM_RIGHT"} startCorner
 * @returns {JQuery<HTMLElement>} The confetti piece
 */
window.confettiPiece = (parent, startCorner = "BOTTOM_LEFT") => {
  const startTop =
    startCorner == "TOP_LEFT" || startCorner == "TOP_RIGHT" ? -5 : 105;
  const startLeft =
    startCorner == "TOP_LEFT" || startCorner == "BOTTOM_LEFT" ? -5 : 105;

  // Create a new confetti piece
  const confetti = $("<div class='confetti'></div>").css({
    position: "absolute",
    top: `${startTop}%`,
    left: `${startLeft}%`,
    width: `${randNorm(
      window._confetti.config.particleSize,
      window._confetti.config.particleSizeStdev
    )}px`,
    height: `${randNorm(
      window._confetti.config.particleSize,
      window._confetti.config.particleSizeStdev
    )}px`,
    backgroundColor:
      window._confetti.config.colors[
        Math.floor(Math.random() * window._confetti.config.colors.length)
      ],
    boxShadow: "5px 5px 30px 5px rgba(0, 0, 0, 0.1)",
    transform: "rotate(" + Math.floor(Math.random() * 360) + "deg)",
  });

  parent.append(confetti);

  // Start the animation
  // I want confetti to blast out of the corners.
  let angle = randNorm(
    window._confetti.config.angle,
    window._confetti.config.spread
  );
  switch (startCorner) {
    case "BOTTOM_LEFT":
      angle = -angle;
      break;
    case "BOTTOM_RIGHT":
      angle += 180;
      break;
    case "TOP_RIGHT":
      angle = 180 - angle;
      break;
  }
  const theta = (angle * Math.PI) / 180;
  const drag = window._confetti.config.dragFriction;
  let x = startLeft;
  let y = startTop;
  let _v0 = randNorm(
    window._confetti.config.startVelocity,
    window._confetti.config.startVelocityStdev
  );
  let vx = _v0 * Math.cos(theta);
  let vy = _v0 * Math.sin(theta);
  let rotation = Math.random() * 360;
  let rotationSpeed = randNorm(0, 60);

  const handle = setInterval(() => {
    const phys = projectileMotionWithDrag(
      x,
      y,
      vx,
      vy,
      drag,
      window._confetti.config.timeStep
    );
    x = phys.x;
    y = phys.y;
    vx = phys.vx;
    vy = phys.vy;

    rotation += rotationSpeed * window._confetti.config.timeStep;
    rotationSpeed *= 0.98;

    confetti.css({
      top: y + "%",
      left: x + "%",
      transform: `rotate(${rotation.toFixed(0)}deg)`,
    });

    // Stop the animation when the confetti is off the screen
    if (
      x < -window._confetti.config.stopMargin ||
      x > 100 + window._confetti.config.stopMargin ||
      y < -window._confetti.config.stopMargin ||
      y > 100 + window._confetti.config.stopMargin
    ) {
      clearInterval(handle);
      confetti.remove();
    }
  }, 10);

  return confetti;
};

/**
 * Calculates the final position and velocity of a projectile with drag.
 *
 * @param {number} x0
 * @param {number} y0
 * @param {number} vx0
 * @param {number} vy0
 * @param {number} theta
 * @param {number} drag
 * @param {number} t
 * @returns {{x: number, y: number, vx: number, vy: number}}
 */
const projectileMotionWithDrag = (x0, y0, vx0, vy0, drag, t) => {
  // Calculate drag force and direction.
  // Drag force is proportional to the square of the velocity.
  // Drag direction is opposite to the velocity.
  const dragForce = drag * Math.sqrt(vx0 * vx0 + vy0 * vy0);
  const dragAngle = Math.atan2(vy0, vx0) + Math.PI;
  const dragX = dragForce * Math.cos(dragAngle);
  const dragY = dragForce * Math.sin(dragAngle);

  // Calculate the horizontal and vertical components of the acceleration
  const ax = dragX;
  const ay = dragY + 9.8;

  // Calculate the horizontal and vertical components of the final velocity
  const vxf = vx0 + ax * t;
  const vyf = vy0 + ay * t;

  // Calculate the final horizontal and vertical positions
  const xf = x0 + vx0 * t + (ax * t * t) / 2;
  const yf = y0 + vy0 * t + (ay * t * t) / 2;

  return { x: xf, y: yf, vx: vxf, vy: vyf };
};
