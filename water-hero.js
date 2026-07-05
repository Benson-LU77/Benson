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
    { fx: 0.12, fy: 0.22, r: 0.72, c: [100,  98,  93], sx: 0.16, sy: 0.12, px: 0.00, py: 0.80, bp: 0.0 },
    { fx: 0.80, fy: 0.20, r: 0.68, c: [255, 255, 253], sx: 0.10, sy: 0.18, px: 2.10, py: 0.30, bp: 2.1 },
    { fx: 0.50, fy: 0.82, r: 0.76, c: [108, 106, 101], sx: 0.14, sy: 0.09, px: 1.20, py: 4.50, bp: 4.2 },
  ];

  // ── Grain tile (breaks gradient banding) ──────────
  const grainTile = (() => {
    const t = document.createElement("canvas");
    t.width = 128; t.height = 128;
    const tctx = t.getContext("2d");
    const d = tctx.createImageData(128, 128);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      d.data[i] = v; d.data[i + 1] = v; d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    tctx.putImageData(d, 0, 0);
    return t;
  })();
  let grainPattern = null;

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
      const breathe = 1 + 0.05 * Math.sin(time * 0.09 + b.bp);
      const rad = b.r * base * breathe;

      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const rgb = b.c[0] + "," + b.c[1] + "," + b.c[2];
      g.addColorStop(0,    "rgba(" + rgb + ",0.50)");
      g.addColorStop(0.35, "rgba(" + rgb + ",0.32)");
      g.addColorStop(0.65, "rgba(" + rgb + ",0.12)");
      g.addColorStop(0.88, "rgba(" + rgb + ",0.03)");
      g.addColorStop(1,    "rgba(" + rgb + ",0)");

      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });

    // Grain overlay
    if (!grainPattern) grainPattern = ctx.createPattern(grainTile, "repeat");
    ctx.globalAlpha = 0.028;
    ctx.fillStyle = grainPattern;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
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

  // ── Project panel: tracking media + accordion ────
  function initProjectPanel() {
    const media = document.querySelector(".project-panel__frame img");
    const mediaBox = document.querySelector(".project-panel__media");
    const list = document.querySelector(".project-panel__list");
    const rows = document.querySelectorAll(".project-panel__row");
    if (!media || !mediaBox || !list || !rows.length) return;

    let pendingSwap = null;
    let targetRow = document.querySelector(".project-panel__row.is-active") || rows[0];
    let curY = 0, trackId = null, settleAt = 0;

    function track() {
      const listRect = list.getBoundingClientRect();
      const rowRect = targetRow.getBoundingClientRect();
      let y = rowRect.top - listRect.top;
      const maxY = Math.max(0, list.offsetHeight - mediaBox.offsetHeight);
      y = Math.max(0, Math.min(y, maxY));
      if (reduceMotion) curY = y;
      else curY += (y - curY) * 0.14;
      mediaBox.style.transform = "translate3d(0," + curY.toFixed(1) + "px,0)";
      if (Math.abs(y - curY) > 0.5 || performance.now() < settleAt) {
        trackId = requestAnimationFrame(track);
      } else {
        trackId = null;
      }
    }

    function startTrack() {
      settleAt = performance.now() + 750;
      if (!trackId) trackId = requestAnimationFrame(track);
    }

    function activate(row) {
      targetRow = row;
      rows.forEach(function (r) {
        r.classList.toggle("is-active", r === row);
      });
      startTrack();
      const src = row.getAttribute("data-cover");
      if (media.getAttribute("src") === src) return;
      if (pendingSwap) clearTimeout(pendingSwap);
      if (reduceMotion) {
        media.src = src;
        return;
      }
      media.style.opacity = "0";
      pendingSwap = setTimeout(function () {
        media.onload = function () { media.style.opacity = "1"; };
        media.src = src;
        pendingSwap = null;
      }, 180);
    }

    rows.forEach(function (row) {
      row.addEventListener("pointerenter", function () { activate(row); });
      row.addEventListener("focus", function () { activate(row); });
    });

    window.addEventListener("resize", startTrack, { passive: true });
    startTrack();
  }

  // ── Back to top ───────────────────────────────────
  const backToTop = document.querySelector(".back-to-top");
  function handleScroll() {
    if (backToTop) {
      backToTop.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.5);
    }
  }
  window.addEventListener("scroll", handleScroll, { passive: true });

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
  initProjectPanel();
})();
