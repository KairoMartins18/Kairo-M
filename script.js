const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

document.getElementById("year").textContent = new Date().getFullYear();

/* ===== Divide o nome em letras ===== */
document.querySelectorAll(".split").forEach((el) => {
  const text = el.textContent;
  el.textContent = "";
  [...text].forEach((ch, i) => {
    const s = document.createElement("span");
    s.className = "char";
    s.textContent = ch;
    s.style.transitionDelay = `${i * 0.05}s`;
    el.appendChild(s);
  });
});

/* ==========================================================
   APRESENTAÇÃO: navegação entre slides
   ========================================================== */
const slides = [...document.querySelectorAll(".slide")];
const navLinks = [...document.querySelectorAll(".nav__links a")];
const progress = document.querySelector(".progress");
const dotsNav = document.querySelector(".dots");
const curEl = document.getElementById("cur");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const pad = (n) => String(n).padStart(2, "0");
let current = -1;
let started = false;

document.getElementById("total").textContent = pad(slides.length);

// numera os elementos animados de cada slide (entrada escalonada)
slides.forEach((s) => s.querySelectorAll(".a").forEach((el, i) => el.style.setProperty("--i", i)));

// bolinhas laterais
const dots = slides.map((s, i) => {
  const b = document.createElement("button");
  b.setAttribute("aria-label", s.dataset.title);
  b.innerHTML = `<span>${s.dataset.title}</span>`;
  b.addEventListener("click", () => go(i));
  dotsNav.appendChild(b);
  return b;
});

function go(i) {
  i = Math.max(0, Math.min(slides.length - 1, i));
  if (i === current) return;
  current = i;
  slides.forEach((s, k) => {
    s.classList.toggle("active", k === i);
    s.classList.toggle("past", k < i);
    s.setAttribute("aria-hidden", k !== i);
    if (k !== i) s.inert = true; else s.inert = false;
  });
  slides[i].scrollTop = 0;
  dots.forEach((d, k) => d.classList.toggle("active", k === i));
  const group = slides[i].dataset.group;
  navLinks.forEach((a) => a.classList.toggle("active", a.dataset.group === group));
  curEl.textContent = pad(i + 1);
  prevBtn.disabled = i === 0;
  nextBtn.disabled = i === slides.length - 1;
  progress.style.transform = `scaleX(${i / (slides.length - 1)})`;
  history.replaceState(null, "", `#${slides[i].id}`);
  if (started) onEnter(slides[i]);
  document.dispatchEvent(new CustomEvent("km:slide", {
    detail: { id: slides[i].id, index: i, total: slides.length, group, project: slides[i].classList.contains("project") },
  }));
}
const next = () => go(current + 1);
const prev = () => go(current - 1);
prevBtn.addEventListener("click", prev);
nextBtn.addEventListener("click", next);

// links internos (#id) -> slide
const indexOf = (hash) => slides.findIndex((s) => `#${s.id}` === hash);
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const i = indexOf(a.getAttribute("href"));
  if (i < 0) return;
  e.preventDefault();
  go(i);
  nav.classList.remove("open");
  toggle.setAttribute("aria-expanded", false);
});
window.addEventListener("hashchange", () => { const i = indexOf(location.hash); if (i >= 0) go(i); });

// pode rolar dentro do slide antes de trocar?
const atEdge = (dir) => {
  const s = slides[current];
  if (dir > 0) return s.scrollTop + s.clientHeight >= s.scrollHeight - 2;
  return s.scrollTop <= 0;
};
const panelOpen = () => !document.querySelector(".panel").hidden;
const menuOpen = () => nav.classList.contains("open");

// roda do mouse / trackpad: um gesto = um slide
let lastWheel = 0, lastNav = 0, gestureUsed = false;
window.addEventListener("wheel", (e) => {
  if (panelOpen() || menuOpen()) return;
  const now = performance.now();
  if (now - lastWheel > 220) gestureUsed = false;
  lastWheel = now;
  if (Math.abs(e.deltaY) < 4) return;
  const dir = Math.sign(e.deltaY);
  if (!atEdge(dir)) return; // deixa o slide rolar o próprio conteúdo
  e.preventDefault();
  if (gestureUsed || now - lastNav < 650) return;
  gestureUsed = true; lastNav = now;
  dir > 0 ? next() : prev();
}, { passive: false });

// toque (deslizar)
let touchY = 0, touchX = 0, edgeDown = false, edgeUp = false;
window.addEventListener("touchstart", (e) => {
  touchY = e.touches[0].clientY; touchX = e.touches[0].clientX;
  edgeDown = atEdge(1); edgeUp = atEdge(-1);
}, { passive: true });
window.addEventListener("touchend", (e) => {
  if (panelOpen() || menuOpen()) return;
  const dy = touchY - e.changedTouches[0].clientY;
  const dx = touchX - e.changedTouches[0].clientX;
  if (Math.abs(dy) < 60 || Math.abs(dx) > Math.abs(dy)) return;
  if (dy > 0 && edgeDown && atEdge(1)) next();
  if (dy < 0 && edgeUp && atEdge(-1)) prev();
}, { passive: true });

// teclado
document.addEventListener("keydown", (e) => {
  if (panelOpen() || menuOpen()) return;
  if (e.target.closest("input, textarea, select")) return;
  const k = e.key;
  if (["ArrowDown", "PageDown", "ArrowRight"].includes(k) || (k === " " && !e.shiftKey)) {
    if (k === " " && !atEdge(1)) return;
    e.preventDefault(); next();
  } else if (["ArrowUp", "PageUp", "ArrowLeft"].includes(k) || (k === " " && e.shiftKey)) {
    e.preventDefault(); prev();
  } else if (k === "Home") { e.preventDefault(); go(0); }
  else if (k === "End") { e.preventDefault(); go(slides.length - 1); }
});

/* ===== O que acontece ao entrar em cada slide ===== */
const counted = new WeakSet();
function onEnter(slide) {
  slide.querySelectorAll("[data-count]").forEach((el) => {
    if (counted.has(el)) return;
    counted.add(el);
    const target = +el.dataset.count, dur = 1400;
    const start = performance.now() + 500;
    const step = (t) => {
      const p = Math.max(0, Math.min((t - start) / dur, 1));
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* ===== Loader → primeiro slide ===== */
const startIndex = Math.max(0, indexOf(location.hash));
go(startIndex);
let booted = false;
const boot = () => {
  if (booted) return;
  booted = true;
  setTimeout(() => {
    document.dispatchEvent(new CustomEvent("km:ready"));
    document.querySelector(".loader").classList.add("done");
    started = true;
    // reaplica a entrada para disparar as animações do slide inicial
    const s = slides[current];
    s.classList.remove("active");
    void s.offsetWidth;
    s.classList.add("active");
    onEnter(s);
    setTimeout(() => document.querySelector(".hero__name").classList.add("in"), 300);
  }, reduceMotion ? 0 : 900);
};
// começa quando a página carregar — ou em no máximo 3s, mesmo com internet lenta
window.addEventListener("load", boot);
setTimeout(boot, 3000);

/* ===== Texto digitado ===== */
(() => {
  const el = document.querySelector(".typed");
  const words = JSON.parse(el.dataset.words);
  if (reduceMotion) { el.textContent = words[0]; return; }
  let w = 0, c = 0, deleting = false;
  const tick = () => {
    const word = words[w];
    el.textContent = word.slice(0, c);
    if (!deleting && c === word.length) { deleting = true; return setTimeout(tick, 1800); }
    if (deleting && c === 0) { deleting = false; w = (w + 1) % words.length; }
    c += deleting ? -1 : 1;
    setTimeout(tick, deleting ? 40 : 85);
  };
  setTimeout(tick, 1800);
})();

/* ===== Janela de código digitando ===== */
(() => {
  const out = document.getElementById("code");
  const T = (cls, txt) => [cls, txt];
  const tokens = [
    T("tk-c", "// quem sou eu, em código\n"),
    T("tk-k", "const "), T("tk-v", "kairo"), T("", " = {\n"),
    T("tk-p", "  nome"), T("", ": "), T("tk-s", '"Kairo Martins"'), T("", ",\n"),
    T("tk-p", "  local"), T("", ": "), T("tk-s", '"Nova Mutum - MT"'), T("", ",\n"),
    T("tk-p", "  stack"), T("", ": ["), T("tk-s", '"JavaScript"'), T("", ", "), T("tk-s", '"TypeScript"'), T("", ", "), T("tk-s", '"C#"'), T("", "],\n"),
    T("tk-p", "  infra"), T("", ": ["), T("tk-s", '"Linux"'), T("", ", "), T("tk-s", '"VPS"'), T("", ", "), T("tk-s", '"VMs"'), T("", "],\n"),
    T("tk-p", "  mobile"), T("", ": "), T("tk-b", "true"), T("", ",\n"),
    T("tk-p", "  aprendeFazendo"), T("", ": "), T("tk-b", "true"), T("", ",\n"),
    T("tk-p", "  status"), T("", ": "), T("tk-s", '"disponível 🚀"'), T("", ",\n"),
    T("", "};\n\n"),
    T("tk-v", "kairo"), T("", "."), T("tk-k", "build"), T("", "("), T("tk-s", '"seu próximo projeto"'), T("", ");"),
  ];
  if (reduceMotion) {
    tokens.forEach(([c, t]) => { const s = document.createElement("span"); s.className = c; s.textContent = t; out.appendChild(s); });
    return;
  }
  let ti = 0, ci = 0, span = null;
  const chars = (t) => [...t];
  const type = () => {
    if (ti >= tokens.length) return;
    const [cls, txt] = tokens[ti];
    const list = chars(txt);
    if (!span) { span = document.createElement("span"); span.className = cls; out.appendChild(span); }
    const ch = list[ci++];
    span.textContent += ch;
    if (ci >= list.length) { ti++; ci = 0; span = null; }
    setTimeout(type, ch === "\n" ? 140 : 18 + Math.random() * 30);
  };
  document.addEventListener("km:ready", () => setTimeout(type, 1100));
})();

/* ===== Menu mobile ===== */
const nav = document.querySelector(".nav");
const toggle = document.querySelector(".nav__toggle");
toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open);
});

/* ===== Tema claro / escuro ===== */
document.getElementById("theme-toggle").addEventListener("click", () => {
  const root = document.documentElement;
  const nextTheme = root.dataset.theme === "light" ? "dark" : "light";
  root.dataset.theme = nextTheme;
  try { localStorage.setItem("km-theme", nextTheme); } catch (e) {}
  window.KM_SFX && window.KM_SFX("click");
});

/* ===== Cursor personalizado ===== */
if (finePointer && !reduceMotion) {
  const cursor = document.querySelector(".cursor");
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
  window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; });
  const loop = () => {
    cx += (mx - cx) * 0.18; cy += (my - cy) * 0.18;
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(loop);
  };
  loop();
  document.addEventListener("mouseover", (e) => {
    cursor.classList.toggle("hover", !!e.target.closest("a, button, .card, .work__visual, input, textarea"));
  });
} else {
  document.querySelector(".cursor").remove();
}

/* ===== Botões magnéticos ===== */
if (finePointer && !reduceMotion) {
  document.querySelectorAll(".magnetic").forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      btn.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.3}px ${(e.clientY - r.top - r.height / 2) * 0.4}px`;
    });
    btn.addEventListener("mouseleave", () => (btn.style.translate = ""));
  });
}

/* ===== Brilho que segue o mouse nos cards ===== */
document.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    card.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  });
});

/* ===== Formulário de contato (abre o app de e-mail) ===== */
document.getElementById("contact-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const subject = `Contato pelo portfólio — ${f.nome.value}`;
  const body = `${f.msg.value}\n\n— ${f.nome.value} (${f.email.value})`;
  window.location.href = `mailto:kairo.martins18@hotmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  document.dispatchEvent(new CustomEvent("km:contact"));
});

/* ===== Fundo: partículas conectadas sutis ===== */
(() => {
  const canvas = document.getElementById("bg");
  const ctx = canvas.getContext("2d");
  let w, h, dpr, particles = [];
  const mouse = { x: -9999, y: -9999 };
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    const count = Math.min(Math.floor((innerWidth * innerHeight) / 18000), 80);
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25 * dpr, vy: (Math.random() - 0.5) * 0.25 * dpr,
      r: (Math.random() * 1.4 + 0.4) * dpr,
    }));
  };
  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (e) => { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; });
  resize();
  const linkDist = 130;
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      if (!reduceMotion) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
        if (d < 120 * dpr && d > 0) { p.x += (dx / d) * 0.8; p.y += (dy / d) * 0.8; }
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(160, 140, 255, .55)";
      ctx.fill();
    }
    const max = linkDist * dpr;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < max) {
          ctx.strokeStyle = `rgba(120, 180, 255, ${0.12 * (1 - d / max)})`;
          ctx.lineWidth = dpr * 0.8;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  };
  draw();
})();
