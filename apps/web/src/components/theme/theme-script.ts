// Exécuté de façon synchrone avant le premier paint (voir layout.tsx) pour éviter
// tout flash : si aucun choix n'a encore été mémorisé, on respecte la préférence
// système puis on la persiste en cookie pour que le prochain rendu serveur soit correct.
export const themeInitScript = `(function () {
  try {
    var match = document.cookie.match(/(?:^|; )theme=(dark|light)/);
    if (!match) {
      var prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      var resolved = prefersLight ? "light" : "dark";
      document.cookie = "theme=" + resolved + ";path=/;max-age=31536000;samesite=lax";
      if (resolved === "light") {
        document.documentElement.classList.remove("dark");
      }
    }
  } catch (e) {}
})();`;
