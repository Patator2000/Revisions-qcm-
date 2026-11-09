// ================= Signaler une erreur =================
const RP_KEY = "qcm-reports-v1";
const RP_TYPES = ["La réponse indiquée est fausse", "L'explication est fausse ou incomplète", "La question est ambiguë ou mal formulée", "Faute de frappe ou d'orthographe", "Hors programme", "Autre"];
function lsReports(){ try { return JSON.parse(localStorage.getItem(RP_KEY) || "[]"); } catch(e){ return []; } }
function lsAddReport(r){ try { const l = lsReports(); l.push(r); localStorage.setItem(RP_KEY, JSON.stringify(l)); return true; } catch(e){ return false; } }
let reportOpenFor = null;
function renderReportLink(){
  const box = $("reportBox"); if (!box) return;
  const qi = deck[cur], id = S.id + fmt + qi;
  if (reportOpenFor === id) return; // formulaire déjà ouvert sur cette question
  reportOpenFor = null;
  box.innerHTML = `<button class="linkbtn" type="button">Signaler une erreur sur cette question</button>`;
  box.querySelector("button").onclick = () => openReport(qi, id);
}
function openReport(qi, id){
  reportOpenFor = id;
  const q = items()[qi], box = $("reportBox");
  box.innerHTML = `<div class="report"><b class="small">Signaler une erreur</b>
    <select class="rp-type">${RP_TYPES.map(t => `<option>${t}</option>`).join("")}</select>
    <textarea class="rp-msg" rows="2" placeholder="Précise si tu veux (ex. : le cours dit plutôt que...)"></textarea>
    <div class="row"><button class="btn primary small rp-send" type="button">Envoyer</button><button class="btn ghost small rp-cancel" type="button">Annuler</button><span class="small muted rp-out"></span></div></div>`;
  box.querySelector(".rp-msg").addEventListener("keydown", e => e.stopPropagation());
  box.querySelector(".rp-cancel").onclick = () => { reportOpenFor = null; renderReportLink(); };
  box.querySelector(".rp-send").onclick = async () => {
    const r = {matiere: S.name, format: FMT_LABEL[fmt], theme: S.THEMES[q[1]], cle: keys()[qi], question: q[2],
      type: box.querySelector(".rp-type").value, commentaire: box.querySelector(".rp-msg").value.trim().slice(0, 2000),
      date: new Date().toISOString(), statut: "nouveau"};
    const btn = box.querySelector(".rp-send"); btn.disabled = true;
    let online = false;
    if (DB) { try { await DB.collection("reports").add(r); online = true; } catch(e) { online = false; } }
    lsAddReport(r);
    box.innerHTML = `<p class="small ok-t">Merci, signalement enregistré${online ? "" : " dans ce navigateur"}. ${online ? "Demande-moi dans la conversation de « traiter les signalements » pour que je corrige." : "Utilise « Copier mes signalements » sur la page de la matière pour me les envoyer."}</p>`;
    reportOpenFor = id;
    renderReports();
  };
}
function renderReports(){
  const n = lsReports().length, row = $("reportsRow"); if (!row) return;
  row.classList.toggle("hidden", !n);
  $("reportsCount").textContent = `${n} signalement${n>1?"s":""} envoyé${n>1?"s":""} depuis ce navigateur.`;
}
$("reportsCopy").onclick = async () => {
  const txt = lsReports().map((r,i) => `${i+1}. [${r.matiere} - ${r.format} - ${r.theme}] ${r.question}\n   Problème : ${r.type}${r.commentaire ? " - " + r.commentaire : ""}`).join("\n\n");
  try { await navigator.clipboard.writeText(txt); $("reportsMsg").textContent = "Copié : colle-le dans la conversation."; }
  catch(e) { $("reportsDump").value = txt; $("reportsDump").classList.remove("hidden"); $("reportsDump").select(); $("reportsMsg").textContent = "Sélectionne le texte et copie-le."; }
};

// ================= Mode vocal =================
let rec = null, micOff = false, listening = false, lastSpoken = "", speaking = false;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function norm(s){ return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim(); }
function setVoiceNote(t){ const n = $("voiceNote"); if (!n) return; n.textContent = t; n.classList.toggle("hidden", !t); }
function voiceRead(){} // plus de lecture à voix haute : le mode vocal écoute seulement
function voiceStart(){
  lastSpoken = "";
  if (window.VOICE_ENGINE === "vosk") return voskStart();
  if (!opts.voice || fmt === "open") { setVoiceNote(""); return; }
  if (!SR) { setVoiceNote("Ton navigateur ne propose pas la reconnaissance vocale. Sur ordinateur ou Android, utilise Chrome ; sur iPhone, utilise Safari avec la dictée activée (Réglages, Général, Clavier). En attendant, réponds avec V, F, N, A à E, P, Entrée."); return; }
  if (micOff) { setVoiceNote(MIC_MSG); return; }
  listening = true; voiceListen();
}
let voiceRestartT = null, voiceFails = 0, voiceLastErr = "";
// Commandes vocales autorisées selon le format et le mode
function voiceCmds(){
  const nav = !examMode();
  if (fmt === "vf") return {vf: true, nav, letters: false, valider: false};
  if (fmt === "qcm") return {vf: false, nav: true, letters: true, valider: true}; // CT : navigation aussi en examen
  return {vf: false, nav: false, letters: false, valider: false};
}
function voiceHelpText(){
  const c = voiceCmds(), p = [];
  if (c.vf) p.push("« vrai », « faux »");
  if (c.letters) p.push("une ou plusieurs lettres (« A », « A et C »), puis « valider »");
  if (c.nav) p.push("« suivante », « précédente »");
  return "Dis " + p.join(", ") + ".";
}
function voiceListen(){
  if (!listening || micOff || view !== "quiz" || paused) return;
  try {
    rec = new SR(); rec.lang = "fr-FR"; rec.continuous = false; rec.interimResults = true; rec.maxAlternatives = 3;
    rec.onstart = () => setVoiceNote("🎙 J'écoute... " + voiceHelpText());
    rec.onspeechstart = () => setVoiceNote("🎙 J'entends ta voix...");
    rec.onresult = ev => {
      const r = ev.results[ev.results.length - 1];
      if (!r.isFinal) { setVoiceNote(`🎙 « ${r[0].transcript.trim()} »...`); return; }
      voiceFails = 0;
      const alts = []; for (let i = 0; i < r.length; i++) alts.push(r[i].transcript);
      if (!alts.some(t => handleVoice(t))) setVoiceNote(`Entendu « ${alts[0].trim()} » mais pas compris. ${voiceHelpText()}`);
    };
    rec.onerror = ev => {
      const er = ev.error; if (er !== "aborted" && er !== "no-speech") voiceLastErr = er;
      if (er === "not-allowed" || er === "service-not-allowed") { micOff = true; listening = false; setVoiceNote(MIC_MSG); }
      else if (er === "audio-capture") { micOff = true; listening = false; setVoiceNote("Aucun micro détecté : vérifie qu'un micro est branché et autorisé, puis recharge la page."); }
      else if (er === "network") { voiceFails++; setVoiceNote("La reconnaissance vocale a besoin d'Internet (elle passe par les serveurs du navigateur). Vérifie ta connexion."); }
      else if (er === "no-speech") setVoiceNote("🎙 Je n'entends rien... parle un peu plus fort ou plus près du micro.");
      else if (er === "language-not-supported") { micOff = true; listening = false; setVoiceNote("Ton navigateur ne reconnaît pas le français : réponds au clavier."); }
      else if (er !== "aborted") { voiceFails++; setVoiceNote(`Erreur de reconnaissance vocale (${er}). Je réessaie...`); }
    };
    rec.onend = () => {
      clearTimeout(voiceRestartT);
      if (listening && !micOff && view === "quiz" && !paused && voiceFails < 5) voiceRestartT = setTimeout(voiceListen, 250);
      else if (voiceFails >= 5) setVoiceNote(voiceLastErr === "network"
        ? "La reconnaissance vocale ne répond pas (code : network). Ton navigateur n'arrive pas à joindre son service de reconnaissance vocale. Ça arrive avec Brave, Opera, Vivaldi, Firefox, certains navigateurs Samsung, ou avec un VPN ou un bloqueur de publicité. Essaie avec Google Chrome sans VPN, ou réponds au clavier."
        : `La reconnaissance vocale ne répond pas (code : ${voiceLastErr || "inconnu"}). Recharge la page ou réponds au clavier, et donne-moi ce code.`);
    };
    rec.start();
  } catch(err) { setVoiceNote("Reconnaissance vocale indisponible (" + (err && err.message || err) + ") : réponds au clavier."); }
}
const MIC_MSG = "Micro bloqué : claude.ai n'autorise pas le micro dans ses pages publiées. Utilise la version « micro » à ouvrir dans Chrome, ou réponds au clavier (V, F, N, A à E, P, Entrée).";
function recPause(){ if (rec && listening) { try { rec.abort(); } catch(e) {} } }
function recResume(){}
function voiceStop(){ if (window.VOICE_ENGINE === "vosk") voskStop(); listening = false; clearTimeout(voiceRestartT); try { if (rec) rec.abort(); } catch(e) {} }
const LETTER_WORDS = {a:0, ah:0, b:1, be:1, bee:1, c:2, ce:2, se:2, cest:2, d:3, de:3, dee:3, e:4, eu:4, euh:4};
function handleVoice(raw){
  if (view !== "quiz" || paused) return false;
  const t = norm(raw), c = voiceCmds();
  const ok = (msg) => { setVoiceNote(`✓ « ${raw.trim()} »${msg ? " : " + msg : ""}`); return true; };
  if (c.nav && /\bsuivant/.test(t)) { $("next").click(); return ok(); }
  if (c.nav && /\bprecedent/.test(t)) { $("prev").click(); return ok(); }
  if (c.vf) {
    if (isLocked()) return /\b(vrai|faux)\b/.test(t) ? ok("déjà répondu, dis « suivante »") : false;
    if (/\b(vrai|vrais|vraie|vrae|vre)\b/.test(t)) { answerVF(1); return ok("VRAI"); }
    if (/\b(faux|fau|faut|fo|phot|photo)\b/.test(t)) { answerVF(0); return ok("FAUX"); }
  }
  if (c.letters && !isLocked()) {
    if (c.valider && /\bvalid/.test(t)) { validateMCQ(); return ok("validé"); }
    const toks = t.replace(/\b(reponses?|lettres?|et|la|les|le|je|coche|prends?)\b/g, " ").split(" ").filter(Boolean);
    if (toks.length && toks.every(w => w in LETTER_WORDS)) {
      const sel = [...new Set(toks.map(w => LETTER_WORDS[w]))].sort();
      answers[cur] = {sel, nsp:false, done:false}; if (examMode()) commit(cur); render();
      return ok(sel.map(j => LET[j]).join(", ") + " (dis « valider »)");
    }
  }
  return false;
}

// ================= Synchronisation par copier-coller =================
function syncExport(){
  const out = {v:1, at: Date.now(), s:{}};
  for (const x of Object.values(SUBJECTS)) if (fmtList(x).length) out.s[x.id] = x.mem;
  return "QCMSYNC:" + btoa(unescape(encodeURIComponent(JSON.stringify(out))));
}
function syncMerge(code){
  const raw = code.trim().replace(/^QCMSYNC:/, "");
  const data = JSON.parse(decodeURIComponent(escape(atob(raw))));
  if (!data || !data.s) throw new Error("format");
  let added = 0, updated = 0;
  for (const id in data.s) {
    const x = SUBJECTS[id]; if (!x) continue;
    for (const k in data.s[id]) {
      const inc = data.s[id][k], mine = x.mem[k];
      if (!inc || typeof inc !== "object") continue;
      if (!mine) { x.mem[k] = inc; added++; }
      else if ((inc.t || 0) > (mine.t || 0)) {
        // on garde l'état le plus récent, et le total des compteurs le plus élevé
        x.mem[k] = {...inc, s: Math.max(inc.s||0, mine.s||0), g: Math.max(inc.g||0, mine.g||0), p: Math.max(inc.p||0, mine.p||0), k: Math.max(inc.k||0, mine.k||0), n: Math.max(inc.n||0, mine.n||0)};
        updated++;
      }
    }
    scheduleSave(x);
  }
  return {added, updated};
}
$("syncCopy").onclick = async () => {
  const code = syncExport();
  try { await navigator.clipboard.writeText(code); $("syncMsg").textContent = "Copié. Colle-le dans l'autre version (bouton « Coller une progression »)."; }
  catch(e) { $("syncArea").value = code; $("syncArea").classList.remove("hidden"); $("syncArea").select(); $("syncMsg").textContent = "Sélectionne le code et copie-le (Ctrl + C)."; }
};
$("syncOpen").onclick = () => { $("syncArea").value = ""; $("syncArea").classList.remove("hidden"); $("syncRow").classList.remove("hidden"); $("syncArea").focus(); $("syncMsg").textContent = ""; };
$("syncImport").onclick = () => {
  try { const r = syncMerge($("syncArea").value); $("syncMsg").textContent = `Fusion faite : ${r.added} question${r.added>1?"s":""} ajoutée${r.added>1?"s":""}, ${r.updated} mise${r.updated>1?"s":""} à jour.`; $("syncArea").classList.add("hidden"); $("syncRow").classList.add("hidden"); renderHome(); }
  catch(e) { $("syncMsg").textContent = "Code non reconnu : vérifie que tu as tout collé."; }
};
