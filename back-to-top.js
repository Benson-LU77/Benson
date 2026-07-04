(() => {
  const backToTop = document.querySelector(".back-to-top");
  if (!backToTop) return;
  window.addEventListener("scroll", function () {
    backToTop.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.5);
  }, { passive: true });
})();
