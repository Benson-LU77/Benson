(() => {
  // ── Canvas setup ──────────────────────────────────
  const canvas = document.getElementById("siteWaterCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let W = 0, H = 0, dpr = 1, frameId = null;

  // ── Blob definitions ──────────────────────────────
  // c: [r,g,b]  fx/fy: base position (0–1 of W/H)
  // r: radius as fraction of min(W,H)
  // sx/sy: drift speed (rad/s)   px/py: phase offset (rad)
  // Dark blobs well below background, light blobs above — but same warm tone.
  // Background is ~rgb(242,241,237); darks go to ~100, lights to ~255.
  const blobs = [
    { fx: 0.12, fy: 0.22, r: 0.72, c: [100,  98,  93], sx: 0.32, sy: 0.24, px: 0.00, py: 0.80 },
    { fx: 0.80, fy: 0.20, r: 0.68, c: [255, 255, 253], sx: 0.20, sy: 0.36, px: 2.10, py: 0.30 },
    { fx: 0.50, fy: 0.82, r: 0.76, c: [108, 106, 101], sx: 0.28, sy: 0.18, px: 1.20, py: 4.50 },
  ];

  // ── Canvas resize ─────────────────────────────────
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ── Draw blobs ────────────────────────────────────
  function drawBlobs(time) {
    ctx.clearRect(0, 0, W, H);
    const base = Math.min(W, H);

    blobs.forEach(function (b) {
      const x   = b.fx * W + Math.sin(time * b.sx + b.px) * W * 0.13;
      const y   = b.fy * H + Math.cos(time * b.sy + b.py) * H * 0.11;
      const rad = b.r * base;

      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const rgb = b.c[0] + "," + b.c[1] + "," + b.c[2];
      g.addColorStop(0,    "rgba(" + rgb + ",0.62)");
      g.addColorStop(0.30, "rgba(" + rgb + ",0.38)");
      g.addColorStop(0.60, "rgba(" + rgb + ",0.14)");
      g.addColorStop(0.85, "rgba(" + rgb + ",0.03)");
      g.addColorStop(1,    "rgba(" + rgb + ",0)");

      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });
  }

  // ── Render loop ───────────────────────────────────
  function render(now) {
    drawBlobs(now / 1000);
    if (!reduceMotion) {
      frameId = requestAnimationFrame(render);
    }
  }

  // ── Image parallax on hover ───────────────────────
  function initMediaHover() {
    document.querySelectorAll(".water-media").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        const rect = el.getBoundingClientRect();
        const cx = (e.clientX - rect.left) / rect.width  - 0.5;
        const cy = (e.clientY - rect.top)  / rect.height - 0.5;
        el.style.setProperty("--media-x", (cx * 12).toFixed(1) + "px");
        el.style.setProperty("--media-y", (cy *  8).toFixed(1) + "px");
      }, { passive: true });
      el.addEventListener("pointerleave", function () {
        el.style.setProperty("--media-x", "0px");
        el.style.setProperty("--media-y", "0px");
      });
    });
  }

  // ── Scroll reveal ─────────────────────────────────
  function initReveal() {
    const revealEls = document.querySelectorAll(".water-reveal");
    if (reduceMotion) {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    const heroReveals = document.querySelectorAll(".water-hero .water-reveal");
    heroReveals.forEach(function (el, i) {
      el.style.transitionDelay = i * 120 + "ms";
    });
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { observer.observe(el); });
  }

  // ── Visibility / pagehide ─────────────────────────
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (frameId) { cancelAnimationFrame(frameId); frameId = null; }
    } else if (!reduceMotion && !frameId) {
      frameId = requestAnimationFrame(render);
    }
  });
  window.addEventListener("pagehide", function () {
    if (frameId) { cancelAnimationFrame(frameId); frameId = null; }
  });

  // ── Init ──────────────────────────────────────────
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas, { passive: true });

  if (!reduceMotion) {
    initMediaHover();
    frameId = requestAnimationFrame(render);
  } else {
    render(0);
  }

  initReveal();
})();
