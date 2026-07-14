(() => {
  const panels = Array.from(document.querySelectorAll("[data-home-panel]"));
  if (panels.length !== 5) return;

  const desktop = window.matchMedia("(min-width: 761px) and (pointer: fine)");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const wheelThreshold = 14;
  const gestureQuietDelay = 70;
  const maxQueuedSteps = panels.length - 1;
  const panelDuration = 580;
  let wheelTotal = 0;
  let gestureEndTimer = 0;
  let unlockTimer = 0;
  let animationFrame = 0;
  let isPaging = false;
  let gestureActive = false;
  let gestureConsumed = false;
  const pendingDirections = [];

  function nearestPanelIndex() {
    let nearest = 0;
    let nearestDistance = Infinity;
    panels.forEach((panel, index) => {
      const distance = Math.abs(panel.getBoundingClientRect().top);
      if (distance < nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  function moveOnePanel(direction) {
    const current = nearestPanelIndex();
    const next = Math.max(0, Math.min(panels.length - 1, current + direction));
    if (next === current) {
      runNextQueuedMove();
      return;
    }

    isPaging = true;
    if (reduceMotion.matches) {
      panels[next].scrollIntoView({ behavior: "auto", block: "start" });
      window.clearTimeout(unlockTimer);
      unlockTimer = window.setTimeout(() => {
        isPaging = false;
        runNextQueuedMove();
      }, 80);
      return;
    }

    const root = document.documentElement;
    const start = window.scrollY;
    const target = panels[next].offsetTop;
    const distance = target - start;
    const startedAt = performance.now();
    const previousBehavior = root.style.scrollBehavior;
    const previousSnap = root.style.scrollSnapType;

    root.style.scrollBehavior = "auto";
    root.style.scrollSnapType = "none";
    window.cancelAnimationFrame(animationFrame);

    function glide(now) {
      const progress = Math.min(1, (now - startedAt) / panelDuration);
      const eased = (1 - Math.cos(Math.PI * progress)) / 2;
      window.scrollTo(0, start + distance * eased);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(glide);
        return;
      }

      window.scrollTo(0, target);
      root.style.scrollBehavior = previousBehavior;
      root.style.scrollSnapType = previousSnap;
      isPaging = false;
      runNextQueuedMove();
    }

    animationFrame = window.requestAnimationFrame(glide);
  }

  function runNextQueuedMove() {
    if (isPaging || pendingDirections.length === 0) return;
    moveOnePanel(pendingDirections.shift());
  }

  function endGesture() {
    gestureActive = false;
    gestureConsumed = false;
    wheelTotal = 0;
  }

  window.addEventListener("wheel", (event) => {
    if (!desktop.matches || event.ctrlKey || event.deltaY === 0) return;

    event.preventDefault();
    if (!gestureActive) {
      gestureActive = true;
      gestureConsumed = false;
      wheelTotal = 0;
    }

    window.clearTimeout(gestureEndTimer);
    gestureEndTimer = window.setTimeout(endGesture, gestureQuietDelay);

    if (gestureConsumed) return;

    const multiplier = event.deltaMode === 1
      ? 16
      : event.deltaMode === 2
        ? window.innerHeight
        : 1;

    const delta = event.deltaY * multiplier;
    if (wheelTotal !== 0 && Math.sign(wheelTotal) !== Math.sign(delta)) {
      wheelTotal = 0;
    }
    wheelTotal += delta;

    if (Math.abs(wheelTotal) < wheelThreshold) return;

    const direction = wheelTotal > 0 ? 1 : -1;
    wheelTotal = 0;
    gestureConsumed = true;

    if (isPaging) {
      if (pendingDirections.length < maxQueuedSteps) {
        pendingDirections.push(direction);
      }
      return;
    }

    moveOnePanel(direction);
  }, { passive: false });
})();
