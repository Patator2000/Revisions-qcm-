// ================= Module Mails : Gmail et Outlook =================
// Connexion Google (Google Identity Services) ou Microsoft (MSAL) dans le navigateur, sans secret,
// lecture de la boîte de réception, tri par des règles simples (expéditeurs, mots-clés, importance haute),
// affichage dans une boîte de notifications. Rien ne passe par un serveur à nous : les jetons restent dans ce navigateur.
var OUTLOOK = {
  scopes: ["User.Read", "Mail.Read"],
  redirect: "https://patator2000.github.io/Revisions-qcm-/",
  app: null, account: null, msgs: null, err: "", loading: false, at: 0, open: false
};
var GMAIL = {scope: "https://www.googleapis.com/auth/gmail.readonly", token: "", exp: 0, email: "", msgs: null, err: "", loading: false, at: 0};
var MAIL_UI = {open: false};
var MAIL_RULES_DEFAULT = {
  senders: ["univ-lyon1.fr"],
  keywords: ["examen", "partiel", "CCI", "convocation", "urgent", "note", "rattrapage", "rendez-vous", "facture", "match", "entraînement"],
  importance: true, // les mails marqués « importance haute » par l'expéditeur
  days: 7,
  hidden: [] // types de mails à ne plus afficher : « adresse », « @domaine » ou « catégorie:promotions »
};
var MAIL_RULES = null;
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
function mailBoxes(){ // boîtes connectées
  const b = [];
  if (GMAIL.email) b.push({id: "gmail", name: "Gmail", st: GMAIL, who: GMAIL.email});
  if (OUTLOOK.account) b.push({id: "outlook", name: "Outlook", st: OUTLOOK, who: OUTLOOK.account.username || ""});
  return b;
}
// ---------- Type d'un mail et masquage ----------
var MAIL_CATS = {promotions: "promotions (pubs, offres)", social: "réseaux sociaux", updates: "notifications (comptes, commandes, factures)", forums: "forums et groupes"};
var MAIL_COMMON = ["gmail.com", "googlemail.com", "outlook.com", "outlook.fr", "hotmail.com", "hotmail.fr", "live.fr", "live.com", "yahoo.fr", "yahoo.com", "icloud.com", "me.com", "orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "laposte.net"];
function mailType(m){
  const addr = ((m.from && m.from.emailAddress && m.from.emailAddress.address) || "").toLowerCase();
  const dom = addr.split("@")[1] || "", common = MAIL_COMMON.includes(dom);
  const auto = /^(no-?reply|ne-?pas-?repondre|newsletter|news|info|infos|notification|notifications|marketing|contact|hello|bonjour|mailer|bounce)/.test(addr);
  let kind;
  if (m.list || auto) kind = m.list ? "envoi automatique à une liste (newsletter, liste de diffusion)" : "envoi automatique (adresse qui n'attend pas de réponse)";
  else kind = common ? "mail d'une personne (adresse perso)" : "mail d'une personne ou d'un service de " + dom;
  return {addr, dom, common, cat: m.cat || "", kind};
}
function mailHiddenBy(m, r){
  const t = mailType(m);
  return (r.hidden || []).find(h => {
    h = String(h).toLowerCase().trim(); if (!h) return false;
    if (h.startsWith("catégorie:")) return t.cat && h.slice(10) === t.cat;
    if (h.startsWith("@")) return t.dom === h.slice(1) || t.dom.endsWith("." + h.slice(1));
    return t.addr === h;
  }) || null;
}
function mailHide(entry){
  const r = mailRulesLoad(), h = (r.hidden || []).slice();
  if (!h.includes(entry)) h.push(entry);
  mailRulesSave(Object.assign({}, r, {hidden: h}));
  MAIL_UI.hide = null; mailRender();
}
// Tous les mails de la période, sauf ceux marqués « Vu » et les types masqués ; les importants gardent leur raison
function mailList(){
  const all = [].concat(GMAIL.msgs || [], OUTLOOK.msgs || []);
  const r = mailRulesLoad(), seen = mailSeen(), lim = Date.now() - (r.days || 7) * 864e5;
  return all.filter(m => !seen.has(m.id) && new Date(m.receivedDateTime).getTime() >= lim && !mailHiddenBy(m, r))
    .map(m => ({m, why: mailWhy(m, r)}))
    .sort((a, b) => new Date(b.m.receivedDateTime) - new Date(a.m.receivedDateTime));
}
function mailImportant(){ return mailList().filter(x => x.why); }

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
      OUTLOOK.msgs = ((await r.json()).value || []).map(m => Object.assign(m, {box: "Outlook"})); OUTLOOK.at = Date.now(); OUTLOOK.err = "";
    }
  } catch(e) { OUTLOOK.err = mailErrText(e); }
  OUTLOOK.loading = false; mailRender();
}
// ---------- Gmail ----------
function gmKey(){ return "kinesis-gmail-" + mailUserKey(); }
function gmLoadState(){
  try { const o = JSON.parse(localStorage.getItem(gmKey())) || {}; GMAIL.email = o.email || ""; GMAIL.token = o.token || ""; GMAIL.exp = o.exp || 0; } catch(e) {}
}
function gmSaveState(){ try { localStorage.setItem(gmKey(), JSON.stringify({email: GMAIL.email, token: GMAIL.token, exp: GMAIL.exp})); } catch(e) {} }
function gmLoadLib(){
  if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
  return new Promise((ok, ko) => { const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.onload = ok; s.onerror = () => ko(new Error("bibliothèque Google non chargée (hors connexion ?)")); document.head.appendChild(s); });
}
function gmAsk(prompt){
  return new Promise((ok, ko) => {
    const c = google.accounts.oauth2.initTokenClient({
      client_id: window.GOOGLE_CLIENT_ID, scope: GMAIL.scope, prompt, hint: GMAIL.email || undefined,
      callback: r => r.error ? ko(new Error(r.error)) : ok(r),
      error_callback: e => ko(new Error((e && e.type) || "popup"))
    });
    c.requestAccessToken();
  });
}
async function gmTake(r){
  if (!google.accounts.oauth2.hasGrantedAllScopes(r, GMAIL.scope)) throw new Error("scope_refusé");
  GMAIL.token = r.access_token; GMAIL.exp = Date.now() + ((+r.expires_in || 3600) - 60) * 1000;
  if (!GMAIL.email) {
    const p = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {headers: {Authorization: "Bearer " + GMAIL.token}});
    if (p.ok) GMAIL.email = (await p.json()).emailAddress || "Gmail";
  }
  gmSaveState();
}
async function gmConnect(){
  try {
    if (!window.GOOGLE_CLIENT_ID) throw new Error("Kinésis n'est pas encore inscrit chez Google.");
    await gmLoadLib(); await gmTake(await gmAsk("select_account"));
    GMAIL.err = ""; await gmFetch(false);
  } catch(e) { GMAIL.err = gmErrText(e); mailRender(); }
}
function gmDisconnect(){
  try { if (GMAIL.token && window.google) google.accounts.oauth2.revoke(GMAIL.token, () => {}); } catch(e) {}
  GMAIL.email = GMAIL.token = ""; GMAIL.exp = 0; GMAIL.msgs = null; GMAIL.err = "";
  try { localStorage.removeItem(gmKey()); } catch(e) {}
  mailRender();
}
// Google ne donne qu'un jeton d'une heure au navigateur : après, un clic sur « Actualiser » le renouvelle (fenêtre éclair)
async function gmTok(interactive){
  if (GMAIL.token && Date.now() < GMAIL.exp) return GMAIL.token;
  if (!interactive) { GMAIL.err = "Clique sur « Actualiser » pour relire Gmail."; return null; }
  await gmLoadLib(); await gmTake(await gmAsk(""));
  return GMAIL.token;
}
function gmErrText(e){
  const m = String((e && e.message) || e);
  if (/popup_failed|popup_closed|popup/i.test(m)) return "La fenêtre Google a été fermée ou bloquée : autorise les fenêtres surgissantes pour Kinésis, puis réessaie.";
  if (/access_denied/i.test(m)) return "Connexion Google refusée.";
  if (/scope_refusé/.test(m)) return "Il faut cocher l'accès en lecture à tes mails sur la page Google, sinon Kinésis ne peut rien lire.";
  if (/401/.test(m)) { GMAIL.token = ""; GMAIL.exp = 0; gmSaveState(); return "Connexion Gmail expirée : clique sur « Actualiser »."; }
  return "Gmail : " + m.slice(0, 160);
}
function gmHeader(h, n){ const x = (h || []).find(y => y.name.toLowerCase() === n); return x ? x.value : ""; }
function gmFrom(v){
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>/.exec(v || "");
  return m ? {name: m[1].trim(), address: m[2].trim()} : {name: "", address: (v || "").trim()};
}
async function gmFetch(interactive){
  if (GMAIL.loading) return;
  GMAIL.loading = true; mailRender();
  try {
    const tok = await gmTok(interactive);
    if (tok) {
      const H = {headers: {Authorization: "Bearer " + tok}}, days = mailRulesLoad().days || 7;
      const l = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=60&q=" + encodeURIComponent("in:inbox newer_than:" + days + "d"), H);
      if (!l.ok) throw new Error("réponse " + l.status + " de Google");
      const ids = ((await l.json()).messages || []).map(x => x.id), out = [];
      for (let i = 0; i < ids.length; i += 15) { // 15 à la fois pour ne pas saturer Google
        const part = await Promise.all(ids.slice(i, i + 15).map(id =>
          fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/" + id + "?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Importance&metadataHeaders=X-Priority&metadataHeaders=List-Unsubscribe&metadataHeaders=List-Id", H)
            .then(r => r.ok ? r.json() : null).catch(() => null)));
        part.forEach(g => {
          if (!g) return;
          const h = g.payload && g.payload.headers, imp = gmHeader(h, "importance").toLowerCase(), pri = gmHeader(h, "x-priority");
          out.push({id: "g:" + g.id, box: "Gmail", subject: gmHeader(h, "subject"), from: {emailAddress: gmFrom(gmHeader(h, "from"))},
            receivedDateTime: new Date(+g.internalDate).toISOString(), bodyPreview: (g.snippet || "").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
            isRead: !(g.labelIds || []).includes("UNREAD"),
            cat: (((g.labelIds || []).find(l => /^CATEGORY_(PROMOTIONS|SOCIAL|UPDATES|FORUMS)$/.test(l)) || "").replace("CATEGORY_", "").toLowerCase()),
            list: !!(gmHeader(h, "list-unsubscribe") || gmHeader(h, "list-id")), importance: imp === "high" || /^\s*1/.test(pri) ? "high" : "normal",
            webLink: "https://mail.google.com/mail/?authuser=" + encodeURIComponent(GMAIL.email) + "#all/" + g.threadId});
        });
      }
      GMAIL.msgs = out; GMAIL.at = Date.now(); GMAIL.err = "";
    }
  } catch(e) { GMAIL.err = gmErrText(e); }
  GMAIL.loading = false; mailRender();
}
// ---------- Affichage ----------
function mailWhen(d){
  const t = new Date(d), now = new Date();
  return t.toDateString() === now.toDateString() ? t.toLocaleTimeString("fr-FR", {hour: "2-digit", minute: "2-digit"}) : t.toLocaleDateString("fr-FR", {weekday: "short", day: "numeric", month: "short"});
}
function mailConnectBtns(){
  const b = [];
  if (window.GOOGLE_CLIENT_ID && !GMAIL.email) b.push(`<button class="btn primary" id="gmConnect">Connecter Gmail</button>`);
  if (window.OUTLOOK_CLIENT_ID && !OUTLOOK.account) b.push(`<button class="btn${b.length ? " ghost" : " primary"}" id="mailConnect">Connecter Outlook</button>`);
  return b.join(" ");
}
function mailBoxHtml(){
  const r = mailRulesLoad(), boxes = mailBoxes();
  const errs = [GMAIL.err, OUTLOOK.err].filter(Boolean).map(e => `<p class="small mail-err">${esc(e)}</p>`).join("");
  if (!window.GOOGLE_CLIENT_ID && !window.OUTLOOK_CLIENT_ID) return `<div class="mail-empty">Kinésis n'est pas encore inscrit chez Google ni chez Microsoft. Dès que c'est fait, tu pourras connecter ta boîte ici.</div>`;
  if (!boxes.length) return `<div class="mail-empty"><p>Connecte ta boîte : Kinésis lira ta boîte de réception et ne gardera que les mails qui correspondent à tes règles.</p>
    <div class="row">${mailConnectBtns()}</div>${errs}</div>`;
  const imp = mailList(), loading = GMAIL.loading || OUTLOOK.loading, read = boxes.some(x => x.st.msgs !== null);
  const at = Math.max(GMAIL.at, OUTLOOK.at), multi = boxes.length > 1;
  const list = !read ? `<p class="small muted">${loading ? "Lecture de ta boîte..." : "Pas encore lu : clique sur « Actualiser »."}</p>`
    : imp.length ? `<ul class="mail-list">${imp.map(({m, why}) => `<li class="mail-it${m.isRead ? "" : " unread"}${why ? " imp" : ""}">
        <div class="mail-row"><a href="${esc(m.webLink || "#")}" target="_blank" rel="noopener" class="mail-a">
          <span class="mail-top"><b>${esc((m.from && m.from.emailAddress && (m.from.emailAddress.name || m.from.emailAddress.address)) || "?")}</b><span class="mail-t">${multi ? esc(m.box) + " · " : ""}${mailWhen(m.receivedDateTime)}</span></span>
          <span class="mail-s">${esc(m.subject || "(sans objet)")}</span>
          <span class="mail-p">${esc((m.bodyPreview || "").slice(0, 140))}</span>
          ${why ? `<span class="mail-why">Important · ${esc(why)}</span>` : ""}
        </a><span class="mail-btns"><button class="mail-ok" data-seen="${esc(m.id)}" title="Marquer comme vu (il disparaît d'ici, pas de ta boîte)">Vu</button>
        <button class="mail-ok mail-hide" data-hide="${esc(m.id)}" title="Ne plus jamais afficher ce type de mail">Masquer</button></span></div>
        ${MAIL_UI.hide === m.id ? mailHideHtml(m) : ""}</li>`).join("")}</ul>`
    : `<p class="small muted">Aucun mail à afficher ces ${r.days} derniers jours.</p>`;
  return `<div class="mail-head"><span class="small muted">${boxes.map(x => esc(x.who || x.name)).join(" · ")}${at ? " · lu à " + new Date(at).toLocaleTimeString("fr-FR", {hour: "2-digit", minute: "2-digit"}) : ""}</span>
      <button class="btn ghost small" id="mailRefresh">${loading ? "..." : "Actualiser"}</button>
      <button class="btn ghost small" id="mailRulesBtn">Mes règles</button></div>
    ${errs}
    ${MAIL_UI.open ? mailRulesHtml(r) : ""}
    ${list}`;
}
function mailHideHtml(m){
  const t = mailType(m), opts = [];
  if (t.addr) opts.push([t.addr, "Tous les mails de <b>" + esc(t.addr) + "</b>"]);
  if (t.dom && !t.common && t.dom !== t.addr) opts.push(["@" + t.dom, "Tous les mails de <b>" + esc(t.dom) + "</b> (toutes les adresses de ce domaine)"]);
  if (t.cat && MAIL_CATS[t.cat]) opts.push(["catégorie:" + t.cat, "Toute la catégorie Gmail <b>" + esc(MAIL_CATS[t.cat]) + "</b>"]);
  const warn = /(^|\.)univ-lyon1\.fr$/.test(t.dom) ? `<p class="small mail-err">Attention, ce mail vient de la fac : masquer le domaine cacherait aussi la scolarité.</p>` : "";
  return `<div class="mail-hidebox">
    <p class="small"><b>Type de ce mail :</b> ${esc(t.kind)}${t.cat && MAIL_CATS[t.cat] ? ", rangé par Gmail dans « " + esc(MAIL_CATS[t.cat]) + " »" : ""}.</p>${warn}
    <p class="small muted">Ne plus jamais afficher :</p>
    <div class="mail-hideopts">${opts.map(([v, l]) => `<button class="btn ghost small" data-hidev="${esc(v)}">${l}</button>`).join("")}
      <button class="btn ghost small" data-hidecancel>Annuler</button></div>
    <p class="small muted">Tu pourras toujours revenir en arrière dans « Mes règles ».</p>
  </div>`;
}
function mailRulesHtml(r){
  return `<div class="mail-rules">
    <label class="small"><b>Expéditeurs importants</b> <span class="muted">(adresse, domaine comme univ-lyon1.fr, ou nom ; un par ligne)</span>
      <textarea id="mrSenders" rows="3">${esc((r.senders || []).join("\n"))}</textarea></label>
    <label class="small"><b>Mots-clés</b> <span class="muted">(dans l'objet ou le début du mail ; un par ligne)</span>
      <textarea id="mrKeys" rows="4">${esc((r.keywords || []).join("\n"))}</textarea></label>
    <label class="small"><b>Mails masqués</b> <span class="muted">(une adresse, @domaine ou catégorie:promotions par ligne ; efface une ligne pour les revoir)</span>
      <textarea id="mrHidden" rows="3">${esc((r.hidden || []).join("\n"))}</textarea></label>
    <div class="set"><div class="lbl"><b>Mails marqués « importance haute »</b><span>Ceux que l'expéditeur a signalés comme importants.</span></div><button class="switch${r.importance ? " on" : ""}" id="mrImp"></button></div>
    <label class="small"><b>Période</b> <select id="mrDays">${[1, 3, 7, 14, 30].map(d => `<option value="${d}"${d === r.days ? " selected" : ""}>${d} jour${d > 1 ? "s" : ""}</option>`).join("")}</select></label>
    <div class="row"><button class="btn small" id="mrSave">Enregistrer les règles</button>${GMAIL.email ? `<button class="btn ghost small" id="gmOut">Déconnecter Gmail</button>` : ""}${OUTLOOK.account ? `<button class="btn ghost small" id="mailOut">Déconnecter Outlook</button>` : ""}${mailConnectBtns().replace(/btn( primary)?"/g, 'btn ghost small"')}</div>
  </div>`;
}
function mailRender(){
  const box = $("mailBox"); if (!box || !OUTLOOK) return; // fichier pas encore exécuté
  const on = typeof modOn === "function" && modOn("mails");
  box.classList.toggle("hidden", !on); if (!on) return;
  $("mailBody").innerHTML = mailBoxHtml();
  const card = document.querySelector("#subjects [data-mod-open]");
  if (card && typeof mailsCard === "function") { card.outerHTML = mailsCard(); const c2 = document.querySelector("#subjects [data-mod-open]"); if (c2) c2.onclick = () => box.scrollIntoView({behavior: "smooth", block: "start"}); }
  const n = mailImportant().length, badge = $("mailCount");
  if (badge) { badge.textContent = n; badge.classList.toggle("hidden", !n); }
  const q = id => $("mailBody").querySelector("#" + id);
  if (q("mailConnect")) q("mailConnect").onclick = mailConnect;
  if (q("gmConnect")) q("gmConnect").onclick = gmConnect;
  if (q("mailRefresh")) q("mailRefresh").onclick = mailRefreshAll;
  if (q("mailRulesBtn")) q("mailRulesBtn").onclick = () => { MAIL_UI.open = !MAIL_UI.open; mailRender(); };
  if (q("mailOut")) q("mailOut").onclick = mailDisconnect;
  if (q("gmOut")) q("gmOut").onclick = gmDisconnect;
  if (q("mrImp")) q("mrImp").onclick = e => e.currentTarget.classList.toggle("on");
  if (q("mrSave")) q("mrSave").onclick = () => {
    const lines = id => q(id).value.split(/\n|,/).map(s => s.trim()).filter(Boolean);
    mailRulesSave({senders: lines("mrSenders"), keywords: lines("mrKeys"), hidden: q("mrHidden").value.split(/\n/).map(x => x.trim()).filter(Boolean), importance: q("mrImp").classList.contains("on"), days: +q("mrDays").value});
    MAIL_UI.open = false; mailRefreshAll(false);
  };
  $("mailBody").querySelectorAll("[data-seen]").forEach(b => b.onclick = () => { mailSeenAdd(b.dataset.seen); mailRender(); });
  $("mailBody").querySelectorAll("[data-hide]").forEach(b => b.onclick = () => { MAIL_UI.hide = MAIL_UI.hide === b.dataset.hide ? null : b.dataset.hide; mailRender(); });
  $("mailBody").querySelectorAll("[data-hidev]").forEach(b => b.onclick = () => mailHide(b.dataset.hidev));
  $("mailBody").querySelectorAll("[data-hidecancel]").forEach(b => b.onclick = () => { MAIL_UI.hide = null; mailRender(); });
}
// Gmail d'abord : sa fenêtre éclair doit partir tout de suite après le clic
function mailRefreshAll(interactive){
  interactive = interactive !== false;
  if (GMAIL.email) gmFetch(interactive);
  if (OUTLOOK.account) mailFetch(interactive);
}
var MAIL_UID = null;
// Au chargement du tableau de bord : on relit les boîtes au plus toutes les 5 minutes
async function mailOnHome(){
  if (!OUTLOOK) return;
  if (MAIL_UID !== mailUserKey()) { MAIL_UID = mailUserKey(); GMAIL.msgs = null; GMAIL.at = 0; gmLoadState(); }
  if (!(typeof modOn === "function" && modOn("mails"))) return mailRender();
  mailRender();
  if (GMAIL.email && GMAIL.token && Date.now() < GMAIL.exp && Date.now() - GMAIL.at > 5 * 60e3) gmFetch(false);
  if (!window.OUTLOOK_CLIENT_ID) return;
  try { await mailApp(); } catch(e) { OUTLOOK.err = mailErrText(e); }
  if (OUTLOOK.account && Date.now() - OUTLOOK.at > 5 * 60e3) mailFetch(false); else mailRender();
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && typeof view !== "undefined" && view === "home") mailOnHome(); });
// ce fichier est exécuté après le premier affichage : on remplit la boîte maintenant
if (typeof view !== "undefined" && view === "home") mailOnHome();
