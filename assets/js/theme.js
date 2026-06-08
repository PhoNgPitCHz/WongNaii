/**
 * Theme toggle — persists choice in localStorage.
 * Honors OS preference until the user picks.
 */
(function () {
  const KEY = "wongnaii:theme";
  const root = document.documentElement;

  function apply(theme) {
    if (theme === "dark" || theme === "light") {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      const isDark = (theme === "dark") ||
        (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
      btn.textContent = isDark ? "☀︎" : "☾";
      btn.setAttribute("aria-label", isDark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด");
    });
  }

  const saved = localStorage.getItem(KEY);
  apply(saved);

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme-toggle]");
    if (!btn) return;
    const current = root.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(KEY, next);
    apply(next);
  });
})();
