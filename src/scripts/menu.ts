// Mobile menu (<details>): closes on anchor click and Esc; works without JS as a plain disclosure.
const menu = document.querySelector<HTMLDetailsElement>("details.menu");
if (menu) {
  menu.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a")) menu.open = false;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.open) { menu.open = false; menu.querySelector("summary")?.focus(); }
  });
  window.matchMedia("(min-width: 1180px)").addEventListener("change", (m) => { if (m.matches) menu.open = false; });
}
