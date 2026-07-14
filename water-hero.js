(() => {
  // ── Canvas setup ──────────────────────────────────
  const canvas = document.getElementById("siteWaterCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let W = 0, H = 0, dpr = 1, frameId = null, startedAt = null, lastRenderAt = 0;
  const motion = {
    pointerTargetX: 0,
    pointerTargetY: 0,
    pointerX: 0,
    pointerY: 0,
    scrollTarget: 0,
    scroll: 0,
    rippleAnchorX: null,
    rippleAnchorY: null,
    lastRippleAt: 0,
    ripples: [],
  };

  // ── Blob definitions ──────────────────────────────
  // c: [r,g,b]  fx/fy: base position (0–1 of W/H)
  // r: radius as fraction of min(W,H)
  // sx/sy: drift speed (rad/s)   px/py: phase offset (rad)
  // ax/ay: drift range           depth: pointer/scroll response
  // ex/ey: entrance offset before the blobs settle into place
  // Dark blobs well below background, light blobs above — but same warm tone.
  // Background is ~rgb(242,241,237); darks go to ~100, lights to ~255.
  const blobs = [
    { fx: 0.10, fy: 0.22, r: 0.78, c: [ 96,  94,  89], sx: 0.31, sy: 0.24, px: 0.00, py: 0.80, bp: 0.0, ax: 0.17, ay: 0.14, depth: 1.00, ex: -0.20, ey:  0.10, alpha: 0.48 },
    { fx: 0.82, fy: 0.18, r: 0.72, c: [255, 255, 253], sx: 0.19, sy: 0.29, px: 2.10, py: 0.30, bp: 2.1, ax: 0.14, ay: 0.13, depth: -0.55, ex: 0.16, ey: -0.08, alpha: 0.46 },
    { fx: 0.52, fy: 0.84, r: 0.82, c: [104, 102,  97], sx: 0.25, sy: 0.18, px: 1.20, py: 4.50, bp: 4.2, ax: 0.16, ay: 0.13, depth: 0.72, ex: 0.08, ey:  0.18, alpha: 0.42 },
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
    dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ── Draw blobs ────────────────────────────────────
  function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
  }

  function drawRipples(now) {
    const duration = 850;
    motion.ripples = motion.ripples.filter(function (ripple) {
      return now - ripple.born < duration;
    });
    if (!motion.ripples.length) return;

    motion.ripples.forEach(function (ripple) {
      const progress = Math.max(0, Math.min(1, (now - ripple.born) / duration));
      const fade = Math.pow(1 - progress, 2);
      const radius = 24 + progress * 112;
      const lightAlpha = 0.14 * fade * ripple.strength;
      const darkAlpha = 0.06 * fade * ripple.strength;

      ctx.save();
      ctx.translate(ripple.x, ripple.y);
      ctx.rotate(ripple.angle * 0.35);
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.35, radius * 0.68, 0, -2.45, 1.15);
      ctx.strokeStyle = "rgba(255,255,253," + lightAlpha.toFixed(3) + ")";
      ctx.lineWidth = 1.6 + progress * 1.2;
      ctx.shadowColor = "rgba(255,255,253," + (lightAlpha * 0.7).toFixed(3) + ")";
      ctx.shadowBlur = 6;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.08, radius * 0.54, 0, -0.15, 2.2);
      ctx.strokeStyle = "rgba(58,56,52," + darkAlpha.toFixed(3) + ")";
      ctx.lineWidth = 1.3 + progress;
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawBlobs(time, entrance) {
    ctx.clearRect(0, 0, W, H);
    const base = Math.min(W, H);

    blobs.forEach(function (b) {
      const entranceX = (1 - entrance) * b.ex * W;
      const entranceY = (1 - entrance) * b.ey * H;
      const pointerX = motion.pointerX * W * 0.032 * b.depth;
      const pointerY = motion.pointerY * H * 0.024 * b.depth;
      const scrollX = Math.sin(motion.scroll * Math.PI * 2 + b.bp) * W * 0.035 * b.depth;
      const scrollY = Math.cos(motion.scroll * Math.PI * 1.5 + b.bp) * H * 0.028 * b.depth;
      const x = b.fx * W
        + Math.sin(time * b.sx + b.px) * W * b.ax
        + entranceX + pointerX + scrollX;
      const y = b.fy * H
        + Math.cos(time * b.sy + b.py) * H * b.ay
        + entranceY + pointerY + scrollY;
      const breathe = 1 + 0.065 * Math.sin(time * 0.12 + b.bp);
      const rad = b.r * base * breathe;

      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const rgb = b.c[0] + "," + b.c[1] + "," + b.c[2];
      g.addColorStop(0,    "rgba(" + rgb + "," + b.alpha + ")");
      g.addColorStop(0.22, "rgba(" + rgb + "," + (b.alpha * 0.78).toFixed(3) + ")");
      g.addColorStop(0.48, "rgba(" + rgb + "," + (b.alpha * 0.38).toFixed(3) + ")");
      g.addColorStop(0.72, "rgba(" + rgb + "," + (b.alpha * 0.13).toFixed(3) + ")");
      g.addColorStop(0.90, "rgba(" + rgb + "," + (b.alpha * 0.025).toFixed(3) + ")");
      g.addColorStop(1,    "rgba(" + rgb + ",0)");

      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });

    drawRipples(time * 1000);

    // Grain overlay
    if (!grainPattern) grainPattern = ctx.createPattern(grainTile, "repeat");
    ctx.globalAlpha = 0.034;
    ctx.fillStyle = grainPattern;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // ── Render loop ───────────────────────────────────
  function render(now) {
    if (lastRenderAt && now - lastRenderAt < 32) {
      frameId = requestAnimationFrame(render);
      return;
    }
    lastRenderAt = now;
    if (startedAt === null) startedAt = now;
    const elapsed = Math.max(0, now - startedAt);
    const entrance = reduceMotion
      ? 1
      : easeOutCubic(Math.min(1, elapsed / 1450));

    motion.pointerX += (motion.pointerTargetX - motion.pointerX) * 0.045;
    motion.pointerY += (motion.pointerTargetY - motion.pointerY) * 0.045;
    motion.scroll += (motion.scrollTarget - motion.scroll) * 0.04;

    drawBlobs(now / 1000, entrance);
    if (!reduceMotion) {
      frameId = requestAnimationFrame(render);
    }
  }

  // ── Ambient pointer + scroll response ────────────
  function updateScrollMotion() {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    motion.scrollTarget = Math.max(0, Math.min(1, window.scrollY / maxScroll));
  }

  function initAmbientMotion() {
    if (!window.matchMedia("(pointer: coarse)").matches) {
      window.addEventListener("pointermove", function (e) {
        motion.pointerTargetX = e.clientX / Math.max(1, window.innerWidth) - 0.5;
        motion.pointerTargetY = e.clientY / Math.max(1, window.innerHeight) - 0.5;

        if (motion.rippleAnchorX === null) {
          motion.rippleAnchorX = e.clientX;
          motion.rippleAnchorY = e.clientY;
          return;
        }
        const dx = e.clientX - motion.rippleAnchorX;
        const dy = e.clientY - motion.rippleAnchorY;
        const distance = Math.hypot(dx, dy);
        const now = performance.now();
        if (distance >= 48 && now - motion.lastRippleAt >= 140) {
          motion.ripples.push({
            x: e.clientX,
            y: e.clientY,
            born: now,
            angle: Math.atan2(dy, dx),
            strength: Math.min(0.82, 0.28 + distance / 190),
          });
          if (motion.ripples.length > 2) motion.ripples.shift();
          motion.rippleAnchorX = e.clientX;
          motion.rippleAnchorY = e.clientY;
          motion.lastRippleAt = now;
        }
      }, { passive: true });
      document.documentElement.addEventListener("mouseleave", function () {
        motion.pointerTargetX = 0;
        motion.pointerTargetY = 0;
        motion.rippleAnchorX = null;
        motion.rippleAnchorY = null;
      });
    }
    updateScrollMotion();
    window.addEventListener("scroll", updateScrollMotion, { passive: true });
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
      media.style.filter = "blur(16px)";
      pendingSwap = setTimeout(function () {
        media.onload = function () {
          media.style.opacity = "1";
          media.style.filter = "blur(0)";
        };
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
    initAmbientMotion();
    initMediaHover();
    frameId = requestAnimationFrame(render);
  } else {
    drawBlobs(0, 1);
  }

  initReveal();
  initProjectPanel();
})();
