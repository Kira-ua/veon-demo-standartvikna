import { TYPES, VB, layout, windowSvg, dimsSvg } from "./drawing";

const root = document.querySelector<HTMLElement>("[data-calc]");
if (root) init(root);

function init(root: HTMLElement) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = <T extends HTMLElement | SVGElement>(s: string) => root.querySelector<T>(s)!;
  const win = $<SVGSVGElement>("[data-win]");
  const dimsEl = $<SVGSVGElement>("[data-dims]");
  const inW = $<HTMLLabelElement>("[data-in-w]");
  const inH = $<HTMLLabelElement>("[data-in-h]");
  const fW = inW.querySelector("input")!;
  const fH = inH.querySelector("input")!;
  const err = $<HTMLElement>("[data-error]");
  const status = $<HTMLElement>("[data-status]");
  const next = $<HTMLButtonElement>("[data-next]");
  const prev = $<HTMLButtonElement>("[data-prev]");
  const names = ["тип конструкції", "розміри", "профіль", "склопакет", "система", "опції і надсилання"];

  const state = { type: "single", w: 750, h: 1350 };
  const cur = { w: 750, h: 1350 };
  let step = 1;
  let raf = 0;

  const typeOf = () => TYPES.find((t) => t.id === state.type)!;
  const checked = (name: string) => root.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)!;
  const opts = () => [...root.querySelectorAll<HTMLInputElement>('input[name="opt"]:checked')].map((i) => i.dataset.label!);

  function render() {
    const g = layout(cur.w, cur.h);
    win.innerHTML = windowSvg(typeOf(), g);
    const d = dimsSvg(g);
    dimsEl.innerHTML = d.svg;
    const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`;
    inW.style.left = pct(d.cx, VB.w);
    inW.style.top = pct(d.wy, VB.h);
    inH.style.left = pct(d.hx, VB.w);
    inH.style.top = pct(d.cy, VB.h);
  }

  function tweenTo(w: number, h: number) {
    cancelAnimationFrame(raf);
    if (reduce) { cur.w = w; cur.h = h; render(); return; }
    const from = { ...cur }, t0 = performance.now(), dur = 220;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      cur.w = from.w + (w - from.w) * e;
      cur.h = from.h + (h - from.h) * e;
      render();
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function summary() {
    const set = (k: string, v: string) => { const el = root.querySelector(`[data-sum="${k}"]`); if (el) el.textContent = v; };
    set("type", typeOf().label);
    set("size", `${state.w} × ${state.h} мм`);
    set("profile", checked("profile").dataset.label!);
    set("glass", checked("glass").dataset.label!);
    set("system", checked("system").dataset.label!);
    const o = opts();
    set("opt", o.length ? o.join(", ") : "без додаткових опцій");
  }

  function message() {
    const o = opts();
    return [
      "Доброго дня! Хочу розрахувати вікно:",
      `Тип: ${typeOf().label}`,
      `Розміри: ${state.w} × ${state.h} мм`,
      `Профіль: ${checked("profile").dataset.label}`,
      `Склопакет: ${checked("glass").dataset.label}`,
      `Система: ${checked("system").dataset.label}`,
      `Опції: ${o.length ? o.join(", ") : "без додаткових опцій"}`,
    ].join("\n");
  }

  function sizesOk() { return parseInt(fW.value, 10) > 0 && parseInt(fH.value, 10) > 0; }
  function updateNext() { next.disabled = step === 2 && !sizesOk(); }

  function setStep(n: number) {
    step = Math.max(1, Math.min(6, n));
    root.dataset.step = String(step);
    root.querySelector("[data-step-n]")!.textContent = String(step);
    root.querySelector("[data-step-name]")!.textContent = names[step - 1];
    prev.hidden = step === 1;
    next.hidden = step === 6;
    updateNext();
  }

  function readSize(show: boolean) {
    const w = parseInt(fW.value, 10), h = parseInt(fH.value, 10);
    const okW = w > 0, okH = h > 0;
    fW.setAttribute("aria-invalid", String(!okW && show));
    fH.setAttribute("aria-invalid", String(!okH && show));
    if (okW) state.w = w;
    if (okH) state.h = h;
    const bad = !okW || !okH;
    err.textContent = bad && show ? "Вкажіть розмір у міліметрах" : "";
    root.classList.toggle("is-invalid", bad && show);
    if (!bad) { tweenTo(state.w, state.h); summary(); }
    updateNext();
    return !bad;
  }

  for (const f of [fW, fH]) {
    f.addEventListener("input", () => { f.value = f.value.replace(/\D/g, ""); readSize(false); });
    f.addEventListener("blur", () => readSize(true));
    f.addEventListener("focus", () => f.select());
  }

  root.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === "type") {
      state.type = t.value;
      win.classList.remove("is-swap");
      void win.getBoundingClientRect();
      win.classList.add("is-swap");
      render();
    }
    summary();
  });

  const focusBad = () => (parseInt(fW.value, 10) > 0 ? fH : fW).focus();
  next.addEventListener("click", () => { if (step === 2 && !readSize(true)) { focusBad(); return; } setStep(step + 1); });
  prev.addEventListener("click", () => setStep(step - 1));

  // Send parameters: copy the summary, then the link opens the messenger; the text stays on screen as a fallback.
  root.querySelectorAll<HTMLAnchorElement>("[data-send]").forEach((a) => {
    a.addEventListener("click", (e) => {
      if (!readSize(true)) { e.preventDefault(); focusBad(); return; }
      const say = (t: string) => { status.textContent = t; status.classList.add("is-on"); };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(message()).then(
          () => say("Параметри скопійовано — вставте в чат"),
          () => say("Не вдалося скопіювати — надішліть зведення «Ваше вікно» вручну"),
        );
      } else say("Скопіюйте зведення «Ваше вікно» і надішліть у чат");
    });
  });

  // «Обрати в калькуляторі» from the maker block.
  document.querySelectorAll<HTMLElement>("[data-pick-profile]").forEach((el) => {
    el.addEventListener("click", () => {
      const r = root.querySelector<HTMLInputElement>(`input[name="profile"][value="${el.dataset.pickProfile}"]`);
      if (r) { r.checked = true; summary(); setStep(3); }
    });
  });

  // Bottom dock hides while a size field is being edited (on-screen keyboard).
  const dock = document.querySelector<HTMLElement>("[data-dock]");
  if (dock) {
    document.addEventListener("focusin", (e) => { const t = e.target; if (t instanceof HTMLInputElement && t.type === "text") dock.classList.add("is-hidden"); });
    document.addEventListener("focusout", () => dock.classList.remove("is-hidden"));
  }

  render();
  summary();
  setStep(1);
}
