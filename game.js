/* ==========================================================
   Camada gamificada: XP, níveis, conquistas, gemas e segredo
   ========================================================== */
(() => {
  const KEY = "km-game-v2";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const XP_PER_LEVEL = 100;
  const TITLES = ["Visitante", "Curioso", "Explorador", "Aventureiro", "Veterano", "Lenda", "Mestre"];

  const ACH = [
    { id: "start",    icon: "🚀", name: "Primeiro passo",       desc: "Entrou no portfólio.",                       xp: 10 },
    { id: "about",    icon: "👋", name: "Prazer em conhecer",   desc: "Leu a seção Sobre mim.",                     xp: 20 },
    { id: "explorer", icon: "🧭", name: "Explorador",           desc: "Passou por todas as seções da apresentação.",           xp: 50 },
    { id: "projects", icon: "🕹️", name: "Caçador de projetos",  desc: "Viu os 5 projetos, um por um.",                     xp: 30 },
    { id: "gem1",     icon: "💎", name: "Olhos atentos",        desc: "Encontrou a primeira gema escondida.",       xp: 20 },
    { id: "gems",     icon: "👑", name: "Colecionador",         desc: "Encontrou as 5 gemas escondidas.",           xp: 100 },
    { id: "bottom",   icon: "🏁", name: "Até o fim",            desc: "Chegou ao último slide.",               xp: 20 },
    { id: "contact",  icon: "✉️", name: "Vamos conversar",      desc: "Clicou em um dos contatos.",                 xp: 50 },
    { id: "konami",   icon: "🎮", name: "Código secreto",       desc: "Digitou o código clássico dos games.",       xp: 100, secret: "Um código lendário dos games… ↑ ↑ ?" },
    { id: "master",   icon: "🏆", name: "100% completo",        desc: "Desbloqueou todas as conquistas.",           xp: 100 },
  ];

  /* ---------- efeitos sonoros (Web Audio, desligados por padrão) ---------- */
  let soundOn = false;
  try { soundOn = localStorage.getItem("km-sound") === "1"; } catch (e) {}
  let actx = null;
  const tone = (freq, start, dur, type = "square", vol = 0.05) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, actx.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + start + dur);
    o.connect(g).connect(actx.destination);
    o.start(actx.currentTime + start); o.stop(actx.currentTime + start + dur + 0.02);
  };
  const SFX = {
    click: () => tone(660, 0, 0.05, "triangle", 0.04),
    xp:    () => { tone(880, 0, 0.07); tone(1320, 0.06, 0.09); },
    gem:   () => [1568, 2093, 2637].forEach((f, i) => tone(f, i * 0.06, 0.18, "sine", 0.06)),
    ach:   () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.16, "triangle", 0.07)),
    level: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.07, i === 5 ? 0.4 : 0.12, "square", 0.045)),
  };
  const sfx = (name) => {
    if (!soundOn) return;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); SFX[name] && SFX[name](); } catch (e) {}
  };
  window.KM_SFX = sfx;
  const soundBtn = document.getElementById("sound-toggle");
  const syncSound = () => {
    soundBtn.setAttribute("aria-pressed", soundOn);
    soundBtn.setAttribute("aria-label", soundOn ? "Desativar efeitos sonoros" : "Ativar efeitos sonoros");
  };
  syncSound();
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem("km-sound", soundOn ? "1" : "0"); } catch (e) {}
    syncSound(); sfx("ach");
  });

  /* ---------- estado ---------- */
  const fresh = () => ({ xp: 0, unlocked: [], gems: [], seen: [], projects: [] });
  let state = fresh();
  try { state = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };

  const $ = (s) => document.querySelector(s);
  const level = () => Math.floor(state.xp / XP_PER_LEVEL) + 1;
  const title = () => TITLES[Math.min(level() - 1, TITLES.length - 1)];

  /* ---------- HUD ---------- */
  const renderHud = () => {
    $("#hud-level").textContent = level();
    $("#hud-title").textContent = title();
    $("#hud-xp").textContent = `${state.xp} XP`;
    $("#hud-bar").style.transform = `scaleX(${(state.xp % XP_PER_LEVEL) / XP_PER_LEVEL})`;
    $("#hud-count").textContent = state.unlocked.length;
  };

  /* ---------- toasts e +XP flutuante ---------- */
  const toast = (icon, head, text, kind = "") => {
    const t = document.createElement("div");
    t.className = `toast ${kind}`;
    t.innerHTML = `<span class="toast__icon">${icon}</span><div><small>${head}</small><strong>${text}</strong></div>`;
    $(".toasts").appendChild(t);
    requestAnimationFrame(() => t.classList.add("in"));
    setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 600); }, 3800);
  };

  const floatXP = (amount, x, y) => {
    const f = document.createElement("span");
    f.className = "xp-float";
    f.textContent = `+${amount} XP`;
    if (x === undefined) {
      const r = $(".hud").getBoundingClientRect();
      x = r.left + r.width / 2; y = r.top;
    }
    f.style.left = `${x}px`; f.style.top = `${y}px`;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1400);
  };

  const pulseHud = () => {
    const h = $(".hud");
    h.classList.remove("pulse"); void h.offsetWidth; h.classList.add("pulse");
  };

  const addXP = (amount, x, y) => {
    const before = level();
    state.xp += amount;
    save(); renderHud(); floatXP(amount, x, y); pulseHud(); sfx("xp");
    if (level() > before) {
      setTimeout(() => {
        toast("⭐", "Subiu de nível!", `Nível ${level()} · ${title()}`, "toast--level"); sfx("level");
        confetti(60);
      }, 500);
    }
  };

  const unlock = (id, x, y) => {
    if (state.unlocked.includes(id)) return;
    const a = ACH.find((a) => a.id === id);
    state.unlocked.push(id);
    toast(a.icon, "Conquista desbloqueada", a.name);
    sfx("ach");
    setTimeout(() => addXP(a.xp, x, y), 250);
    renderPanel();
    if (id !== "master" && ACH.every((a) => a.id === "master" || state.unlocked.includes(a.id))) {
      setTimeout(() => { unlock("master"); confetti(220); }, 1200);
    }
  };

  /* ---------- painel de conquistas ---------- */
  const renderPanel = () => {
    $("#p-level").textContent = level();
    $("#p-xp").textContent = state.xp;
    $("#p-gems").textContent = `${state.gems.length}/5`;
    $("#p-pct").textContent = `${Math.round((state.unlocked.length / ACH.length) * 100)}%`;
    $("#ach-list").innerHTML = ACH.map((a) => {
      const ok = state.unlocked.includes(a.id);
      const desc = ok || !a.secret ? a.desc : a.secret;
      return `<li class="${ok ? "ok" : ""}"><span class="ach__icon">${ok ? a.icon : "🔒"}</span>
        <div><strong>${ok || !a.secret ? a.name : "???"}</strong><small>${desc}</small></div>
        <em>+${a.xp}</em></li>`;
    }).join("");
  };

  const panel = $(".panel");
  const openPanel = () => { sfx("click"); renderPanel(); panel.hidden = false; requestAnimationFrame(() => panel.classList.add("open")); $(".panel__close").focus(); };
  const closePanel = () => { panel.classList.remove("open"); setTimeout(() => (panel.hidden = true), 350); $("#hud-open").focus(); };
  $("#hud-open").addEventListener("click", openPanel);
  $(".panel__close").addEventListener("click", closePanel);
  panel.addEventListener("click", (e) => { if (e.target === panel) closePanel(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) closePanel(); });
  $("#reset").addEventListener("click", () => {
    if (!confirm("Apagar todo o seu progresso?")) return;
    state = fresh(); save();
    document.querySelectorAll(".gem").forEach((g) => g.classList.remove("found"));
    renderHud(); renderPanel();
    toast("🔄", "Progresso", "Recomeçado do zero!");
  });

  /* ---------- gemas escondidas ---------- */
  document.querySelectorAll(".gem").forEach((g) => {
    const id = g.dataset.gem;
    if (state.gems.includes(id)) g.classList.add("found");
    g.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      if (state.gems.includes(id)) return;
      state.gems.push(id);
      g.classList.add("found");
      sfx("gem");
      toast("💎", `Gema ${state.gems.length}/5`, state.gems.length === 5 ? "Todas encontradas!" : "Continue procurando…");
      addXP(15, e.clientX, e.clientY);
      burst(e.clientX, e.clientY);
      if (state.gems.length === 1) setTimeout(() => unlock("gem1"), 600);
      if (state.gems.length === 5) setTimeout(() => unlock("gems"), 900);
    });
  });

  /* ---------- slides visitados ---------- */
  const mainSlides = ["inicio", "sobre", "areas", "projetos", "formacao", "habilidades", "contato"];
  let ready = false;
  const pending = [];
  const onSlide = (d) => {
    if (d.index === d.total - 1) setTimeout(() => unlock("bottom"), 1200);
    if (state.seen.includes(d.id)) return;
    state.seen.push(d.id);
    addXP(10);
    if (d.id === "sobre") setTimeout(() => unlock("about"), 900);
    if (d.project && !state.projects.includes(d.id)) {
      state.projects.push(d.id); save();
      const total = document.querySelectorAll(".slide.project").length;
      if (state.projects.length === total) setTimeout(() => unlock("projects"), 900);
    }
    if (mainSlides.every((s) => state.seen.includes(s))) setTimeout(() => unlock("explorer"), 1100);
  };
  document.addEventListener("km:slide", (e) => (ready ? onSlide(e.detail) : pending.push(e.detail)));

  /* ---------- contato ---------- */
  document.querySelectorAll(".contact a").forEach((a) =>
    a.addEventListener("click", () => unlock("contact"))
  );
  document.addEventListener("km:contact", () => unlock("contact"));

  /* ---------- código Konami ---------- */
  const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let pos = 0;
  document.addEventListener("keydown", (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = k === code[pos] ? pos + 1 : (k === code[0] ? 1 : 0);
    if (pos === code.length) {
      pos = 0;
      document.body.classList.add("party");
      setTimeout(() => document.body.classList.remove("party"), 4000);
      confetti(260); sfx("level");
      unlock("konami");
    }
  });

  /* ---------- confete ---------- */
  const cv = $("#confetti"), ctx = cv.getContext("2d");
  let parts = [], running = false;
  const colors = ["#8b5cf6", "#22d3ee", "#f472b6", "#facc15", "#4ade80"];
  const size = () => { cv.width = innerWidth; cv.height = innerHeight; };
  window.addEventListener("resize", size); size();

  const spawn = (n, x, y, spread) => {
    for (let i = 0; i < n; i++) {
      const ang = spread ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const sp = spread ? 2 + Math.random() * 4 : 8 + Math.random() * 10;
      parts.push({
        x: x ?? Math.random() * innerWidth, y: y ?? innerHeight + 10,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        s: 4 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
        c: colors[(Math.random() * colors.length) | 0], life: spread ? 50 : 160,
      });
    }
    if (!running) { running = true; requestAnimationFrame(tick); }
  };
  const tick = () => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter((p) => p.life-- > 0 && p.y < innerHeight + 40);
    for (const p of parts) {
      p.vy += 0.25; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.globalAlpha = Math.min(1, p.life / 30);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    }
    if (parts.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, cv.width, cv.height); }
  };
  function confetti(n) { if (!reduce) spawn(n); }
  function burst(x, y) { if (!reduce) spawn(24, x, y, true); }

  /* ---------- início ---------- */
  renderHud(); renderPanel();
  document.addEventListener("km:ready", () => {
    setTimeout(() => {
      document.querySelector(".hud").classList.add("show");
      if (!state.unlocked.includes("start")) {
        toast("🎮", "Modo jogo ativado", "Passe os slides e ganhe XP!");
        setTimeout(() => unlock("start"), 900);
      } else {
        toast("👾", "Bem-vindo de volta!", `Nível ${level()} · ${state.unlocked.length}/${ACH.length} conquistas`);
      }
      setTimeout(() => { ready = true; pending.splice(0).forEach(onSlide); }, 1800);
    }, reduce ? 300 : 1700);
  });
})();
