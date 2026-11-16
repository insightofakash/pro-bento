/* Entry: the section styles, the four isometric animations (they wire themselves
   to [data-iso] on load), and the Copy JSX buttons. Each button copies one
   self-contained React file from /jsx, imported raw so it always matches the repo. */
import "./unlock.css";
import "./unlock.js";
import traders from "../jsx/TraderProfilesIso.jsx?raw";
import history from "../jsx/NavHistoryIso.jsx?raw";
import mcp from "../jsx/McpClaudeIso.jsx?raw";
import alerts from "../jsx/WatchlistAlertsIso.jsx?raw";

const SOURCES = { TraderProfilesIso: traders, NavHistoryIso: history, McpClaudeIso: mcp, WatchlistAlertsIso: alerts };

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

document.querySelectorAll("[data-copy]").forEach(btn => {
  let timer;
  btn.addEventListener("click", async () => {
    await copyText(SOURCES[btn.dataset.copy]);
    btn.textContent = "Copied";
    clearTimeout(timer);
    timer = setTimeout(() => (btn.textContent = "Copy JSX"), 1400);
  });
});
