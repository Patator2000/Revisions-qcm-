// ================= Module Mails : Outlook =================
// Connexion Microsoft dans le navigateur (MSAL, sans secret), lecture de la boîte de réception via Microsoft Graph,
// tri par des règles simples (expéditeurs, mots-clés, importance haute), affichage dans une boîte de notifications.
// Rien ne passe par un serveur à nous : le jeton Microsoft reste dans ce navigateur.
const OUTLOOK = {
  scopes: ["User.Read", "Mail.Read"],
  redirect: "https://patator2000.github.io/Revisions-qcm-/",
  app: null, account: null, msgs: null, err: "", loading: false, at: 0, open: false
};
const MAIL_RULES_DEFAULT = {
  senders: ["univ-lyon1.fr"],
  keywords: ["examen", "partiel", "CCI", "convocation", "urgent", "note", "rattrapage", "rendez-vous", "facture", "match", "entraînement"],
  importance: true, // les mails marqués « importance haute » par l'expéditeur
  days: 7
};
let MAIL_RULES = null;
function mailUserKey(){ return (typeof SB_USER !== "undefined" && SB_USER ? SB_USER.id : "local"); }
function mailRulesLoad(){
  if (MAIL_RULES) return MAIL_RULES;
  try { MAIL_RULES = JSON.parse(localStorage.getItem("kinesis-mail-rules-" + mailUserKey())) || null; } catch(e) {}
  return MAIL_RULES || (MAIL_RULES = JSON.parse(JSON.stringify(MAIL_RULES_DEFAULT)));
}
function mailRulesSave(r){
  MAIL_RULES = r;
  try { localStorage.setItem("kinesis-mail-rules-" + mailUserKey(), JSON.stringify(r)); } catch(e) {}
  if (typeof SB !== "undefined" && SB && typeof SB_USER !== "undefined" && SB_USER)
    SB.from("profiles").upsert({user_id: SB_USER.id, mail_rules: r}).then(x => { if (x.error) console.warn("règles mails", x.error.message); });
}
function mailSeen(){ try { return new Set(JSON.parse(localStorage.getItem("kinesis-mail-vus-" + mailUserKey())) || []); } catch(e) { return new Set(); } }
function mailSeenAdd(id){ const s = mailSeen(); s.add(id); try { localStorage.setItem("kinesis-mail-vus-" + mailUserKey(), JSON.stringify([...s].slice(-500))); } catch(e) {} }

// Pourquoi un mail est important (null s'il ne l'est pas)
function mailWhy(m, r){
  const from = ((m.from && m.from.emailAddress && m.from.emailAddress.address) || "").toLowerCase();
  const name = ((m.from && m.from.emailAddress && m.from.emailAddress.name) || "").toLowerCase();
  const txt = ((m.subject || "") + " " + (m.bodyPreview || "")).toLowerCase();
  const s = (r.senders || []).find(x => x && (from.endsWith(x.toLowerCase()) || from === x.toLowerCase() || name.includes(x.toLowerCase())));
  if (s) return "expéditeur : " + s;
  const k = (r.keywords || []).find(x => x && new RegExp("(^|[^\\p{L}])" + x.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u").test(txt)); // début de mot : « note » trouve aussi « notes »
  if (k) return "mot-clé : " + k;
  if (r.importance && m.importance === "high") return "marqué important";
  return null;
}
function mailImportant(){
  if (!OUTLOOK.msgs) return [];
  const r = mailRulesLoad(), seen = mailSeen(), lim = Date.now() - (r.days || 7) * 864e5;
  return OUTLOOK.msgs.map(m => ({m, why: mailWhy(m, r)}))
    .filter(x => x.why && !seen.has(x.m.id) && new Date(x.m.receivedDateTime).getTime() >= lim)
    .sort((a, b) => new Date(b.m.receivedDateTime) - new Date(a.m.receivedDateTime));
}

// ---------- Connexion Microsoft ----------
function mailLoadLib(){
  if (window.msal) return Promise.resolve();
  return new Promise((ok, ko) => { const s = document.createElement("script"); s.src = "vendor/msal-browser.min.js"; s.onload = ok; s.onerror = () => ko(new Error("bibliothèque Microsoft non chargée")); document.head.appendChild(s); });
}
async function mailApp(){
  if (OUTLOOK.app) return OUTLOOK.app;
  if (!window.OUTLOOK_CLIENT_ID) throw new Error("Kinésis n'est pas encore inscrit chez Microsoft.");
  await mailLoadLib();
  const app = new msal.PublicClientApplication({
    auth: {clientId: window.OUTLOOK_CLIENT_ID, authority: "https://login.microsoftonline.com/common", redirectUri: OUTLOOK.redirect},
    cache: {cacheLocation: "localStorage"}
  });
  await app.initialize();
  const back = await app.handleRedirectPromise().catch(() => null);
  OUTLOOK.account = (back && back.account) || app.getAllAccounts()[0] || null;
  OUTLOOK.app = app;
  return app;
}
async function mailConnect(){
  try {
    const app = await mailApp();
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    if (standalone) { await app.loginRedirect({scopes: OUTLOOK.scopes, prompt: "select_account"}); return; } // les fenêtres surgissantes marchent mal dans l'appli installée
    const r = await app.loginPopup({scopes: OUTLOOK.scopes, prompt: "select_account"});
    OUTLOOK.account = r.account; OUTLOOK.err = "";
    await mailFetch(true);
  } catch(e) { OUTLOOK.err = mailErrText(e); mailRender(); }
}
async function mailDisconnect(){
  try { const app = await mailApp(); if (OUTLOOK.account) await app.clearCache({account: OUTLOOK.account}); } catch(e) {}
  OUTLOOK.account = null; OUTLOOK.msgs = null; mailRender();
}
async function mailToken(interactive){
  const app = await mailApp();
  if (!OUTLOOK.account) return null;
  try { return (await app.acquireTokenSilent({scopes: OUTLOOK.scopes, account: OUTLOOK.account})).accessToken; }
  catch(e) {
    if (!interactive) { OUTLOOK.err = "Ta connexion Outlook a expiré : clique sur « Actualiser » pour te reconnecter."; return null; }
    return (await app.acquireTokenPopup({scopes: OUTLOOK.scopes, account: OUTLOOK.account})).accessToken;
  }
}
function mailErrText(e){
  const m = String((e && (e.errorMessage || e.message)) || e);
  if (/popup_window_error|BrowserAuthError: popup/i.test(m)) return "La fenêtre de connexion a été bloquée : autorise les fenêtres surgissantes pour Kinésis, puis réessaie.";
  if (/user_cancelled|cancel/i.test(m)) return "Connexion annulée.";
  if (/AADSTS50020|AADSTS65001|admin/i.test(m)) return "Ce compte demande l'accord de son administrateur (souvent le cas des comptes de la fac).";
  return "Outlook : " + m.slice(0, 160);
}
// ---------- Lecture des mails ----------
async function mailFetch(interactive){
  if (OUTLOOK.loading) return;
  OUTLOOK.loading = true; mailRender();
  try {
    const tok = await mailToken(interactive);
    if (tok) {
      const days = (mailRulesLoad().days || 7), since = new Date(Date.now() - days * 864e5).toISOString();
      const url = "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=60&$orderby=receivedDateTime desc"
        + "&$select=id,subject,from,receivedDateTime,bodyPreview,isRead,importance,webLink&$filter=receivedDateTime ge " + since;
      const r = await fetch(url, {headers: {Authorization: "Bearer " + tok}});
      if (!r.ok) throw new Error("réponse " + r.status + " de Microsoft");
      OUTLOOK.msgs = (await r.json()).value || []; OUTLOOK.at = Date.now(); OUTLOOK.err = "";
    }
  } catch(e) { OUTLOOK.err = mailErrText(e); }
  OUTLOOK.loading = false; mailRender();
}
// ---------- Affichage ----------
function mailWhen(d){
  const t = new Date(d), now = new Date();
  return t.toDateString() === now.toDateString() ? t.toLocaleTimeString("fr-FR", {hour: "2-digit", minute: "2-digit"}) : t.toLocaleDateString("fr-FR", {weekday: "short", day: "numeric", month: "short"});
}
function mailBoxHtml(){
  const r = mailRulesLoad();
  if (!window.OUTLOOK_CLIENT_ID) return `<div class="mail-empty">Kinésis n'est pas encore inscrit chez Microsoft. Dès que c'est fait, tu pourras connecter ta boîte Outlook ici.</div>`;
  if (!OUTLOOK.account) return `<div class="mail-empty"><p>Connecte ta boîte Outlook : Kinésis lira ta boîte de réception et ne gardera que les mails qui correspondent à tes règles.</p>
    <button class="btn primary" id="mailConnect">Connecter Outlook</button>${OUTLOOK.err ? `<p class="small mail-err">${esc(OUTLOOK.err)}</p>` : ""}</div>`;
  const imp = mailImportant();
  const list = OUTLOOK.msgs === null ? `<p class="small muted">${OUTLOOK.loading ? "Lecture de ta boîte..." : "Pas encore lu."}</p>`
    : imp.length ? `<ul class="mail-list">${imp.map(({m, why}) => `<li class="mail-it${m.isRead ? "" : " unread"}">
        <a href="${esc(m.webLink || "https://outlook.live.com/mail/")}" target="_blank" rel="noopener" class="mail-a">
          <span class="mail-top"><b>${esc((m.from && m.from.emailAddress && (m.from.emailAddress.name || m.from.emailAddress.address)) || "?")}</b><span class="mail-t">${mailWhen(m.receivedDateTime)}</span></span>
          <span class="mail-s">${esc(m.subject || "(sans objet)")}</span>
          <span class="mail-p">${esc((m.bodyPreview || "").slice(0, 140))}</span>
          <span class="mail-why">${esc(why)}</span>
        </a><button class="mail-ok" data-seen="${esc(m.id)}" title="Marquer comme vu (il disparaît d'ici, pas d'Outlook)">Vu</button></li>`).join("")}</ul>`
    : `<p class="small muted">Rien d'important dans ta boîte ces ${r.days} derniers jours.</p>`;
  return `<div class="mail-head"><span class="small muted">${esc(OUTLOOK.account.username || "")}${OUTLOOK.at ? " · lu à " + new Date(OUTLOOK.at).toLocaleTimeString("fr-FR", {hour: "2-digit", minute: "2-digit"}) : ""}</span>
      <button class="btn ghost small" id="mailRefresh">${OUTLOOK.loading ? "..." : "Actualiser"}</button>
      <button class="btn ghost small" id="mailRulesBtn">Mes règles</button></div>
    ${OUTLOOK.err ? `<p class="small mail-err">${esc(OUTLOOK.err)}</p>` : ""}
    ${OUTLOOK.open ? mailRulesHtml(r) : ""}
    ${list}`;
}
function mailRulesHtml(r){
  return `<div class="mail-rules">
    <label class="small"><b>Expéditeurs importants</b> <span class="muted">(adresse, domaine comme univ-lyon1.fr, ou nom ; un par ligne)</span>
      <textarea id="mrSenders" rows="3">${esc((r.senders || []).join("\n"))}</textarea></label>
    <label class="small"><b>Mots-clés</b> <span class="muted">(dans l'objet ou le début du mail ; un par ligne)</span>
      <textarea id="mrKeys" rows="4">${esc((r.keywords || []).join("\n"))}</textarea></label>
    <div class="set"><div class="lbl"><b>Mails marqués « importance haute »</b><span>Ceux que l'expéditeur a signalés comme importants.</span></div><button class="switch${r.importance ? " on" : ""}" id="mrImp"></button></div>
    <label class="small"><b>Période</b> <select id="mrDays">${[1, 3, 7, 14, 30].map(d => `<option value="${d}"${d === r.days ? " selected" : ""}>${d} jour${d > 1 ? "s" : ""}</option>`).join("")}</select></label>
    <div class="row"><button class="btn small" id="mrSave">Enregistrer les règles</button><button class="btn ghost small" id="mailOut">Déconnecter Outlook</button></div>
  </div>`;
}
function mailRender(){
  const box = $("mailBox"); if (!box) return;
  const on = typeof modOn === "function" && modOn("mails");
  box.classList.toggle("hidden", !on); if (!on) return;
  $("mailBody").innerHTML = mailBoxHtml();
  const card = document.querySelector("#subjects [data-mod-open]");
  if (card && typeof mailsCard === "function") { card.outerHTML = mailsCard(); const c2 = document.querySelector("#subjects [data-mod-open]"); if (c2) c2.onclick = () => box.scrollIntoView({behavior: "smooth", block: "start"}); }
  const n = mailImportant().length, badge = $("mailCount");
  if (badge) { badge.textContent = n; badge.classList.toggle("hidden", !n); }
  const q = id => $("mailBody").querySelector("#" + id);
  if (q("mailConnect")) q("mailConnect").onclick = mailConnect;
  if (q("mailRefresh")) q("mailRefresh").onclick = () => mailFetch(true);
  if (q("mailRulesBtn")) q("mailRulesBtn").onclick = () => { OUTLOOK.open = !OUTLOOK.open; mailRender(); };
  if (q("mailOut")) q("mailOut").onclick = mailDisconnect;
  if (q("mrImp")) q("mrImp").onclick = e => e.currentTarget.classList.toggle("on");
  if (q("mrSave")) q("mrSave").onclick = () => {
    const lines = id => q(id).value.split(/\n|,/).map(s => s.trim()).filter(Boolean);
    mailRulesSave({senders: lines("mrSenders"), keywords: lines("mrKeys"), importance: q("mrImp").classList.contains("on"), days: +q("mrDays").value});
    OUTLOOK.open = false; mailFetch(false);
  };
  $("mailBody").querySelectorAll("[data-seen]").forEach(b => b.onclick = () => { mailSeenAdd(b.dataset.seen); mailRender(); });
}
// Au chargement du tableau de bord : on relit la boîte au plus toutes les 5 minutes
async function mailOnHome(){
  if (!(typeof modOn === "function" && modOn("mails"))) return mailRender();
  mailRender();
  if (!window.OUTLOOK_CLIENT_ID) return;
  try { await mailApp(); } catch(e) { OUTLOOK.err = mailErrText(e); }
  if (OUTLOOK.account && Date.now() - OUTLOOK.at > 5 * 60e3) mailFetch(false); else mailRender();
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && typeof view !== "undefined" && view === "home") mailOnHome(); });
