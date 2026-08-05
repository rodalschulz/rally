/**
 * First-paint PWA boot cover: black + rally mark, no CSS/JS wait.
 * Inline script removes it once the app shell mounts (or after a timeout).
 */
export function PwaBootSplash() {
  return (
    <>
      <div
        id="rally-boot"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          transition: "opacity 0.18s ease",
        }}
        aria-hidden
      >
        {/* Inline SVG so the mark shows before any network/CSS. */}
        <svg
          width="88"
          height="88"
          viewBox="0 0 80 80"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <rect width="80" height="80" rx="18" fill="#163528" />
          <circle cx="40" cy="40" r="26" fill="#c6e84a" />
          <text
            x="40"
            y="50"
            textAnchor="middle"
            fontFamily="-apple-system, BlinkMacSystemFont, system-ui, sans-serif"
            fontSize="34"
            fontWeight="600"
            fill="#0a0a0a"
          >
            r
          </text>
        </svg>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function () {
  var el = document.getElementById("rally-boot");
  if (!el) return;
  var done = false;
  function hide() {
    if (done) return;
    done = true;
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    setTimeout(function () {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }, 200);
  }
  function ready() {
    return !!document.querySelector(".app-shell");
  }
  if (ready()) {
    requestAnimationFrame(function () {
      requestAnimationFrame(hide);
    });
    return;
  }
  var obs = new MutationObserver(function () {
    if (ready()) {
      obs.disconnect();
      requestAnimationFrame(function () {
        requestAnimationFrame(hide);
      });
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(function () {
    obs.disconnect();
    hide();
  }, 4000);
})();
`.trim(),
        }}
      />
    </>
  );
}
