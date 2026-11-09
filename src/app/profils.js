// ================= Profils en ligne (Supabase) - site uniquement =================
var SB, SB_USER; // pas d initialisation ici : initStore tourne avant la fin du script
// adresse technique derrière le prénom (aucun e-mail n'est envoyé) ; Supabase exige un domaine réel
var PROFILE_DOMAINS = ["users.noreply.github.com", "proton.me", "outlook.com", "gmail.com"];
function profileSlug(n){ return n.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40); }
function profileEmail(n, i){ return "rqcm." + profileSlug(n) + "@" + PROFILE_DOMAINS[i || 0]; }
function sbErr(e){
  const m = (e && (e.message || e.error_description || String(e))) || "";
  if (/invalid login credentials/i.test(m)) return "Prénom ou code incorrect.";
  if (/already registered|already been registered|exists/i.test(m)) return "Ce profil existe déjà : utilise « Se connecter » avec son code.";
  if (/email/i.test(m) && /invalid/i.test(m)) return "Supabase refuse l'adresse technique du profil. Envoie-moi ce message : " + m;
  if (/password/i.test(m) && /6|short|least/i.test(m)) return "Le code doit faire au moins 6 caractères.";
  if (/email not confirmed/i.test(m)) return "Supabase demande une confirmation par e-mail : désactive « Confirm email » dans Authentication, puis Sign In / Providers, puis Email.";
  if (/fetch|network|failed/i.test(m)) return "Connexion impossible : vérifie Internet et réessaie.";
  if (/rate limit/i.test(m)) return "Trop d'essais : attends une minute et réessaie.";
  return "Erreur : " + m;
}
function profileGate(){
  return new Promise(resolve => {
    const g = document.createElement("div"); g.id = "profileGate";
    g.innerHTML = `<div class="pg-card">
      <h1 style="margin-top:0">Révisions</h1>
      <p class="muted small" style="margin-top:0">Choisis ton profil : ta progression est enregistrée en ligne et te suit sur ton téléphone comme sur ton ordinateur.</p>
      <label class="small"><b>Prénom</b><input id="pgName" autocomplete="username" placeholder="ex. Thomas"></label>
      <label class="small"><b>Code</b> <span class="muted">(6 caractères ou plus)</span><input id="pgCode" type="password" inputmode="numeric" autocomplete="current-password" placeholder="••••••"></label>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="pgLogin">Se connecter</button><button class="btn" id="pgSignup">Créer le profil</button></div>
      <p class="small" id="pgMsg" style="min-height:1.4em;margin:10px 0 0"></p>
      <button class="linkbtn" id="pgSkip" style="margin-top:6px">Continuer sans profil (progression gardée sur cet appareil seulement)</button>
    </div>`;
    document.body.appendChild(g);
    const name = g.querySelector("#pgName"), code = g.querySelector("#pgCode"), msg = g.querySelector("#pgMsg");
    try { const last = localStorage.getItem("qcm-last-profile"); if (last) name.value = last; } catch(e) {}
    (name.value ? code : name).focus();
    const busy = b => g.querySelectorAll("button").forEach(x => x.disabled = b);
    async function go(isNew){
      const n = name.value.trim(), c = code.value;
      if (!profileSlug(n)) { msg.textContent = "Écris ton prénom."; return; }
      if (c.length < 6) { msg.textContent = "Le code doit faire au moins 6 caractères."; return; }
      busy(true); msg.textContent = isNew ? "Création du profil..." : "Connexion...";
      try {
        let r;
        for (let i = 0; i < PROFILE_DOMAINS.length; i++) {
          r = isNew
            ? await SB.auth.signUp({email: profileEmail(n, i), password: c, options: {data: {name: n}}})
            : await SB.auth.signInWithPassword({email: profileEmail(n, i), password: c});
          const m = r.error ? (r.error.message || "") : "";
          // domaine refusé par Supabase, ou (connexion) profil créé avec un autre domaine : on essaie le suivant
          if (r.error && (/invalid/i.test(m) && /email|address/i.test(m) || (!isNew && /invalid login credentials/i.test(m))) && i < PROFILE_DOMAINS.length - 1) continue;
          break;
        }
        if (r.error) throw r.error;
        if (!r.data.session) throw {message: "Email not confirmed"};
        try { localStorage.setItem("qcm-last-profile", n); } catch(e) {}
        g.remove(); resolve({user: r.data.user, isNew});
      } catch(e) { msg.textContent = sbErr(e); busy(false); }
    }
    g.querySelector("#pgLogin").onclick = () => go(false);
    g.querySelector("#pgSignup").onclick = () => go(true);
    code.addEventListener("keydown", e => { if (e.key === "Enter") go(false); });
    g.querySelector("#pgSkip").onclick = () => { g.remove(); resolve(null); };
  });
}
async function supaStart(live, anonLocals){
  try {
    if (typeof supabase === "undefined") throw new Error("le fichier supabase.js ne s'est pas chargé (rafraîchis la page)");
    SB = supabase.createClient(window.SUPA_URL, window.SUPA_KEY, {auth: {persistSession: true, autoRefreshToken: true, storageKey: "qcm-supabase-auth"}});
    let isNew = false;
    const s = await SB.auth.getSession();
    SB_USER = s.data && s.data.session ? s.data.session.user : null;
    if (!SB_USER) { const r = await profileGate(); if (!r) return false; SB_USER = r.user; isNew = r.isNew; }
    window.PROFILE_NAME = (SB_USER.user_metadata && SB_USER.user_metadata.name) || SB_USER.email.split("@")[0];
    const {data, error} = await SB.from("progress").select("subject,mem,sess,updated_at").eq("user_id", SB_USER.id);
    if (error) throw error;
    const rows = {}; (data || []).forEach(r => rows[r.subject] = r);
    for (const x of live) {
      const base = x.ls; x.ls = base + "-" + SB_USER.id; // cache local propre au profil
      const row = rows[x.id];
      const cache = lsLoad(x);
      let localT = 0; try { localT = +localStorage.getItem(x.ls + "-t") || 0; } catch(e) {}
      const rowT = row && row.updated_at ? Date.parse(row.updated_at) : 0;
      if (row && cache && localT > rowT + 1500) {
        // cet appareil a des réponses plus récentes que le serveur (page fermée avant l'envoi) : on les garde
        x.mem = cache; let ls = null; try { ls = JSON.parse(localStorage.getItem(x.ls + "-sess") || "null"); } catch(e) {}
        x.sess = ls; scheduleSave(x);
      }
      else if (row) { x.mem = row.mem || {}; x.sess = row.sess || null; }
      else {
        // nouveau profil : on y verse la progression de cet appareil (faite sans profil)
        x.mem = cache || (isNew && anonLocals[x.id]) || {}; x.sess = null;
      }
      const sid = x.id;
      x.ref = {set: async (o) => {
        const r = await SB.from("progress").upsert({user_id: SB_USER.id, subject: sid, mem: o.m, sess: o.sess || null, updated_at: new Date().toISOString()});
        if (r.error) throw {code: /JWT|auth/i.test(r.error.message) ? "revoked" : "unavailable", message: r.error.message};
      }};
      if (!row && Object.keys(x.mem).length) scheduleSave(x);
    }
    DB = {collection: () => ({add: async (d) => { const r = await SB.from("reports").insert({data: d}); if (r.error) throw r.error; return {id: "ok"}; }})};
    return true;
  } catch(e) {
    console.warn("Profils indisponibles", e);
    const m = (e && (e.message || e.error_description || e.code)) || String(e);
    window.PROFILE_ERROR = /does not exist|could not find the table|schema cache|42P01|PGRST20/i.test(m)
      ? "Connexion réussie, mais les tables Supabase n'existent pas : le script SQL n'a pas été exécuté (SQL Editor, puis Run). Détail : " + m
      : /permission|policy|42501|row-level/i.test(m)
      ? "Connexion réussie, mais Supabase refuse l'accès aux données (règles RLS du script SQL). Détail : " + m
      : /fetch|network|failed to/i.test(m) ? "Supabase injoignable (Internet ou bloqueur). Détail : " + m
      : "Erreur Supabase : " + m;
    profileErrorBanner();
    return false;
  }
}
function profileErrorBanner(){
  if (!window.PROFILE_ERROR || $("pgErr")) return;
  const d = document.createElement("div"); d.id = "pgErr"; d.className = "pg-err";
  d.innerHTML = `<b>Profil indisponible.</b> <span></span><div class="row" style="margin-top:8px"><button class="btn small" id="pgErrRetry">Réessayer</button><button class="btn small" id="pgErrOut">Se déconnecter</button><button class="btn small" id="pgErrCopy">Copier le message</button></div>`;
  d.querySelector("span").textContent = window.PROFILE_ERROR + " En attendant, la progression est gardée sur cet appareil.";
  document.querySelector("main").prepend(d);
  $("pgErrRetry").onclick = () => location.reload();
  $("pgErrOut").onclick = async () => { try { await SB.auth.signOut(); } catch(e) {} location.reload(); };
  $("pgErrCopy").onclick = () => { try { navigator.clipboard.writeText(window.PROFILE_ERROR); $("pgErrCopy").textContent = "Copié ✓"; } catch(e) {} };
}
// ================= En-tête : bouton profil en haut à droite =================
function profileInitial(n){ return (n || "?").trim().charAt(0).toUpperCase(); }
function profileStats(){
  return Object.values(SUBJECTS).filter(x => x.mem && fmtList(x).length).map(x => {
    const sm = summary(x), t = sm.total || 1;
    const pc = n => { const v = n / t * 100; return v > 0 && v < 1 ? "< 1" : String(Math.round(v)); };
    return {name: x.name, seen: pc(sm.total - sm.u), master: pc(sm.m)};
  });
}
async function profileLeave(){
  try { if (view === "quiz") { pauseTimer(); saveSession(); voiceStop(); } } catch(e) {}
  try { await Promise.all(Object.values(SUBJECTS).filter(x => x.ref).map(x => flush(x))); } catch(e) {}
  try { await SB.auth.signOut(); } catch(e) {}
  location.reload();
}
function profileMenuClose(){ const m = $("pmMenu"); if (m) m.remove(); const b = $("pmBtn"); if (b) b.setAttribute("aria-expanded", "false"); }
function profileMenuOpen(){
  if ($("pmMenu")) { profileMenuClose(); return; }
  const online = storeMode === "account" && window.PROFILE_NAME;
  const m = document.createElement("div"); m.id = "pmMenu"; m.className = "pm-menu"; m.setAttribute("role", "menu");
  if (online) {
    const stats = profileStats().map(t => `<div class="pm-stat"><span>${t.name}</span><b>${t.seen} % vues</b><b class="ok">${t.master} % maîtrisées</b></div><div class="pm-bar"><i style="width:${parseFloat(t.seen) || (t.seen[0] === "<" ? 1 : 0)}%"></i><i class="ok" style="width:${parseFloat(t.master) || (t.master[0] === "<" ? 1 : 0)}%"></i></div>`).join("");
    m.innerHTML = `<div class="pm-head"><div class="pm-av big">${profileInitial(window.PROFILE_NAME)}</div><div><b>${window.PROFILE_NAME}</b><div class="small muted"><i class="pm-dot"></i>Synchronisé en ligne</div></div></div>
      <div class="pm-sec"><div class="pm-title">Ma progression</div>${stats || '<div class="small muted">Pas encore de réponses.</div>'}</div>
      <button class="pm-item" data-a="sync">Enregistrer maintenant</button>
      <button class="pm-item" data-a="switch">Changer de profil</button>
      <button class="pm-item danger" data-a="out">Se déconnecter</button>`;
  } else {
    m.innerHTML = `<div class="pm-head"><div class="pm-av big">?</div><div><b>Sans profil</b><div class="small muted">Progression gardée sur cet appareil seulement</div></div></div>
      ${window.PROFILE_ERROR ? `<div class="pm-sec small" style="color:var(--ko)">${window.PROFILE_ERROR.replace(/</g,"&lt;")}</div>` : ""}
      <button class="pm-item" data-a="login">Se connecter ou créer un profil</button>`;
  }
  document.body.appendChild(m);
  const b = $("pmBtn"), r = b.getBoundingClientRect();
  m.style.top = (r.bottom + 8) + "px"; m.style.right = Math.max(8, innerWidth - r.right) + "px";
  b.setAttribute("aria-expanded", "true");
  m.querySelectorAll("[data-a]").forEach(x => x.onclick = async () => {
    const a = x.dataset.a;
    if (a === "home") { profileMenuClose(); if (view === "quiz") { pauseTimer(); saveSession(); voiceStop(); } Object.values(SUBJECTS).filter(s => s.ref).forEach(s => flush(s)); go("home"); }
    if (a === "sync") { x.textContent = "Enregistrement..."; try { await Promise.all(Object.values(SUBJECTS).filter(s => s.ref).map(s => flush(s))); x.textContent = "Enregistré ✓"; } catch(e) { x.textContent = "Échec, réessaie"; } }
    if (a === "switch" || a === "out") { x.textContent = "Déconnexion..."; profileLeave(); }
    if (a === "login") { try { if (SB) await SB.auth.signOut(); } catch(e) {} location.reload(); }
  });
}
document.addEventListener("click", e => { const m = $("pmMenu"); if (m && !m.contains(e.target) && !e.target.closest("#pmBtn")) profileMenuClose(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") profileMenuClose(); });
addEventListener("resize", profileMenuClose);
const _setSaveBase = setSave;
setSave = function(){
  _setSaveBase();
  const el = $("save");
  if (storeMode !== "account" && storeMode !== "local") return; // pendant le chargement : pastille normale
  const online = storeMode === "account" && window.PROFILE_NAME;
  el.className = "save pm-wrap";
  el.innerHTML = `<button class="pm-btn" id="pmBtn" aria-haspopup="menu" aria-expanded="false" title="${online ? "Mon profil" : "Se connecter"}">
    <span class="pm-av">${online ? profileInitial(window.PROFILE_NAME) : "?"}</span><span class="pm-name">${online ? window.PROFILE_NAME : "Se connecter"}</span><span class="pm-chev">▾</span></button>`;
  $("pmBtn").onclick = e => { e.stopPropagation(); profileMenuOpen(); };
  const l = $("saveLong");
  if (l && online) l.textContent = `Profil ${window.PROFILE_NAME} : ta progression est enregistrée en ligne et te suit sur tous tes appareils.`;
};
