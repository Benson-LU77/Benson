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
  }

  // Touch / click toggle
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(!menu.classList.contains("is-open"));
  });

  // Keyboard access
  menu.addEventListener("focusin", () => setOpen(true));
  menu.addEventListener("focusout", (e) => {
    if (!menu.contains(e.relatedTarget)) setOpen(false);
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
})();
