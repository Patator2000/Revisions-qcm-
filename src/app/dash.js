// ================= Historique quotidien (pour le tableau de bord) =================
// Stocké dans mem._h : { "AAAA-MM-JJ": {a: réponses, c: bonnes réponses, m: questions maîtrisées en fin de journée} }
let histDone = {};
function dayKey(d){ d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); }
function histOf(x){ if (!x.mem._h || typeof x.mem._h !== "object") x.mem._h = {}; return x.mem._h; }
function histRecord(i, res){
  const h = histOf(S), d = dayKey(), prev = histDone[i];
  if (prev && h[prev.d]) { h[prev.d].a = Math.max(0, (h[prev.d].a||0) - 1); h[prev.d].c = Math.max(0, (h[prev.d].c||0) - prev.v); }
  if (res !== null) { const v = res === "ok" && !luck[i] ? 1 : 0; const e = h[d] || (h[d] = {a:0, c:0}); e.a = (e.a||0) + 1; e.c = (e.c||0) + v; histDone[i] = {d, v}; }
  else delete histDone[i];
  (h[d] || (h[d] = {a:0, c:0})).m = summary(S).m;
  const ds = Object.keys(h).filter(k => /^\d{4}-/.test(k)).sort();
  if (ds.length > 400) ds.slice(0, ds.length - 400).forEach(k => delete h[k]);
}

// ================= Tableau de bord de l'accueil =================
const DASH_COL = {m: "var(--ok)", p: "var(--accent)", w: "var(--warn)", u: "var(--line)"};
function dashDays(n){ const out = []; const t = new Date(); t.setHours(12,0,0,0); for (let i = n-1; i >= 0; i--) { const d = new Date(t); d.setDate(t.getDate() - i); out.push(dayKey(d)); } return out; }
function dashBefore(k, n){ const [y, m, d] = k.split("-").map(Number); const t = new Date(y, m-1, d, 12); t.setDate(t.getDate() - n); return dayKey(t); }
function dashSince(D, n){ // les n derniers jours, en partant de 2 jours avant le premier jour de révision
  const first = Object.keys(D.act).filter(d => D.act[d].a > 0).sort()[0] || dayKey();
  return dashDays(n).filter(d => d >= dashBefore(first, 2));
}
function dashFmtDay(k){ const [y,m,d] = k.split("-").map(Number); return new Date(y, m-1, d).toLocaleDateString("fr-FR", {day: "numeric", month: "short"}); }
function dashData(){
  const live = Object.values(SUBJECTS).filter(x => fmtList(x).length);
  let m=0,p=0,w=0,u=0,total=0,g=0,tries=0,answersAll=0;
  const act = {}, weak = [];
  for (const x of live) {
    const sm = summary(x); m+=sm.m; p+=sm.p; w+=sm.w; u+=sm.u; total+=sm.total;
    for (const f of fmtList(x)) {
      const th = {};
      x.F[f].forEach((q, i) => {
        const st = x.mem[x.K[f][i]]; if (!st) return;
        const tr = (st.g||0) + (st.k||0) + (st.p||0) + (st.n||0);
        g += st.g||0; tries += tr; answersAll += st.s||0;
        const t = q[1]; const o = th[t] || (th[t] = {g:0, tr:0});
        o.g += st.g||0; o.tr += tr;
      });
      for (const t in th) if (th[t].tr >= 3) {
        const prevW = weak.find(z => z.x === x && z.t === t);
        if (prevW) { prevW.g += th[t].g; prevW.tr += th[t].tr; } else weak.push({x, t, g: th[t].g, tr: th[t].tr});
      }
    }
    const h = x.mem._h || {};
    for (const d in h) if (/^\d{4}-/.test(d)) { const e = act[d] || (act[d] = {a:0, c:0}); e.a += h[d].a||0; e.c += h[d].c||0; }
  }
  weak.forEach(z => z.r = z.g / z.tr); weak.sort((a, b) => a.r - b.r);
  // courbe de maîtrise (30 jours), valeurs reportées d'un jour sur l'autre
  const days = dashDays(30);
  const recs = live.map(x => { const h = x.mem._h || {}; return Object.keys(h).filter(k => /^\d{4}-/.test(k) && h[k].m !== undefined).sort().map(k => [k, h[k].m]); });
  const first = recs.flat().map(r => r[0]).sort()[0];
  const pts = [];
  for (const d of days) {
    if (!first || d < dashBefore(first, 2)) continue;
    let tot = 0;
    live.forEach((x, n) => { const r = recs[n]; if (!r.length) { tot += summary(x).m; return; } const b = r.filter(z => z[0] <= d); tot += b.length ? b[b.length-1][1] : 0; /* avant le premier jour suivi : départ à 0 */ });
    pts.push({d, v: total ? tot / total * 100 : 0, n: tot});
  }
  if (!pts.length) pts.push({d: dayKey(), v: total ? m / total * 100 : 0, n: m});
  const wk = dashDays(8)[0];
  const subj = live.map((x, n) => { const r = recs[n], sm = summary(x); let ref = sm.m;
    if (r.length) { const b = r.filter(z => z[0] <= wk); ref = b.length ? b[b.length-1][1] : r[0][1]; }
    return {x, sm, gain: sm.m - ref}; });
  // série de jours
  const today = dayKey(); let streak = 0, best = 0, run = 0;
  { const t = new Date(); t.setHours(12); let i = 0; if (!(act[today] && act[today].a)) i = 1;
    for (;; i++) { const d = new Date(t); d.setDate(t.getDate() - i); const e = act[dayKey(d)]; if (e && e.a) streak++; else break; } }
  const all = Object.keys(act).sort(); let last = null;
  for (const d of all) { if (!act[d].a) continue; const cur = new Date(d + "T12:00"); if (last && (cur - last) / 864e5 < 1.5) run++; else run = 1; best = Math.max(best, run); last = cur; }
  const last7 = dashDays(8).slice(0, 7).map(d => (act[d] && act[d].a) || 0);
  return {live, subj, m, p, w, u, total, g, tries, answersAll, act, weak: weak.slice(0, 5), days, pts, streak, best: Math.max(best, streak),
    today: act[today] || {a:0, c:0}, avg7: last7.reduce((s, v) => s + v, 0) / 7};
}
function smoothPath(P){
  const n = P.length; if (n < 2) return ""; if (n === 2) return `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)} L${P[1][0].toFixed(1)} ${P[1][1].toFixed(1)}`;
  const dx = [], dy = [], m = [], t = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = P[i+1][0] - P[i][0]; dy[i] = P[i+1][1] - P[i][1]; m[i] = dy[i] / dx[i]; }
  t[0] = m[0]; t[n-1] = m[n-2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i-1] * m[i] <= 0 ? 0 : (m[i-1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (m[i] === 0) { t[i] = 0; t[i+1] = 0; continue; }
    const a = t[i] / m[i], b = t[i+1] / m[i], h = a * a + b * b; if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i+1] = k * b * m[i]; } }
  let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) { const h = dx[i] / 3;
    d += ` C${(P[i][0] + h).toFixed(1)} ${(P[i][1] + t[i] * h).toFixed(1)} ${(P[i+1][0] - h).toFixed(1)} ${(P[i+1][1] - t[i+1] * h).toFixed(1)} ${P[i+1][0].toFixed(1)} ${P[i+1][1].toFixed(1)}`; }
  return d;
}
function dashArea(pts){
  if (!pts.length) return "";
  const W = 600, H = 170, vals = pts.map(p => p.v);
  let lo = Math.min(...vals), hi = Math.max(...vals); const pad = Math.max(2, (hi - lo) * .25); lo = Math.max(0, lo - pad); hi = Math.min(100, hi + pad); if (hi - lo < 4) { hi = Math.min(100, lo + 4); lo = Math.max(0, hi - 4); }
  const X = i => pts.length === 1 ? W : i / (pts.length - 1) * W, Y = v => H - 10 - (v - lo) / (hi - lo) * (H - 20);
  if (pts.length === 1) return `<div class="dash-plot dash-single"><i class="dash-dot now" style="left:97%;top:50%"></i></div><div class="dash-axis"><span></span><span>aujourd'hui · premier jour suivi</span><span></span></div>`;
  const P = pts.map((p, i) => [X(i), Y(p.v)]);
  const line = smoothPath(P);
  const data = JSON.stringify(pts.map((p, i) => ({x: X(i) / W * 100, y: Y(p.v) / H * 100, t: dashFmtDay(p.d), v: Math.round(p.v * 10) / 10, n: p.n})));
  return `<div class="dash-plot" data-pts='${data}'><svg class="dash-area" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="dashFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ok)" stop-opacity=".35"/><stop offset="1" stop-color="var(--ok)" stop-opacity="0"/></linearGradient></defs>
    <path d="${line} L${W} ${H} L0 ${H} Z" fill="url(#dashFill)"/>
    <path d="${line}" fill="none" stroke="var(--ok)" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>
  </svg><i class="dash-dot now" style="left:${X(pts.length-1) / W * 100}%;top:${Y(vals[vals.length-1]) / H * 100}%"></i><i class="dash-dot hov"></i><div class="dash-tip"></div></div>
  <div class="dash-axis"><span>${dashFmtDay(pts[0].d)}</span><span>${lo.toFixed(0)} % - ${hi.toFixed(0)} %</span><span>aujourd'hui</span></div>`;
}
function dashPlotHover(root){
  root.querySelectorAll(".dash-plot").forEach(pl => {
    const pts = JSON.parse(pl.dataset.pts || "[]"), dot = pl.querySelector(".hov"), tip = pl.querySelector(".dash-tip");
    if (pts.length < 2) return;
    const show = e => { const r = pl.getBoundingClientRect(), x = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width * 100;
      let b = pts[0]; for (const p of pts) if (Math.abs(p.x - x) < Math.abs(b.x - x)) b = p;
      dot.style.cssText = `left:${b.x}%;top:${b.y}%;display:block`; tip.style.cssText = `left:${Math.min(85, Math.max(15, b.x))}%;display:block`;
      tip.innerHTML = `<b>${String(b.v).replace(".", ",")} %</b> · ${b.n} maîtrisées<br><span>${b.t}</span>`; };
    pl.addEventListener("mousemove", show); pl.addEventListener("touchstart", show, {passive: true}); pl.addEventListener("touchmove", show, {passive: true});
    pl.addEventListener("mouseleave", () => { dot.style.display = "none"; tip.style.display = "none"; });
  });
}
function dashWeek(D){
  const byDay = {}; D.pts.forEach(p => byDay[p.d] = p.n);
  const ds = dashDays(8), today = dayKey();
  const cells = ds.slice(1).map((d, i) => {
    const prev = byDay[ds[i]], cur = byDay[d], a = D.act[d] && D.act[d].a;
    const g = cur !== undefined && prev !== undefined ? cur - prev : null;
    const lvl = g === null ? 0 : g <= 0 ? (a ? 1 : 0) : g < 5 ? 2 : g < 15 ? 3 : 4;
    const [y, mo, dd] = d.split("-").map(Number), wd = new Date(y, mo-1, dd).toLocaleDateString("fr-FR", {weekday: "short"}).replace(".", "");
    return `<div class="dw-day l${lvl}${d === today ? " today" : ""}" title="${dashFmtDay(d)} : ${a || 0} réponse${a > 1 ? "s" : ""}"><span>${d === today ? "auj." : wd}</span><b>${g === null ? "·" : (g > 0 ? "+" : "") + g}</b></div>`;
  }).join("");
  return `<div class="dash-week-h"><span>Questions maîtrisées gagnées chaque jour</span></div><div class="dash-week">${cells}</div>`;
}
function dashGoal(D){
  const pct = D.total ? D.m / D.total * 100 : 0, steps = [5, 10, 25, 50, 75, 90, 100];
  const next = steps.find(s => s > pct + 1e-9) || 100, prev = [0, ...steps].filter(s => s < next).pop();
  const need = Math.max(0, Math.ceil(next / 100 * D.total) - D.m), fill = (pct - prev) / (next - prev) * 100;
  return `<div class="dash-goal"><div class="dash-goal-h"><span>Prochain palier : <b>${next} %</b></span><span>${need ? `plus que <b>${need}</b> question${need > 1 ? "s" : ""} à maîtriser` : "atteint !"}</span></div>
    <div class="dash-goal-bar"><i style="width:${Math.max(2, Math.min(100, fill))}%"></i></div></div>`;
}
function dashBars(D){
  const days = dashSince(D, 30), vals = days.map(d => D.act[d] || {a:0, c:0}), mx = Math.max(5, ...vals.map(v => v.a));
  const bars = vals.map((v, i) => {
    const hT = v.a / mx * 100, hC = v.c / mx * 100, tip = `${dashFmtDay(days[i])} : ${v.a} réponse${v.a > 1 ? "s" : ""}, ${v.c} juste${v.c > 1 ? "s" : ""}`;
    return `<div class="dash-bar" title="${tip}"><i class="ko" style="height:${hT}%"></i><i class="ok" style="height:${hC}%"></i></div>`;
  }).join("");
  return `<div class="dash-bars">${bars}</div><div class="dash-axis"><span>${days.length > 1 ? dashFmtDay(days[0]) : ""}</span><span>max ${mx} / jour</span><span>aujourd'hui</span></div>`;
}
function dashDonut(D){
  const R = 42, C = 2 * Math.PI * R, segs = [["m","Maîtrisées"],["p","En cours"],["w","À revoir"],["u","Jamais vues"]];
  let off = 0; const arcs = segs.map(([k]) => { const v = D[k] / (D.total || 1) * C; const s = `<circle r="${R}" cx="55" cy="55" fill="none" stroke="${DASH_COL[k]}" stroke-width="13" stroke-dasharray="${v} ${C - v}" stroke-dashoffset="${-off}" transform="rotate(-90 55 55)"/>`; off += v; return s; }).join("");
  const leg = segs.map(([k, l]) => `<div class="dash-leg"><i style="background:${DASH_COL[k]}"></i><span>${l}</span><b>${D[k]}</b></div>`).join("");
  const subs = D.subj.map(({x, sm, gain}) => {
    const t = sm.total || 1, seg = k => `<i style="width:${sm[k] / t * 100}%;background:${DASH_COL[k]}"></i>`;
    return `<div class="dash-subj"><div class="ds-h"><span>${x.name}</span><span>${gain > 0 ? `<em class="dash-delta up">▲ +${gain} cette semaine</em>` : `<em class="ds-muted">${Math.round(sm.m / t * 100)} % maîtrisé</em>`}</span></div><div class="ds-bar">${seg("m")}${seg("p")}${seg("w")}</div></div>`;
  }).join("");
  const wkGain = D.subj.reduce((a, z) => a + Math.max(0, z.gain), 0);
  const pct = D.total ? D.m / D.total * 100 : 0, steps = [5, 10, 25, 50, 75, 90, 100], next = steps.find(s => s > pct + 1e-9) || 100;
  const need = Math.max(0, Math.ceil(next / 100 * D.total) - D.m), perDay = wkGain / 7, eta = perDay > 0 ? Math.ceil(need / perDay) : null;
  const pace = `<div class="dash-pace"><div class="dp-big">${wkGain > 0 ? "+" + wkGain : "0"}</div><div class="dp-txt"><b>questions maîtrisées cette semaine</b><span>${
    !need ? "Palier de " + next + " % atteint, bravo !" : eta ? `À ce rythme, ${next} % dans environ <b>${eta} jour${eta > 1 ? "s" : ""}</b>` : "Lance une série pour démarrer ta progression"}</span></div></div>`;
  return pace + `<div class="dash-rep"><div class="dash-donut"><svg viewBox="0 0 110 110">${arcs}</svg><div class="dash-donut-c"><b>${D.total ? Math.round(D.m / D.total * 100) : 0}<small> %</small></b><span>maîtrisé</span></div></div><div class="dash-legs">${leg}</div></div>${subs}`;
}
function dashSpark(arr, col){
  if (arr.length < 2) return "";
  const mx = Math.max(1, ...arr), W = 100, H = 28, P = arr.map((v, i) => [i / (arr.length - 1) * W, H - 3 - v / mx * (H - 6)]);
  return `<svg class="dash-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${smoothPath(P)}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
}
function dashDelta(v, unit){
  if (v === null || !isFinite(v)) return "";
  const r = Math.round(v * 10) / 10; if (r === 0) return "";
  return `<span class="dash-delta ${r > 0 ? "up" : "down"}">${r > 0 ? "▲ +" : "▼ "}${String(r).replace(".", ",")}${unit}</span>`;
}
function renderDash(){
  const el = $("dash"); if (!el) return;
  const h1 = document.querySelector("#v-home h1");
  const name = window.PROFILE_NAME && storeMode === "account" ? window.PROFILE_NAME : "";
  const hr = new Date().getHours();
  h1.innerHTML = `${hr < 5 || hr >= 18 ? "Bonsoir" : "Salut"}${name ? " " + name.replace(/</g, "&lt;") : ""} <span class="dash-date">${new Date().toLocaleDateString("fr-FR", {weekday: "long", day: "numeric", month: "long"})}</span>`;
  if (!storeReady) { el.innerHTML = `<div class="dash-card span12 dash-wait">Chargement de ta progression...</div>`; return; }
  const D = dashData();
  const pct = D.total ? D.m / D.total * 100 : 0;
  const ref = D.pts.length > 7 ? D.pts[D.pts.length - 8] : D.pts[0];
  const d7 = D.pts.length > 1 && ref ? pct - ref.v : null;
  const seenPct = D.total ? (D.total - D.u) / D.total * 100 : 0;
  const rate = D.tries ? D.g / D.tries * 100 : null, rateT = D.today.a ? D.today.c / D.today.a * 100 : null;
  const days14 = dashSince(D, 14), spA = days14.map(d => (D.act[d] && D.act[d].a) || 0), spR = days14.map(d => D.act[d] && D.act[d].a ? D.act[d].c / D.act[d].a * 100 : 0);
  const fmtP = v => (Math.round(v * 10) / 10).toFixed(v < 10 && v % 1 ? 1 : 0).replace(".", ",");
  const weak = D.weak.length ? D.weak.map(z => {
    const col = z.x.id === "anat" ? "anat" : "physio", nm = String(z.x.THEMES[z.t] || z.t).replace(/</g, "&lt;");
    return `<button class="dash-weak" data-s="${z.x.id}" data-t="${z.t}" style="--c:var(--${col})"><span class="dw-name"><i></i>${nm}</span><span class="dw-bar"><b style="width:${Math.round(z.r * 100)}%"></b></span><span class="dw-pct">${Math.round(z.r * 100)} %</span></button>`;
  }).join("") : `<p class="small muted" style="margin:6px 0 0">Réponds à quelques séries : les thèmes où tu te trompes le plus apparaîtront ici (au moins 3 réponses par thème).</p>`;
  el.innerHTML = `
  <div class="dash-card span8 dash-hero">
    <div class="dash-k">Maîtrise globale</div>
    <div class="dash-big">${fmtP(pct)}<small> %</small> ${dashDelta(d7, " pt" + (Math.abs(d7) >= 2 ? "s" : "") + " sur 7 j")}</div>
    <div class="dash-sub">${D.m} questions maîtrisées sur ${D.total} · ${D.live.map(x => `${x.name} ${fmtP(summary(x).m / summary(x).total * 100)} %`).join(" · ")}</div>
    ${dashGoal(D)}
    <div class="${D.pts.length < 2 ? "dash-empty" : ""}" data-empty="La courbe se dessine au fil des jours de révision">${dashArea(D.pts)}</div>
    ${dashWeek(D)}
  </div>
  <div class="dash-card span4">
    <div class="dash-k">Répartition</div>
    ${dashDonut(D)}
  </div>
  <div class="dash-card span6 dash-kpi">
    <div class="dash-k">Taux de réussite</div>
    <div class="dash-mid">${rate === null ? "-" : fmtP(rate) + "<small> %</small>"}</div>
    <div class="dash-sub">${rateT === null ? "pas encore de réponse aujourd'hui" : "aujourd'hui " + Math.round(rateT) + " %"} ${rate !== null && rateT !== null ? dashDelta(rateT - rate, " pts") : ""}</div>
    ${days14.length > 1 ? dashSpark(spR, "var(--accent)") + `<div class="dash-axis"><span>${dashFmtDay(days14[0])}</span><span>aujourd'hui</span></div>` : ""}
  </div>
  <div class="dash-card span6 dash-kpi">
    <div class="dash-k">Aujourd'hui</div>
    <div class="dash-mid">${D.today.a}<small> réponse${D.today.a > 1 ? "s" : ""}</small></div>
    <div class="dash-sub">moyenne 7 j : ${fmtP(D.avg7)} ${D.avg7 > 0 ? dashDelta((D.today.a - D.avg7) / D.avg7 * 100, " %") : ""}</div>
    ${days14.length > 1 ? dashSpark(spA, "var(--ok)") + `<div class="dash-axis"><span>${dashFmtDay(days14[0])}</span><span>aujourd'hui</span></div>` : ""}
  </div>
  <div class="dash-card span8">
    <div class="dash-k">Activité par jour <span class="dash-legend"><i class="ok"></i>justes <i class="ko"></i>fausses</span></div>
    <div class="${Object.values(D.act).some(v => v.a) ? "" : "dash-empty"}" data-empty="Tes réponses de chaque jour s'afficheront ici">${dashBars(D)}</div>
  </div>
  <div class="dash-card span4">
    <div class="dash-k">Points faibles</div>
    ${weak}
  </div>`;
  dashPlotHover(el);
  el.querySelectorAll(".dash-weak").forEach(b => b.onclick = () => {
    const x = SUBJECTS[b.dataset.s]; S = x; fmt = S.fmt; x.sel = new Set([b.dataset.t]); go("subject");
  });
}

// ================= Retour au même endroit après un rechargement =================
let routeRestoring = false;
function saveRoute(){ if (routeRestoring) return; try { localStorage.setItem("qcm-route", JSON.stringify({v: view, s: S ? S.id : null, at: Date.now()})); } catch(e) {} }
function restoreRoute(){
  let r = null; try { r = JSON.parse(localStorage.getItem("qcm-route") || "null"); } catch(e) {}
  if (!r || !r.s || !SUBJECTS[r.s] || r.v === "home") return;
  if (Date.now() - (r.at || 0) > 12 * 3600e3) return; // trop ancien : on repart de l'accueil
  const x = SUBJECTS[r.s]; if (!fmtList(x).length) return;
  routeRestoring = true;
  try {
    S = x; fmt = S.fmt;
    if (r.v === "quiz" && S.sess) { go("subject"); renderSubject(); $("sessResume").onclick(); }
    else go("subject");
  } finally { routeRestoring = false; saveRoute(); }
}
// avant de quitter ou recharger : on fige la série en cours (position, chrono) dans ce navigateur
function freezeNow(){ try { if (view === "quiz" && S) { saveSession(); lsSave(S); } } catch(e) {} }
addEventListener("pagehide", freezeNow);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") { freezeNow(); if (S && S.ref) try { flush(S); } catch(e) {} } });
