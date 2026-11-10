// ================= Matières =================
const ICONS = {
  anat: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z"/></svg>',
  physio: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7.60 10.60 L11.67 12.95 L11.67 17.65 L7.60 20.00 L3.53 17.65 L3.53 12.95Z M11.67 12.95 L15.74 10.60 L19.81 12.95 L19.81 17.65 L15.74 20.00 L11.67 17.65 M4.75 16.95 L4.75 13.65 M10.45 16.95 L7.60 18.59 M15.74 12.01 L18.59 13.66 M18.59 16.95 L15.74 18.59 M15.74 10.60 L15.74 7.30"/><circle cx="15.74" cy="5.60" r="1.7"/></svg>'
};
const FMT_LABEL = {vf: "Vrai / Faux", qcm: "QCM type CT", open: "Questions ouvertes type CP"};
const FMT_HELP = {
  vf: "Révision rapide : une affirmation, VRAI ou FAUX.",
  qcm: "Comme au CT : 5 propositions, une ou plusieurs justes. Chaque bonne réponse cochée vaut 1 / (nombre de bonnes réponses), chaque mauvaise cochée -0,33.",
  open: "Comme au CP : tu rédiges ta réponse, puis tu la fais corriger par Claude ou tu la compares au corrigé type."
};
const SUBJECTS = {
  anat: {
    name: "Anatomie", desc: "Partie A : bassin, membre inférieur (os, articulations, muscles de la hanche, de la cuisse et de la jambe), colonne vertébrale",
    F: {vf: ANAT_Q, qcm: [], open: []}, THEMES: ANAT_THEMES, PARTS: ANAT_PARTS,
    FOCUS: ["Q5","Q6","T5","T6","C5","C6"], doc: "qcm-anat-A", ls: "qcm-anat-A-progress-v1",
    RATE: {vf: 37.5, qcm: 60},
    exam: "3 CCI obligatoires (Partie A), 40 questions en 25 min chacun : CCI 1 au TD3 (CM et TD 1 à 3), CCI 2 au TD6 (1 à 6), CCI 3 au TD9 (1 à 9). CCI 2e chance facultatif au TD10 : 100 questions en 45 min sur tout le programme ; il remplace ta moins bonne note de CCI seulement s'il est meilleur.",
    TARGETS: [
      {id:"cci1", label:"CCI 1", date:"2026-10-05", desc:"CM et TD 1 à 3", themes:["Q1","Q2","Q3","T1","T2","T3","C1","C2","C3"], sim:{n:40, sec:1500}},
      {id:"cci2", label:"CCI 2", date:"2026-11-02", desc:"CM et TD 1 à 6", themes:["Q1","Q2","Q3","Q4","Q5","Q6","T1","T2","T3","T4","T5","T6","C1","C2","C3","C4","C5","C6"], sim:{n:40, sec:1500}},
      {id:"cci3", label:"CCI 3", date:"2026-11-23", desc:"CM et TD 1 à 9", themes:"all", sim:{n:40, sec:1500}},
      {id:"second", label:"CCI 2e chance", date:"2026-12-07", desc:"tout le programme de la Partie A, 100 questions en 45 min", themes:"all", sim:{n:100, sec:2700}}
    ]
  },
  physio: {
    name: "Physiologie", desc: "Physiologie de l'exercice L1 : généralités, homéostasie, molécules, cellule, transport membranaire, système nerveux, fonction musculaire, bioénergétique",
    F: {vf: PHYSIO_Q, qcm: PHYSIO_MCQ, open: PHYSIO_OPEN}, THEMES: PHYSIO_THEMES, PARTS: PHYSIO_PARTS,
    FOCUS: [], doc: "qcm-physio-A", ls: "qcm-physio-A-progress-v1",
    RATE: {vf: 27, qcm: 60},
    TARGETS: [
      {id:"ct", label:"CT (QCM)", desc:"QCM de 60 questions en 1 h sur tout le programme", fmt:"qcm", themes:"all", sim:{n:60, sec:3600}},
      {id:"cp", label:"CP (écrit)", desc:"questions ouvertes sur tout ce qui a été vu jusqu'au CP", fmt:"open", themes:"all"}
    ],
    exam: "CT : QCM de 60 questions en 1 h (60 % de la note). CP : écrit d'1 h aux TD7, questions ouvertes (40 %)."
  }
};
const PREFIX = {vf: "q", qcm: "m", open: "o"};
for (const id in SUBJECTS) {
  const S = SUBJECTS[id];
  S.id = id; S.FOCUSSET = new Set(S.FOCUS);
  S.K = {}; for (const f in S.F) S.K[f] = S.F[f].map(q => qLocked(q) ? q[2].lock : (f === "vf" ? "" : PREFIX[f]) + hkey(q[2]));
  S.mem = {}; S.ref = null; S.saving = false; S.dirty = false; S.timer = null;
  S.sel = new Set(Object.keys(S.THEMES)); S.fmt = "vf"; S.target = null; S.sess = null;
  S.TARGETS = S.TARGETS || []; S.RATE = S.RATE || {vf: 30, qcm: 60};
}
// Question Kinésis+ pas encore chargée : [partie, thème, {lock: clé}] (voir tools/contenu.js)
function qLocked(q){ return !!q && q[2] !== null && typeof q[2] === "object" && !Array.isArray(q[2]); }
function hkey(s){ let h = 5381; for (let i=0;i<s.length;i++) h = ((h<<5) + h + s.charCodeAt(i)) >>> 0; return "q" + h.toString(36); }

const $ = id => document.getElementById(id);
const LABEL = {1:"VRAI",0:"FAUX",2:"NE SAIS PAS"};
const LET = ["A","B","C","D","E"];
let S = null, fmt = "vf";
let deck = [], answers = [], luck = [], base = [], cur = 0, sim = null, T = null, paused = false;
let DB = null;
let opts = {mode:"train", count:20, weighted:false, shuffle:true, voice:false, auto:true};
let view = "home", storeReady = false, storeMode = "loading";
const fmtList = Sx => Object.keys(Sx.F).filter(f => Sx.F[f].length);
const items = () => S.F[fmt];
const keys = () => S.K[fmt];

// ================= Niveaux de maîtrise =================
const WEIGHT = [100, 40, 8, 2, 0.5, 0.15], W_UNSEEN = 4;
function levelK(Sx, k){ const m = Sx.mem[k]; return m ? m.l : null; }
function level(Sx, qi, f){ return levelK(Sx, Sx.K[f || fmt][qi]); }
function weight(qi){ const l = level(S, qi); return l === null ? W_UNSEEN : WEIGHT[l]; }
// résultat d'une réponse : "ok" | "partial" | "ko" | "nsp" | null
function resultOf(i){
  const q = items()[deck[i]], a = answers[i];
  if (a === null || a === undefined) return null;
  if (fmt === "vf") return a === 2 ? "nsp" : a === q[3] ? "ok" : "ko";
  if (fmt === "qcm") {
    if (a.nsp) return "nsp";
    if (!a.sel.length) return null;
    const s = mcqScore(q, a.sel);
    return s >= 0.999 ? "ok" : s <= 0 ? "ko" : "partial";
  }
  return a.self || null;
}
function applyResult(prev, res, isLuck){
  const st = prev ? {...prev} : {l:1, s:0, g:0, p:0, k:0, n:0};
  st.s++; st.t = Date.now();
  if (res === "nsp") { st.n++; st.l = 0; }
  else if (res === "ok") { if (isLuck) { st.p++; st.l = Math.min(st.l, 1); } else { st.g++; st.l = Math.min(5, st.l + 1); } }
  else if (res === "partial") { st.k++; st.l = Math.min(st.l, 1); }
  else { st.k++; st.l = 0; }
  return st;
}
function commit(i){
  const key = keys()[deck[i]], res = resultOf(i);
  if (res === null) { if (base[i]) S.mem[key] = base[i]; else delete S.mem[key]; }
  else S.mem[key] = applyResult(base[i], res, luck[i]);
  try { histRecord(i, res); } catch(e) {}
  saveSession(); scheduleSave(S);
}
function summary(Sx, f){
  let m=0,p=0,w=0,u=0,total=0;
  for (const ff of (f ? [f] : fmtList(Sx))) for (const k of Sx.K[ff]) { total++; const l = levelK(Sx,k); if (l===null) u++; else if (l>=4) m++; else if (l>=2) p++; else w++; }
  return {m,p,w,u,total};
}
function mcqScore(q, sel){ const n = q[4].length; let s = 0; for (const j of sel) s += q[4].includes(j) ? 1/n : -0.33; return s; }
function mcqPositive(q, sel){ const n = q[4].length; return sel.filter(j => q[4].includes(j)).length / n; }
const fr = (x, d=2) => (Math.round(x*100)/100).toFixed(d).replace(".", ",").replace(/,00$/, "").replace(/(,\d)0$/, "$1");

// ================= Sauvegarde =================
function lsLoad(Sx){ try { const r = localStorage.getItem(Sx.ls); return r ? JSON.parse(r) : null; } catch(e){ return null; } }
function lsSave(Sx){ try { localStorage.setItem(Sx.ls, JSON.stringify(Sx.mem)); localStorage.setItem(Sx.ls + "-sess", JSON.stringify(Sx.sess || null)); localStorage.setItem(Sx.ls + "-t", String(Date.now())); return true; } catch(e){ return false; } }
function lsLoadSess(Sx){ try { const r = localStorage.getItem(Sx.ls + "-sess"); return r ? JSON.parse(r) : null; } catch(e){ return null; } }
function setSave(){
  const el = $("save"), txt = el.querySelector("span");
  el.className = "save " + (storeMode === "account" ? "ok" : storeMode === "local" ? "local" : "");
  txt.textContent = storeMode === "account" ? "Sauvegardé sur ton compte" : storeMode === "local" ? "Sauvegardé dans ce navigateur" : storeMode === "none" ? "Non sauvegardé" : "Chargement...";
  $("saveLong").textContent = storeMode === "account" ? "Ta progression te suit sur tous tes appareils."
    : storeMode === "local" ? "Sauvegarde du compte indisponible : progression gardée dans ce navigateur uniquement."
    : storeMode === "none" ? "Aucune sauvegarde possible ici : progression perdue en fermant la page." : "";
}
async function initStore(){
  const live = Object.values(SUBJECTS).filter(x => fmtList(x).length);
  const locals = {}; live.forEach(x => locals[x.id] = lsLoad(x));
  if (window.SUPA_URL && typeof supaStart === "function") {
    if (await supaStart(live, locals)) { storeMode = "account"; live.forEach(lsSave); storeReady = true; setSave(); renderView(); return; }
  }
  let timer; const timeout = new Promise(r => { timer = setTimeout(() => r("timeout"), 10000); });
  try {
    if (!window.claude || !window.claude.use) throw new Error("no runtime");
    const go = (async () => {
      const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
      if (!db || !user) return null;
      const uid = await user.id(); if (!uid) return null;
      DB = db;
      const out = {};
      for (const x of live) { const ref = db.doc("data/users/" + uid + "/" + x.doc); const snap = await ref.get(); out[x.id] = {ref, data: snap.exists ? snap.data() : null}; }
      return out;
    })();
    const res = await Promise.race([go, timeout]); clearTimeout(timer);
    if (!res || res === "timeout") throw new Error("unavailable");
    for (const x of live) {
      x.ref = res[x.id].ref; const d = res[x.id].data;
      if (d && d.m) { x.mem = JSON.parse(JSON.stringify(d.m)); x.sess = d.sess ? JSON.parse(JSON.stringify(d.sess)) : null; }
      else if (locals[x.id]) { x.mem = locals[x.id]; x.sess = lsLoadSess(x); scheduleSave(x); }
    }
    storeMode = "account";
  } catch(e) {
    clearTimeout(timer);
    for (const x of live) { if (locals[x.id]) x.mem = locals[x.id]; x.sess = lsLoadSess(x); }
    storeMode = lsSave(live[0]) ? "local" : "none";
  }
  live.forEach(lsSave);
  storeReady = true; setSave(); renderView();
}
function scheduleSave(Sx){ lsSave(Sx); clearTimeout(Sx.timer); Sx.timer = setTimeout(() => flush(Sx), 700); }
async function flush(Sx){
  if (!Sx || !Sx.ref) return;
  if (Sx.saving) { Sx.dirty = true; return; }
  Sx.saving = true; Sx.dirty = false;
  try { await Sx.ref.set({v:1, m: Sx.mem, sess: Sx.sess || null}); }
  catch(e) {
    if (e && e.code === "unavailable") { setTimeout(() => { Sx.saving = false; flush(Sx); }, 1500 + Math.random()*1500); return; }
    if (e && ["invalid_argument","revoked","not_granted"].includes(e.code)) { Sx.ref = null; storeMode = "local"; setSave(); }
  }
  Sx.saving = false;
  if (Sx.dirty) flush(Sx);
}

// ================= Navigation =================
function go(v){ view = v; renderView(); window.scrollTo(0,0); saveRoute(); }
function renderView(){
  ["home","subject","quiz","result"].forEach(v => $("v-"+v).classList.toggle("hidden", v !== view));
  const c = $("crumb");
  const parts = [`<button data-go="home">Matières</button>`];
  if (view !== "home" && S) parts.push(`<span class="sep">/</span>`, view === "subject" ? `<span class="here">${S.name}</span>` : `<button data-go="subject">${S.name}</button>`);
  if (view === "quiz") parts.push(`<span class="sep">/</span><span class="here">${sim ? sim.label : FMT_LABEL[fmt]}</span>`);
  if (view === "result") parts.push(`<span class="sep">/</span><span class="here">Bilan</span>`);
  c.innerHTML = parts.join("");
  c.querySelectorAll("[data-go]").forEach(b => b.onclick = () => {
    if (view === "quiz") { pauseTimer(); saveSession(); voiceStop(); }
    if (S) flush(S); go(b.dataset.go);
  });
  if (view === "home") renderHome();
  if (view === "subject") renderSubject();
}

// ================= Accueil =================
function renderHome(){
  try { renderDash(); } catch(e) { console.warn("dash", e); }
  $("subjects").innerHTML = Object.values(SUBJECTS).map(x => {
    const on = fmtList(x).length > 0, col = x.id === "anat" ? "anat" : "physio";
    const sm = summary(x), pct = on ? Math.round(sm.m / sm.total * 100) : 0;
    const fl = fmtList(x).map(f => FMT_LABEL[f]).join(" · ");
    return `<button class="subj ${on ? "" : "off"}" data-s="${x.id}" style="--c:var(--${col});--cs:var(--${col}-soft)">
      <div class="ico">${ICONS[x.id]}</div>
      <h3>${x.name}</h3><p>${x.desc}</p>
      ${on ? `<div class="meter"><i style="width:${pct}%"></i></div>
      <div class="foot"><span>${sm.total} questions</span><span>${storeReady ? `${pct} % maîtrisé` : "..."}</span></div>
` : ""}
    </button>`;
  }).join("");
  $("subjects").querySelectorAll(".subj").forEach(b => b.onclick = () => {
    const x = SUBJECTS[b.dataset.s]; if (!fmtList(x).length) return;
    S = x; fmt = S.fmt; go("subject");
  });
}

// ================= Matière =================
function renderSubject(){
  $("s-title").textContent = S.name;
  $("s-lead").textContent = S.desc;
  $("examInfo").textContent = S.exam || ""; $("examInfo").classList.toggle("hidden", !S.exam);
  // formats
  const fl = fmtList(S);
  $("fmtCard").classList.toggle("hidden", fl.length < 2);
  $("segFmt").innerHTML = fl.map(f => `<button data-v="${f}" class="${f===fmt?"on":""}">${FMT_LABEL[f]}</button>`).join("");
  $("segFmt").querySelectorAll("button").forEach(b => b.onclick = () => { fmt = S.fmt = b.dataset.v; renderSubject(); });
  $("fmtHelp").textContent = FMT_HELP[fmt];
  renderTargets();
  const cfg = simConfig();
  $("simCard").classList.toggle("hidden", !cfg);
  if (cfg) { $("simTitle").textContent = cfg.label; $("simTxt").textContent = cfg.txt; }
  renderSessCard();
  renderReports();
  $("setMode").classList.toggle("hidden", fmt === "open");
  // progression
  const sm = summary(S, fmt);
  $("statsTitle").textContent = "Ta progression" + (fl.length > 1 ? " : " + FMT_LABEL[fmt] : "");
  $("stats").innerHTML = `<div class="stat m"><b>${sm.m}</b><span>maîtrisées</span></div><div class="stat p"><b>${sm.p}</b><span>en cours</span></div><div class="stat w"><b>${sm.w}</b><span>à revoir</span></div><div class="stat"><b>${sm.u}</b><span>jamais vues</span></div>`;
  // thèmes
  const Q = items();
  const box = $("parts"); box.innerHTML = "";
  for (const p of Object.keys(S.PARTS)) {
    const themes = Object.keys(S.THEMES).filter(t => Q.some(q => q[0]===p && q[1]===t));
    if (!themes.length) continue;
    const el = document.createElement("div"); el.className = "part";
    el.innerHTML = `<div class="part-head"><b>${S.PARTS[p]}</b><span class="links"><button data-all="${p}">Tout</button><button data-none="${p}">Aucun</button></span></div><div class="chips"></div>`;
    const chips = el.querySelector(".chips");
    for (const t of themes) {
      const idx = Q.map((q,i)=>i).filter(i => Q[i][1]===t);
      const seen = idx.some(i => level(S,i)!==null);
      const pct = Math.round(idx.filter(i => level(S,i)>=4).length / idx.length * 100);
      const b = document.createElement("button");
      const locked = idx.every(i => qLocked(Q[i]));
      b.className = "chip" + (S.sel.has(t) && !locked ? " on" : "") + (locked ? " locked" : ""); b.dataset.t = t;
      b.innerHTML = `<span class="dot"></span><span>${S.THEMES[t]}${S.FOCUSSET.has(t) ? ' <span class="star">*</span>' : ""}</span><span class="pct">${locked ? "🔒 Kinésis+" : idx.length + (seen ? ` · ${pct} %` : "")}</span>`;
      b.onclick = () => { if (locked) { if (typeof premiumOffer === "function") premiumOffer("contenu"); return; } S.sel.has(t) ? S.sel.delete(t) : S.sel.add(t); b.classList.toggle("on"); updCount(); };
      chips.appendChild(b);
    }
    el.querySelector("[data-all]").onclick = () => { themes.forEach(t => S.sel.add(t)); renderSubject(); };
    el.querySelector("[data-none]").onclick = () => { themes.forEach(t => S.sel.delete(t)); renderSubject(); };
    box.appendChild(el);
  }
  $("focusBtn").classList.toggle("hidden", !S.FOCUS.length);
  $("focusNote").classList.toggle("hidden", !S.FOCUS.length);
  setSave(); updCount();
}
function targetThemes(t){ const all = Object.keys(S.THEMES); return t.themes === "all" ? all : t.themes.filter(x => all.includes(x)); }
function daysTo(d){ const t = new Date(d + "T08:00:00"), n = new Date(); return Math.ceil((t - n) / 86400000); }
function renderTargets(){
  const card = $("targetCard");
  card.classList.toggle("hidden", !S.TARGETS.length);
  if (!S.TARGETS.length) return;
  const list = [{id:null, label:"Révision libre"}, ...S.TARGETS];
  $("segTarget").innerHTML = list.map(t => `<button data-v="${t.id || ""}" class="${(S.target || null) === t.id ? "on" : ""}">${t.label}</button>`).join("");
  $("segTarget").querySelectorAll("button").forEach(b => b.onclick = () => {
    const id = b.dataset.v || null; S.target = id;
    const t = S.TARGETS.find(x => x.id === id);
    if (t) { if (t.fmt) fmt = S.fmt = t.fmt; S.sel = new Set(targetThemes(t)); }
    renderSubject();
  });
  const t = S.TARGETS.find(x => x.id === S.target);
  if (!t) { $("targetInfo").textContent = ""; return; }
  let when = "";
  if (t.date) { const d = daysTo(t.date); when = d > 1 ? ` · dans ${d} jours` : d === 1 ? " · demain" : d === 0 ? " · cette semaine" : d > -7 ? " · cette semaine" : " · déjà passé"; }
  $("targetInfo").textContent = `${t.label} : ${t.desc}${t.date ? " (semaine du " + new Date(t.date + "T08:00:00").toLocaleDateString("fr-FR", {day:"numeric", month:"long"}) + ")" : ""}${when}. ${targetThemes(t).length} thèmes sélectionnés.`;
}
function simConfig(){
  const t = S.TARGETS.find(x => x.id === S.target && x.sim);
  if (t) {
    const f = t.fmt || "vf";
    const avail = S.F[f].filter(q => targetThemes(t).includes(q[1]) && !qLocked(q)).length;
    const n = Math.min(t.sim.n, avail), sec = t.sim.sec ? Math.round(t.sim.sec * n / t.sim.n) : n * S.RATE[f];
    const known = !!t.sim.sec;
    return {label: "Simulation " + t.label, fmt: f, n, sec, themes: targetThemes(t),
      txt: `${n} questions${n < t.sim.n ? ` (${avail} disponibles)` : ""} en ${Math.round(sec/60)} min, correction à la fin, barème ${S.id === "anat" ? "des CCI" : "du CT"}.`};
  }
  if (S.id === "physio" && fmt === "qcm") {
    const nq = S.F.qcm.length, n = Math.min(60, nq);
    return {label: "Simulation du CT", fmt: "qcm", n, sec: n * 60, themes: Object.keys(S.THEMES), txt: `${n} questions tirées au hasard, ${n} minutes, correction à la fin.`};
  }
  return null;
}
function renderSessCard(){
  const s = S.sess, card = $("sessCard");
  card.classList.toggle("hidden", !s);
  if (!s) return;
  const done = s.answers.filter(x => x !== null).length;
  const when = new Date(s.at).toLocaleString("fr-FR", {weekday:"long", hour:"2-digit", minute:"2-digit"});
  $("sessTxt").textContent = `${s.label || FMT_LABEL[s.fmt]} : ${done} réponse${done>1?"s":""} sur ${s.keys.length}${s.left != null ? `, ${Math.ceil(s.left/60)} min restantes` : ""} (mise en pause ${when}).`;
}
function selected(){ const Q = items(); return Q.map((q,i) => i).filter(i => S.sel.has(Q[i][1]) && !qLocked(Q[i])); }
function updCount(){
  const n = selected().length, lim = opts.count ? Math.min(n, opts.count) : n;
  $("selCount").textContent = !storeReady ? "Chargement de ta progression..." : `${lim} question${lim>1?"s":""} sur ${n} sélectionnée${n>1?"s":""}`;
  $("start").disabled = !storeReady || lim === 0;
  const avail = [...new Set(items().map(q => q[1]))], on = avail.filter(t => S.sel.has(t)).length;
  if ($("themesSum")) $("themesSum").textContent = on === avail.length ? `tous les thèmes (${avail.length})` : `${on} sur ${avail.length} sélectionné${on > 1 ? "s" : ""}`;
}
function seg(id, key, cast){
  $(id).querySelectorAll("button").forEach(b => b.onclick = () => {
    $(id).querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
    opts[key] = cast(b.dataset.v);
    if (key === "mode") $("modeHelp").textContent = opts.mode === "train" ? "Correction après chaque question, sans chronomètre" : "Chronomètre, passage direct à la question suivante, correction à la fin, comme à l'examen";
    updCount();
  });
}
seg("segMode","mode",String); seg("segCount","count",Number);
function sw(id, key){ $(id).onclick = () => { opts[key] = !opts[key]; $(id).classList.toggle("on", opts[key]); }; }
sw("swWeighted","weighted"); sw("swShuffle","shuffle"); sw("swVoice","voice");
$("focusBtn").onclick = () => { S.sel = new Set(S.FOCUS); renderSubject(); };

function shuffle(a){ for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function weightedOrder(list){ return list.map(i => ({i, k: -Math.log(1 - Math.random()) / weight(i)})).sort((a,b) => a.k-b.k).map(o => o.i); }

$("start").onclick = () => {
  let list = selected();
  const lim = opts.count ? Math.min(list.length, opts.count) : list.length;
  if (opts.weighted) { list = weightedOrder(list).slice(0, lim); if (!opts.shuffle) list.sort((a,b) => a-b); else shuffle(list); }
  else { if (opts.shuffle || lim < list.length) shuffle(list); list = list.slice(0, lim); if (!opts.shuffle) list.sort((a,b) => a-b); }
  sim = null;
  start(list, (fmt !== "open" && opts.mode === "exam") ? list.length * S.RATE[fmt] : null);
};
$("simStart").onclick = () => {
  const cfg = simConfig(); if (!cfg) return;
  fmt = S.fmt = cfg.fmt;
  const inT = S.F[fmt].map((q,i) => i).filter(i => cfg.themes.includes(S.F[fmt][i][1]));
  // une simulation qui porte sur des cours Kinésis+ non accessibles : on propose Kinésis+ plutôt qu'un examen tronqué
  if (inT.some(i => qLocked(S.F[fmt][i]))) { if (typeof premiumOffer === "function") premiumOffer("contenu"); return; }
  const pool = inT;
  const list = shuffle(pool).slice(0, cfg.n);
  sim = {label: cfg.label};
  start(list, cfg.sec);
};
// ---- chronomètre (mode examen et simulations uniquement)
function startTimer(sec){ stopTimer(); T = {left: sec, end: Date.now() + sec*1000, iv: setInterval(tick, 1000)}; tick(); }
function tick(){
  if (!T) return;
  const left = T.iv ? Math.max(0, Math.round((T.end - Date.now())/1000)) : T.left;
  T.left = left;
  $("clock").textContent = `${String(Math.floor(left/60)).padStart(2,"0")}:${String(left%60).padStart(2,"0")}`;
  $("clock").classList.toggle("late", left < 300);
  if (left <= 0 && T.iv) { stopTimer(); finish(true); }
}
function pauseTimer(){ if (T && T.iv) { T.left = Math.max(0, Math.round((T.end - Date.now())/1000)); clearInterval(T.iv); T.iv = null; } }
function resumeTimer(){ if (T && !T.iv) { T.end = Date.now() + T.left*1000; T.iv = setInterval(tick, 1000); tick(); } }
function stopTimer(){ if (T && T.iv) clearInterval(T.iv); T = null; }
// ---- pause et reprise
function saveSession(){
  if (!S || !deck.length || view !== "quiz") return;
  if (T && T.iv) T.left = Math.max(0, Math.round((T.end - Date.now())/1000));
  S.sess = {fmt, keys: deck.map(qi => keys()[qi]), answers, luck, base, cur, mode: opts.mode, label: sim ? sim.label : null, left: T ? T.left : null, at: Date.now()};
  scheduleSave(S);
}
function clearSession(){ if (S && S.sess) { S.sess = null; scheduleSave(S); } }
function setPaused(p){
  paused = p;
  $("quizCard").classList.toggle("paused", p);
  $("pauseOverlay").classList.toggle("hidden", !p);
  $("pauseBtn").textContent = p ? "Reprendre" : "Pause";
  if (p) { pauseTimer(); saveSession(); voiceStop(); $("pauseTime").textContent = T ? `Temps restant : ${Math.ceil(T.left/60)} min.` : ""; }
  else { resumeTimer(); }
}
$("pauseBtn").onclick = () => setPaused(!paused);
$("pauseResume").onclick = () => setPaused(false);
$("pauseQuit").onclick = () => { saveSession(); flush(S); setPaused(false); pauseTimer(); go("subject"); };
$("sessResume").onclick = () => {
  const s = S.sess; if (!s) return; histDone = {};
  fmt = S.fmt = s.fmt;
  const idx = {}; keys().forEach((k,i) => idx[k] = i);
  const keep = s.keys.map((k,i) => idx[k] !== undefined ? i : -1).filter(i => i >= 0);
  if (!keep.length) { clearSession(); renderSubject(); return; }
  if (keep.some(i => qLocked(items()[idx[s.keys[i]]]))) { if (typeof premiumOffer === "function") premiumOffer("contenu"); return; } // série avec des questions Kinésis+ non accessibles
  opts.mode = s.mode || opts.mode;
  sim = s.label ? {label: s.label} : null;
  deck = keep.map(i => idx[s.keys[i]]); answers = keep.map(i => s.answers[i]); luck = keep.map(i => !!s.luck[i]); base = keep.map(i => s.base[i]);
  cur = Math.min(s.cur || 0, deck.length - 1);
  T = null; if (s.left != null) startTimer(s.left);
  $("clock").classList.toggle("hidden", !T);
  buildGrid(); go("quiz"); setPaused(false); render(); voiceStart();
};
$("sessDrop").onclick = () => { clearSession(); renderSubject(); };
let resetArmed = false;
$("reset").onclick = () => {
  const rb = $("reset"), lbl = rb.lastChild;
  if (!resetArmed) { resetArmed = true; rb.classList.add("armed"); lbl.textContent = "Confirmer l'effacement"; $("resetMsg").textContent = `Toute ta progression en ${S.name} (${FMT_LABEL[fmt]}) sera effacée.`; setTimeout(() => { resetArmed = false; rb.classList.remove("armed"); lbl.textContent = "Remettre à zéro"; $("resetMsg").textContent = ""; }, 4000); return; }
  resetArmed = false; rb.classList.remove("armed"); lbl.textContent = "Remettre à zéro"; for (const k of keys()) delete S.mem[k]; scheduleSave(S); renderSubject(); $("resetMsg").textContent = "Progression remise à zéro.";
};

// ================= Série =================
const examMode = () => sim ? true : (fmt !== "open" && opts.mode === "exam");
function start(list, timerSec){
  deck = list; answers = new Array(deck.length).fill(null); luck = new Array(deck.length).fill(false);
  histDone = {};
  base = deck.map(qi => { const m = S.mem[keys()[qi]]; return m ? {...m} : null; }); cur = 0;
  stopTimer(); if (timerSec) startTimer(timerSec);
  $("clock").classList.toggle("hidden", !T);
  buildGrid(); go("quiz"); setPaused(false); render(); saveSession(); voiceStart();
}
function render(){
  const q = items()[deck[cur]];
  $("qnum").textContent = `Question ${cur+1} sur ${deck.length}`;
  $("qtheme").textContent = S.THEMES[q[1]];
  $("prog").style.width = ((cur+1)/deck.length*100) + "%";
  $("qtext").textContent = q[2];
  $("askBox").innerHTML = ""; $("fb").innerHTML = "";
  if (fmt === "vf") renderVF(q); else if (fmt === "qcm") renderMCQ(q); else renderOpen(q);
  // bouton au pif (pas pour les questions ouvertes)
  const lb = $("luckBtn"), res = resultOf(cur), locked = isLocked();
  $("luckRow").classList.toggle("hidden", fmt === "open");
  lb.classList.toggle("on", luck[cur]);
  lb.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg><span>${luck[cur] ? "Au pif" : "Je réponds au pif"}</span>${luck[cur] && !locked ? '<span class="lk-x">×</span>' : ""}`;
  lb.disabled = res === "nsp" || locked;
  lb.classList.toggle("hidden", locked && !luck[cur]);
  lb.title = locked ? "" : luck[cur] ? "Annuler : je suis sûr de ma réponse" : "À cocher avant de répondre si tu n'es pas sûr : une bonne réponse compte dans le score, mais la question reviendra";
  $("luckNote").textContent = luck[cur] && locked ? (res === "ok" ? "Juste, mais elle reviendra" : "Elle reviendra") : "";
  $("hist").textContent = "";
  $("prev").disabled = cur === 0;
  $("next").textContent = cur === deck.length-1 ? "Voir le bilan" : "Suivante";
  $("live").textContent = liveText();
  updGrid();
  renderReportLink();
}
function isLocked(){
  const a = answers[cur];
  if (examMode()) return false;
  if (fmt === "vf") return a !== null;
  if (fmt === "qcm") return !!(a && a.done);
  return !!(a && a.shown);
}
function liveText(){
  const done = answers.map((a,i) => resultOf(i)).filter(r => r !== null).length;
  if (examMode()) return `${done} répondue${done>1?"s":""}`;
  if (fmt === "open") return `${done} auto-évaluée${done>1?"s":""}`;
  return `Note : ${fr(totalPoints())} / ${done}`;
}
function totalPoints(){
  let p = 0;
  answers.forEach((a,i) => {
    const q = items()[deck[i]];
    if (fmt === "vf") { if (a===null||a===2) return; p += a===q[3] ? 1 : -1; }
    else if (fmt === "qcm") { if (!a || a.nsp || !a.sel.length) return; if (!examMode() && !a.done) return; p += mcqScore(q, a.sel); }
  });
  return p;
}
// ---- Vrai / Faux
function renderVF(q){
  const a = answers[cur], locked = isLocked();
  const box = $("answers"); box.className = "answers"; box.innerHTML = "";
  for (const v of [1,0,2]) {
    const b = document.createElement("button"); b.className = "ans" + (v===2 ? " nsp" : ""); b.textContent = LABEL[v];
    if (a === v) b.classList.add("sel");
    if (locked) { b.disabled = true; if (v === q[3]) b.classList.add("good"); else if (a === v && v !== 2) b.classList.add("bad"); }
    b.onclick = () => answerVF(v);
    box.appendChild(b);
  }
  if (locked) {
    const good = LABEL[q[3]];
    $("fb").innerHTML = a === 2 ? `<div class="fb nsp"><b>Ne sait pas (0). Réponse correcte : ${good}</b>${esc(q[4])}</div>`
      : a === q[3] ? `<div class="fb ok"><b>Bonne réponse (+1) : ${good}${luck[cur] ? ", au pif : elle reviendra" : ""}</b>${esc(q[4])}</div>`
      : `<div class="fb ko"><b>Réponse incorrecte (-1). Réponse correcte : ${good}</b>${esc(q[4])}</div>`;
    renderAsk($("askBox"), deck[cur]);
  }
}
// ---- QCM 5 propositions
function renderMCQ(q){
  const a = answers[cur] || {sel:[], nsp:false, done:false}, locked = isLocked();
  const box = $("answers"); box.className = "props"; box.innerHTML = "";
  q[3].forEach((txt, j) => {
    const b = document.createElement("button"); b.className = "prop";
    const on = a.sel.includes(j), right = q[4].includes(j);
    if (on) b.classList.add("sel");
    if (locked) { b.disabled = true; if (right && on) b.classList.add("good"); else if (right) b.classList.add("missed"); else if (on) b.classList.add("bad"); }
    b.innerHTML = `<span class="box">${LET[j]}</span><span>${esc(txt)}</span>${locked ? `<span class="mark">${right ? (on ? "juste, cochée" : "juste, oubliée") : (on ? "fausse, cochée" : "")}</span>` : ""}`;
    b.onclick = () => {
      if (isLocked()) return;
      const cur_ = answers[cur] || {sel:[], nsp:false, done:false};
      cur_.nsp = false;
      cur_.sel = cur_.sel.includes(j) ? cur_.sel.filter(x => x !== j) : [...cur_.sel, j].sort();
      answers[cur] = cur_;
      if (examMode()) commit(cur);
      render();
    };
    box.appendChild(b);
  });
  const act = document.createElement("div"); act.className = "row"; act.style.marginTop = "10px";
  if (!locked) {
    const nsp = document.createElement("button"); nsp.className = "btn" + (a.nsp ? " primary" : ""); nsp.textContent = a.nsp ? "Ne sait pas : oui" : "Je ne sais pas";
    nsp.onclick = () => answerMCQnsp();
    act.appendChild(nsp);
    {
      const val = document.createElement("button"); val.className = "btn primary"; val.textContent = "Valider";
      val.disabled = !a.sel.length; if (examMode()) val.textContent = "Valider et suivante";
      val.onclick = () => validateMCQ();
      act.appendChild(val);
    }
    const hint = document.createElement("span"); hint.className = "small muted"; hint.textContent = "Une ou plusieurs réponses justes.";
    act.appendChild(hint);
  }
  box.appendChild(act);
  if (locked) {
    const goodTxt = q[4].map(j => LET[j]).join(", ");
    if (a.nsp) $("fb").innerHTML = `<div class="fb nsp"><b>Ne sait pas (0). Bonnes réponses : ${goodTxt}</b>${esc(q[5])}</div>`;
    else {
      const s = mcqScore(q, a.sel), r = resultOf(cur);
      $("fb").innerHTML = `<div class="fb ${r === "ok" ? "ok" : r === "partial" ? "nsp" : "ko"}"><b>${r === "ok" ? "Tout juste" : r === "partial" ? "Partiellement juste" : "Raté"} : ${s >= 0 ? "+" : ""}${fr(s)} point. Bonnes réponses : ${goodTxt}</b>${esc(q[5])}</div>`;
    }
    renderAsk($("askBox"), deck[cur]);
  }
}
// ---- Questions ouvertes
function renderOpen(q){
  const a = answers[cur] || (answers[cur] = {text:"", shown:false, self:null, ai:null});
  const box = $("answers"); box.className = "openq"; box.innerHTML = "";
  const ta = document.createElement("textarea"); ta.className = "answer"; ta.rows = 7;
  ta.placeholder = "Rédige ta réponse comme à l'écrit du CP : phrases courtes, mots clés, valeurs chiffrées, exemples.";
  ta.value = a.text; ta.oninput = () => { a.text = ta.value; };
  ta.addEventListener("keydown", e => e.stopPropagation());
  box.appendChild(ta);
  const act = document.createElement("div"); act.className = "row"; act.style.marginTop = "10px";
  if (sampleFn && !sampleOff && !EXTERNAL_AI) {
    const c = document.createElement("button"); c.className = "btn primary"; c.textContent = a.ai ? "Recorriger avec Claude" : "Faire corriger par Claude";
    c.onclick = () => gradeOpen(q, a, c); act.appendChild(c);
  } else if (extOn()) {
    const c = document.createElement("button"); c.className = "btn primary"; c.textContent = "Faire corriger par Claude (nouvel onglet)";
    c.onclick = () => {
      if (!a.text.trim()) { $("aiOut").innerHTML = `<p class="small muted">Écris d'abord ta réponse.</p>`; return; }
      $("aiOut").innerHTML = "";
      openClaude(`Tu corriges la copie d'un étudiant de L1 STAPS (${S.name.toLowerCase()}) pour un contrôle écrit à questions ouvertes. Le corrigé type est tiré de son cours : corrige uniquement par rapport à lui, sans pénaliser une formulation différente si l'idée est juste, et signale toute erreur scientifique.

Question : ${q[2]}
Éléments attendus (corrigé type) :
${q[3].map((k,i) => `${i+1}. ${k}`).join("\n")}

Copie de l'étudiant :
"""${a.text.slice(0, 3500)}"""

Donne : une note sur 20, les éléments acquis, les éléments manquants, les erreurs éventuelles, et un conseil pour améliorer la copie. Réponds en français, sans tiret long.`, $("aiOut"));
      a.shown = true; render();
    };
    act.appendChild(c);
  }
  const sh = document.createElement("button"); sh.className = "btn"; sh.textContent = a.shown ? "Corrigé affiché" : "Voir le corrigé type";
  sh.disabled = a.shown; sh.onclick = () => { a.shown = true; render(); };
  act.appendChild(sh); box.appendChild(act);
  const out = document.createElement("div"); out.id = "aiOut"; box.appendChild(out);
  if (a.ai) out.innerHTML = aiHtml(a.ai);
  if (a.shown) {
    $("fb").innerHTML = `<div class="fb ok"><b>Corrigé type : éléments attendus</b><ul class="kp">${q[3].map(k => `<li>${esc(k)}</li>`).join("")}</ul></div>
      <div class="selfeval"><span class="small"><b>Ton auto-évaluation :</b></span>
      <button data-s="ok" class="${a.self==="ok"?"on":""}">Je savais</button><button data-s="partial" class="${a.self==="partial"?"on":""}">À moitié</button><button data-s="ko" class="${a.self==="ko"?"on":""}">Pas su</button></div>`;
    $("fb").querySelectorAll("[data-s]").forEach(b => b.onclick = () => { a.self = b.dataset.s; commit(cur); render(); });
    renderAsk($("askBox"), deck[cur]);
  }
}
async function gradeOpen(q, a, btn){
  if (!a.text.trim()) { $("aiOut").innerHTML = `<p class="small muted">Écris d'abord ta réponse.</p>`; return; }
  btn.disabled = true; $("aiOut").innerHTML = `<p class="thinking">Claude corrige ta copie...</p>`;
  const prompt = `Tu corriges la copie d'un étudiant de L1 (physiologie de l'exercice) pour un contrôle écrit à questions ouvertes.
Question : ${q[2]}
Éléments attendus (corrigé type) :
${q[3].map((k,i) => `${i+1}. ${k}`).join("\n")}

Copie de l'étudiant :
"""${a.text.slice(0, 6000)}"""

Corrige avec bienveillance mais exigence, uniquement par rapport au corrigé type (ne pénalise pas une formulation différente si l'idée est juste ; signale toute erreur scientifique).
Réponds uniquement avec un objet JSON : {"note": nombre de 0 à 20, "acquis": [éléments du corrigé présents, formulés court], "manquants": [éléments absents ou incomplets], "erreurs": [erreurs ou confusions, liste vide si aucune], "conseil": "une ou deux phrases pour améliorer la copie"}. Français, sans tiret long.`;
  try {
    const r = await sampleFn.json(prompt, {cache: false});
    if (!r || typeof r.note !== "number") throw {code: "invalid_json"};
    a.ai = r;
    if (!a.self) a.self = r.note >= 14 ? "ok" : r.note >= 8 ? "partial" : "ko";
    a.shown = true; commit(cur);
  } catch(e) {
    if (e && ["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].includes(e.code)) { sampleOff = true; }
    a.aiErr = e && e.code === "rate_limited" ? "Limite atteinte : réessaie dans un moment." : "La correction n'a pas pu arriver. Réessaie, ou utilise le corrigé type.";
  }
  render();
  if (a.aiErr && !a.ai) { $("aiOut").innerHTML = `<p class="msg err">${a.aiErr}</p>`; a.aiErr = null; }
}
function aiHtml(r){
  const li = arr => (arr && arr.length) ? `<ul>${arr.map(x => `<li>${esc(String(x))}</li>`).join("")}</ul>` : `<p class="small muted">Aucun.</p>`;
  return `<div class="aicor"><div class="row" style="justify-content:space-between"><b>Correction de Claude</b><span class="note20">${fr(Math.max(0,Math.min(20,r.note)),1)} / 20</span></div>
    <div class="cols"><div><span class="small ok-t">Acquis</span>${li(r.acquis)}</div><div><span class="small ko-t">Manquants</span>${li(r.manquants)}</div></div>
    ${(r.erreurs && r.erreurs.length) ? `<div><span class="small ko-t">Erreurs</span>${li(r.erreurs)}</div>` : ""}
    ${r.conseil ? `<p class="small"><b>Conseil :</b> ${esc(String(r.conseil))}</p>` : ""}</div>`;
}
function esc(s){ return String(s).replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
function toggleLuck(){
  if (fmt === "open" || resultOf(cur) === "nsp") return;
  luck[cur] = !luck[cur];
  if (resultOf(cur) !== null && (fmt !== "qcm" || examMode() || answers[cur].done)) commit(cur);
  render();
}
// ---- réponse et passage automatique à la question suivante
let autoT = null;
function autoNext(){
  if (!opts.auto || !examMode()) return; // en entraînement : pas de passage automatique
  clearTimeout(autoT);
  const i = cur, r = resultOf(i);
  const delay = 250;
  autoT = setTimeout(() => {
    if (view !== "quiz" || paused || cur !== i) return;
    if (cur < deck.length - 1) { cur++; saveSession(); render(); } else finish();
  }, delay);
}
function answerVF(v){
  if (fmt !== "vf" || isLocked() || paused) return;
  answers[cur] = v; if (v === 2) luck[cur] = false;
  commit(cur); render(); autoNext();
}
function answerMCQnsp(){
  if (fmt !== "qcm" || isLocked() || paused) return;
  answers[cur] = {sel:[], nsp:true, done: !examMode()}; luck[cur] = false;
  commit(cur); render(); autoNext();
}
function validateMCQ(){
  if (fmt !== "qcm" || isLocked() || paused) return;
  const x = answers[cur]; if (!x || !x.sel.length) return;
  x.done = true; commit(cur); render(); autoNext();
}
function buildGrid(){
  const g = $("grid"); g.innerHTML = "";
  deck.forEach((_,i) => { const b=document.createElement("button"); b.textContent=i+1; b.onclick=()=>{cur=i;render();}; g.appendChild(b); });
}
function updGrid(){
  [...$("grid").children].forEach((b,i) => {
    b.className = i===cur ? "cur" : "";
    const r = resultOf(i); if (r === null) return;
    if (fmt === "qcm" && !examMode() && !answers[i].done) return;
    if (examMode()) { b.classList.add("a"); return; }
    b.classList.add(r === "nsp" ? "n" : r === "partial" ? "n" : r === "ok" ? (luck[i] ? "l" : "g") : "k");
  });
}

// ================= Bilan =================
function finish(timeUp){
  stopTimer(); voiceStop(); setPaused(false); clearSession();
  const per = {}, review = []; let g=0,k=0,n=0,p=0,part=0,blank=0, pts=0, ptsPos=0;
  deck.forEach((qi,i) => {
    const q = items()[qi], a = answers[i];
    let r = resultOf(i);
    if (fmt === "qcm" && r !== null && r !== "nsp" && !examMode() && !a.done) r = null; // non validée
    if (r === null) { blank++; return; }
    const t = per[q[1]] || (per[q[1]] = {g:0,k:0,n:0,p:0,part:0,pts:0,c:0});
    t.c++;
    if (r === "nsp") { n++; t.n++; review.push(i); }
    else if (r === "ok") { g++; t.g++; if (luck[i]) { p++; t.p++; review.push(i); } }
    else if (r === "partial") { part++; t.part++; review.push(i); }
    else { k++; t.k++; review.push(i); }
    if (fmt === "vf") { const v = r === "ok" ? 1 : r === "ko" ? -1 : 0; pts += v; t.pts += v; }
    if (fmt === "qcm" && !a.nsp) { const v = mcqScore(q, a.sel); pts += v; t.pts += v; ptsPos += mcqPositive(q, a.sel); }
    if (fmt === "open") { const v = r === "ok" ? 1 : r === "partial" ? 0.5 : 0; pts += v; t.pts += v; }
  });
  const tot = sim ? deck.length : deck.length - blank;
  $("score").textContent = tot ? `${fr(pts)} / ${tot}` : "Aucune réponse";
  $("score20").textContent = tot ? `soit ${fr(Math.max(pts,0)/tot*20,1)} / 20` + (fmt === "qcm" ? ` (sans points négatifs : ${fr(ptsPos/tot*20,1)} / 20)` : "") : "";
  const blankTxt = !blank ? "" : sim ? ` ${blank} question${blank>1?"s":""} sans réponse : 0 point chacune, comme au CT (ta progression sur ces questions ne change pas).`
    : ` ${blank} question${blank>1?"s":""} sans réponse, pas comptée${blank>1?"s":""} : elle${blank>1?"s":""} reste${blank>1?"nt":""} comme jamais vue${blank>1?"s":""}.`;
  $("scoreDetail").textContent = (timeUp ? "Temps écoulé ! " : "") + (fmt === "open"
    ? `${g} sue${g>1?"s":""}, ${part} à moitié, ${k} pas sue${k>1?"s":""} (auto-évaluation ou note de Claude).`
    : `${g} juste${g>1?"s":""} (dont ${p} au pif)${fmt === "qcm" ? `, ${part} partielle${part>1?"s":""}` : ""}, ${k} fausse${k>1?"s":""}, ${n} « ne sais pas ».`) + blankTxt;
  $("thHead").innerHTML = fmt === "open" ? `<th>Thème</th><th class="n">Sues</th><th class="n">À moitié</th><th class="n">Pas sues</th><th class="n">Note</th>`
    : `<th>Thème</th><th class="n">Justes</th><th class="n">Au pif</th>${fmt === "qcm" ? `<th class="n">Partielles</th>` : ""}<th class="n">Fausses</th><th class="n">NSP</th><th class="n">Points</th>`;
  $("byTheme").innerHTML = Object.keys(S.THEMES).filter(t => per[t]).map(t => {
    const r = per[t];
    return fmt === "open" ? `<tr><td>${S.THEMES[t]}</td><td class="n">${r.g}</td><td class="n">${r.part}</td><td class="n">${r.k}</td><td class="n">${fr(r.pts)} / ${r.c}</td></tr>`
      : `<tr><td>${S.THEMES[t]}</td><td class="n">${r.g}</td><td class="n">${r.p}</td>${fmt === "qcm" ? `<td class="n">${r.part}</td>` : ""}<td class="n">${r.k}</td><td class="n">${r.n}</td><td class="n">${fr(r.pts)} / ${r.c}</td></tr>`;
  }).join("");
  $("errors").innerHTML = review.length ? review.map(i => {
    const qi = deck[i], q = items()[qi], a = answers[i];
    let body = "";
    if (fmt === "vf") body = `<div class="small">Ta réponse : ${LABEL[a]}${luck[i] && a===q[3] ? " (juste, au pif)" : ""}. <b>Réponse correcte : ${LABEL[q[3]]}</b></div><div class="small muted">${esc(q[4])}</div>`;
    else if (fmt === "qcm") body = `<ul class="small plist">${q[3].map((t,j) => `<li class="${q[4].includes(j) ? "r" : ""}${a.sel.includes(j) ? " c" : ""}">${LET[j]}. ${esc(t)}${q[4].includes(j) ? " ✓" : ""}${a.sel.includes(j) ? " (cochée)" : ""}</li>`).join("")}</ul><div class="small">${a.nsp ? "Ne sait pas." : `Points : ${fr(mcqScore(q,a.sel))}.`} <b>Bonnes réponses : ${q[4].map(j => LET[j]).join(", ")}</b>${luck[i] ? " (au pif)" : ""}</div><div class="small muted">${esc(q[5])}</div>`;
    else body = `<div class="small muted">Éléments attendus :</div><ul class="small kp">${q[3].map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
    return `<div class="err"><span class="tag">${S.THEMES[q[1]]}</span><div class="q">${esc(q[2])}</div>${body}<button class="btn ghost small" data-ask="${qi}">Poser une question sur ce point</button><div data-askbox="${qi}"></div></div>`;
  }).join("") : `<div class="empty">Rien à revoir. Bravo !</div>`;
  $("errors").querySelectorAll("[data-ask]").forEach(b => b.onclick = () => { b.remove(); renderAsk($("errors").querySelector(`[data-askbox="${b.dataset.ask}"]`), +b.dataset.ask); });
  const redo = review.map(i => deck[i]);
  $("redoErr").disabled = redo.length === 0;
  $("redoErr").onclick = () => { sim = null; start(shuffle(redo.slice()), (fmt !== "open" && opts.mode === "exam") ? redo.length * S.RATE[fmt] : null); };
  flush(S); go("result");
}
$("luckBtn").onclick = toggleLuck;
$("prev").onclick = () => { if (cur>0){cur--;render();} };
$("next").onclick = () => { if (cur < deck.length-1){cur++; saveSession(); render();} else finish(); };
$("finish").onclick = () => finish();
$("again").onclick = () => { sim = null; go("subject"); };
document.addEventListener("keydown", e => {
  if (view !== "quiz" || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
  if (e.key === " " && e.target === document.body) { e.preventDefault(); setPaused(!paused); return; }
  if (paused) return;
  const k = e.key.toLowerCase();
  if (fmt === "vf") { const m = {v:1, f:0, n:2}; if (k in m) { answerVF(m[k]); return; } }
  if (fmt === "qcm" && "abcde".includes(k) && k.length === 1) { const bs = $("answers").querySelectorAll(".prop"); bs["abcde".indexOf(k)] && bs["abcde".indexOf(k)].click(); return; }
  if (k === "enter" && fmt === "qcm") { validateMCQ(); return; }
  if (k === "p") toggleLuck();
  else if (e.key === "ArrowRight") $("next").click(); else if (e.key === "ArrowLeft") $("prev").click();
});
window.addEventListener("pagehide", () => { if (view === "quiz") saveSession(); Object.values(SUBJECTS).forEach(x => { if (fmtList(x).length) { lsSave(x); flush(x); } }); });
/*EXTRAS*/
/*ASK*/
renderView(); setSave(); initStore().then(restoreRoute, restoreRoute); initSample();
