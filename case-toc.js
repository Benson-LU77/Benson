/* Floating, expandable table of contents for case-study pages.
   Auto-builds from every .case-section that has a .case-label. */
(() => {
  const sections = Array.prototype.slice
    .call(document.querySelectorAll(".case-section"))
    .filter((s) => s.querySelector(".case-label"));

  if (sections.length < 3) return;

  const slug = (t) =>
    t
      .toLowerCase()
      .replace(/&amp;/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const used = {};
  const items = sections.map((s) => {
    const label = s.querySelector(".case-label").textContent.trim();
    if (!s.id) {
      let base = slug(label) || "section";
      let id = base;
      let n = 2;
      while (used[id] || document.getElementById(id)) {
        id = base + "-" + n++;
      }
      s.id = id;
    }
    used[s.id] = true;
    return { id: s.id, label: label, el: s };
  });

  // Button
  const fab = document.createElement("button");
  fab.className = "case-toc-fab";
  fab.type = "button";
  fab.setAttribute("aria-label", "Open contents");
  fab.setAttribute("aria-expanded", "false");
  fab.innerHTML =
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<circle cx="5" cy="7" r="1.5" fill="currentColor"/>' +
    '<rect x="9" y="6.2" width="10" height="1.6" rx="0.8" fill="currentColor"/>' +
    '<circle cx="5" cy="12" r="1.5" fill="currentColor"/>' +
    '<rect x="9" y="11.2" width="10" height="1.6" rx="0.8" fill="currentColor"/>' +
    '<circle cx="5" cy="17" r="1.5" fill="currentColor"/>' +
    '<rect x="9" y="16.2" width="7" height="1.6" rx="0.8" fill="currentColor"/>' +
    "</svg>";

  // Panel
  const panel = document.createElement("nav");
  panel.className = "case-toc-panel";
  panel.setAttribute("aria-label", "Table of contents");
  panel.innerHTML =
    '<p class="case-toc-panel__title">Contents</p><ol>' +
    items
      .map((i) => '<li><a href="#' + i.id + '">' + i.label + "</a></li>")
      .join("") +
    "</ol>";

  const widget = document.createElement("div");
  widget.className = "case-toc-widget";
  widget.appendChild(panel);
  widget.appendChild(fab);
  document.body.appendChild(widget);

  // Reveal on the same trigger as the back-to-top button
  const onScroll = () => {
    widget.classList.toggle("is-ready", window.scrollY > window.innerHeight * 0.5);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const close = () => {
    panel.classList.remove("is-open");
    fab.setAttribute("aria-expanded", "false");
  };
  const toggle = () => {
    const open = panel.classList.toggle("is-open");
    fab.setAttribute("aria-expanded", open ? "true" : "false");
  };

  fab.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });
  panel.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    e.preventDefault();
    const el = document.getElementById(a.getAttribute("href").slice(1));
    close();
    if (!el) return;
    if (history.replaceState) {
      history.replaceState(null, "", a.getAttribute("href"));
    }
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    // Lazy images above can shift layout mid-scroll; re-align once it settles
    const margin = 40;
    const settle = () => {
      const target = Math.max(
        0,
        el.getBoundingClientRect().top + window.scrollY - margin
      );
      if (Math.abs(window.scrollY - target) > 6) window.scrollTo(0, target);
    };
    setTimeout(settle, 480);
    setTimeout(settle, 900);
  });
  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && e.target !== fab) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  // Highlight the section currently in view
  const links = Array.prototype.slice.call(panel.querySelectorAll("a"));
  const linkById = {};
  items.forEach((i, idx) => {
    linkById[i.id] = links[idx];
  });

  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            links.forEach((l) => l.classList.remove("is-current"));
            const cur = linkById[en.target.id];
            if (cur) cur.classList.add("is-current");
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    items.forEach((i) => obs.observe(i.el));
  }
})();
