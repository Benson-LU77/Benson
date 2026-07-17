/* Nav menu: hover to open on pointer devices, tap to toggle on touch.
   Uses an explicit .is-open class so the menu never gets stuck open. */
(() => {
  const menu = document.querySelector(".nav-menu");
  if (!menu) return;
  const btn = menu.querySelector(".nav-toggle");
  if (!btn) return;

  const setOpen = (open) => {
    menu.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  };

  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (canHover) {
    menu.addEventListener("mouseenter", () => setOpen(true));
    menu.addEventListener("mouseleave", () => setOpen(false));
    // Keyboard access — only on pointer devices. On touch, a focusout fires the
    // moment a link is tapped, which would hide the menu before the click lands
    // on the link and silently cancel the navigation.
    menu.addEventListener("focusin", () => setOpen(true));
    menu.addEventListener("focusout", (e) => {
      if (!menu.contains(e.relatedTarget)) setOpen(false);
    });
  }

  // Tap / click the icon to toggle
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(!menu.classList.contains("is-open"));
  });

  // Let the link navigate first, then collapse
  menu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
})();
