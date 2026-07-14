(() => {
  const backToTop = document.querySelector(".back-to-top");
  if (!backToTop) return;

  window.addEventListener("scroll", function () {
    backToTop.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.5);
  }, { passive: true });

  const footer = document.querySelector(".site-footer");
  if (footer && "IntersectionObserver" in window) {
    const footerObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        document.documentElement.classList.toggle("footer-in-view", entry.isIntersecting);
      });
    }, { threshold: 0.12 });

    footerObserver.observe(footer);
  }
})();
