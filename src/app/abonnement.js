// ================= Abonnement Kinésis+ (4,99 € / mois) : PRÉPARÉ, DÉSACTIVÉ =================
// Tant que window.ABONNEMENT_ACTIF vaut false (réglé dans build.py), ce module ne montre rien
// et ne bloque rien : tout le site reste gratuit et identique.
// Pour l'activer : voir docs/abonnement.md.
const PREMIUM = {
  prix: "4,99 €",
  // Fonctions réservées aux abonnés une fois l'abonnement activé (à choisir) :
  //   "examens" = simulations CCI / CT chronométrées
  reserve: window.ABONNEMENT_RESERVE || [],
  avantages: [
    "Tous les cours : CM, TD et QCM 3 et suivants (les cours 1 et 2 restent gratuits)",
    "Les nouvelles questions dès chaque nouveau cours",
    "Simulations d'examen sur tout le programme",
    "Essai gratuit de 7 jours à la création du profil"
  ],
  acces: null, essaiFin: null, charge: false,
  etat: null // null = inconnu, true / false une fois vérifié
};
const premiumOn = () => window.ABONNEMENT_ACTIF === true;

async function premiumCheck(force){
  if (!premiumOn()) return true;
  if (PREMIUM.etat !== null && !force) return PREMIUM.etat;
  if (typeof SB === "undefined" || !SB || !SB_USER) return (PREMIUM.etat = false);
  try { const r = await SB.rpc("is_premium"); PREMIUM.etat = !r.error && r.data === true; }
  catch(e) { PREMIUM.etat = false; }
  return PREMIUM.etat;
}
// Accès aux questions Kinésis+ (abonné ou en essai) : chargées depuis Supabase, à leur place d'origine
async function premiumLoad(){
  if (!premiumOn() || PREMIUM.charge || typeof SB === "undefined" || !SB || !SB_USER) return;
  try {
    const a = await SB.rpc("has_access"); PREMIUM.acces = !a.error && a.data === true;
    const e = await SB.rpc("trial_end"); PREMIUM.essaiFin = e.data ? new Date(e.data) : null;
    if (!PREMIUM.acces) return;
    let from = 0, n = 0;
    for (;;) {
      const r = await SB.from("premium_content").select("subject,fmt,idx,item").order("subject").order("fmt").order("idx").range(from, from + 999);
      if (r.error) throw r.error;
      for (const row of r.data) {
        const x = SUBJECTS[row.subject]; if (!x || !x.F[row.fmt]) continue;
        const cur = x.F[row.fmt][row.idx];
        if (qLocked(cur)) { x.F[row.fmt][row.idx] = row.item; n++; }
      }
      if (r.data.length < 1000) break; from += 1000;
    }
    PREMIUM.charge = true;
    if (n && view !== "quiz") renderView();
  } catch(e) { console.warn("Kinésis+ : chargement impossible", e); }
}
function premiumTrialLeft(){ if (!PREMIUM.essaiFin) return 0; return Math.max(0, Math.ceil((PREMIUM.essaiFin - Date.now()) / 864e5)); }
// Lance fn si la fonction est libre (ou si l'abonnement est désactivé), sinon propose Kinésis+
async function premiumGate(feature, fn){
  if (!premiumOn() || !PREMIUM.reserve.includes(feature) || await premiumCheck()) return fn();
  premiumOffer(feature);
}
async function premiumCall(fnName){
  const s = await SB.auth.getSession(); const tok = s.data && s.data.session && s.data.session.access_token;
  const r = await fetch(`${window.SUPA_URL}/functions/v1/${fnName}`, {method: "POST", headers: {Authorization: `Bearer ${tok}`, apikey: window.SUPA_KEY, "Content-Type": "application/json"}, body: "{}"});
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.url) throw new Error(j.error || ("erreur " + r.status));
  location.href = j.url;
}
function premiumOffer(feature){
  if (!premiumOn()) return;
  const old = $("premiumBox"); if (old) old.remove();
  const d = document.createElement("div"); d.id = "premiumBox"; d.className = "prem-wrap";
  const online = storeMode === "account" && SB_USER;
  d.innerHTML = `<div class="prem-card" role="dialog" aria-label="Kinésis+">
    <button class="prem-x" aria-label="Fermer">×</button>
    <div class="prem-badge">Kinésis+</div>
    <h2>${feature === "contenu" ? (PREMIUM.essaiFin && PREMIUM.essaiFin < new Date() ? "Ton essai gratuit est terminé" : "Les cours 3 et suivants sont dans Kinésis+") : feature ? "Cette fonction fait partie de Kinésis+" : "Passe à Kinésis+"}</h2>
    <div class="prem-price"><b>${PREMIUM.prix}</b> / mois <span>sans engagement, résiliable à tout moment</span></div>
    <ul>${PREMIUM.avantages.map(a => `<li>${a}</li>`).join("")}</ul>
    <button class="btn primary" id="premGo" ${online ? "" : "disabled"}>${online ? "S'abonner" : "Connecte-toi à un profil pour t'abonner"}</button>
    <p class="small muted" id="premMsg" style="min-height:1.2em;margin:8px 0 0">Paiement sécurisé par Stripe. Kinésis ne voit jamais tes coordonnées bancaires.</p>
  </div>`;
  document.body.appendChild(d);
  d.querySelector(".prem-x").onclick = () => d.remove();
  d.onclick = e => { if (e.target === d) d.remove(); };
  const go = d.querySelector("#premGo");
  if (online) go.onclick = async () => { go.disabled = true; go.textContent = "Ouverture du paiement..."; try { await premiumCall("abonnement-paiement"); } catch(e) { go.disabled = false; go.textContent = "S'abonner"; d.querySelector("#premMsg").textContent = "Impossible d'ouvrir le paiement : " + e.message; } };
}
function premiumNote(t){ const m = document.createElement("div"); m.className = "pg-off"; m.textContent = t; document.querySelector("main").prepend(m); setTimeout(() => m.remove(), 9000); }
async function premiumManage(){ try { await premiumCall("abonnement-gestion"); } catch(e) { premiumNote("Impossible d'ouvrir la gestion de l'abonnement : " + e.message); } }

if (premiumOn()) {
  // retour depuis Stripe
  const q = new URLSearchParams(location.search).get("abonnement");
  if (q) {
    history.replaceState(null, "", location.pathname);
    setTimeout(async () => { const ok = await premiumCheck(true); premiumNote(q === "merci" ? (ok ? "Bienvenue dans Kinésis+ ! Merci pour ton soutien." : "Paiement reçu : ton abonnement sera actif dans quelques secondes (recharge la page).") : "Paiement annulé : rien n'a été prélevé."); }, 1500);
  }
  // fonctions réservées : interception avant le lancement (synchrone, d'après l'état déjà vérifié)
  let premiumPass = false;
  document.addEventListener("click", e => {
    const b = e.target.closest("#simStart");
    if (!b || premiumPass || !PREMIUM.reserve.includes("examens") || PREMIUM.etat === true) return;
    e.stopImmediatePropagation(); e.preventDefault();
    premiumCheck().then(ok => { if (ok) { premiumPass = true; b.click(); premiumPass = false; } else premiumOffer("examens"); });
  }, true);
}
