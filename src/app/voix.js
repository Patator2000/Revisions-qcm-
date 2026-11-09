// ================= Reconnaissance vocale intégrée (Vosk, sur l'appareil) =================
// Utilisée sur le site : marche dans tous les navigateurs (Brave compris), sans service extérieur.
const VOSK_MODELS = [
  "models/vosk-model-small-fr.tar.gz",                                                   // copie hébergée sur le site (si présente)
  "https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-fr-pguyot-0.3.tar.gz" // modèle public de secours
];
let vPartial = "", vPartialT = null, vRecGrammar = "", vLastAudio = 0, vWatch = null, voskTries = 0, vModel = null, vModelPromise = null, vRec = null, vStream = null, vCtx = null, vNode = null, vSrc = null, vOn = false;
function voskGrammar(){
  const c = voiceCmds(), w = [];
  if (c.vf) w.push("vrai", "faux");
  if (c.nav) w.push("suivante", "suivant", "précédente", "précédent");
  if (c.letters) {
    const L = ["a","b","c","d","e"];
    for (let m = 1; m < 32; m++) { const s = L.filter((_, i) => m & (1 << i)); w.push(s.join(" ")); if (s.length > 1) w.push(s.slice(0, -1).join(" ") + " et " + s[s.length - 1]); }
    w.push("bé", "cé", "dé", "eu");
  }
  if (c.valider) w.push("valider", "valide");
  // enchaînements courts dits sans vraie pause (« vrai... suivante », « suivante... faux »)
  const q = [];
  if (c.vf) q.push("vrai", "faux");
  if (c.nav) q.push("suivante", "précédente");
  if (c.valider) q.push("valider");
  for (const a of q) for (const b of q) { if (a !== b) w.push(a + " " + b); for (const d of q) if (a !== b && b !== d) w.push(a + " " + b + " " + d); }
  // mots « leurres » : un « hmm », « euh »... est classé ici au lieu d'être pris pour « vrai »
  w.push(...voskFillers(c));
  w.push("[unk]");
  return JSON.stringify(w);
}
function voskFillers(c){
  const f = ["hum", "hm", "hmm", "mh", "oh", "hein"];
  if (!(c || voiceCmds()).letters) f.push("euh", "heu", "ah"); // pas en QCM : confusion avec les lettres A et E
  return f;
}
const VOSK_FILLER = new Set(["hum", "hm", "hmm", "mh", "oh", "hein", "euh", "heu", "ah"]);
const voskClean = t => t.replace(/\[unk\]/g, " ").split(/\s+/).filter(x => x && !(VOSK_FILLER.has(x) && !(voiceCmds().letters && (x === "ah" || x === "euh" || x === "heu")))).join(" ");
function loadScript(src){ return new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => ko(new Error("script")); document.head.appendChild(s); }); }
async function voskModel(){
  if (vModel) return vModel;
  if (vModelPromise) return vModelPromise;
  vModelPromise = (async () => {
    if (!window.Vosk) await loadScript("vendor/vosk.js");
    const t0 = Date.now();
    const tick = setInterval(() => { if (view === "quiz" && opts.voice) setVoiceNote(`⏳ Chargement de la reconnaissance vocale (environ 40 Mo la première fois, puis gardée par le navigateur)... ${Math.round((Date.now() - t0)/1000)} s`); }, 1000);
    try {
      let lastErr = null;
      for (const url of VOSK_MODELS) {
        try {
          if (!/^https?:/.test(url)) { const h = await fetch(url, {method: "HEAD"}); if (!h.ok) continue; }
          // adresse complète obligatoire : le modèle est chargé par un « worker » qui ne connaît pas l'adresse de la page
          const m = new Vosk.Model(new URL(url, location.href).href, -1);
          vModel = await new Promise((ok, ko) => {
            const to = setTimeout(() => ko(new Error("timeout")), 180000);
            m.on("load", msg => { clearTimeout(to); msg.result ? ok(m) : ko(new Error("load")); });
            m.on("error", msg => { clearTimeout(to); ko(new Error(msg && msg.error || "error")); });
          });
          return vModel;
        } catch(e) { lastErr = e; }
      }
      throw lastErr || new Error("model");
    } finally { clearInterval(tick); }
  })();
  try { return await vModelPromise; } catch(e) { vModelPromise = null; throw e; }
}
async function voskStart(){
  if (!opts.voice || fmt === "open") { setVoiceNote(""); voskStop(); return; }
  vOn = true;
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw {name: "NoMedia"};
    if (!vStream) vStream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true, channelCount: 1}, video: false});
    if (!vOn) return;
    // micro coupé (veille, casque Bluetooth, autre appli) : on le rouvre
    if (vStream && !vStream.getAudioTracks().some(t => t.readyState === "live")) voskResetAudio();
    if (!vStream) vStream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true, channelCount: 1}, video: false});
    vStream.getAudioTracks().forEach(t => { t.onended = () => { voskResetAudio(); if (view === "quiz" && opts.voice) voskStart(); }; });
    if (!vModel) setVoiceNote("⏳ Préparation de la reconnaissance vocale...");
    const model = await voskModel();
    if (!vOn) return;
    if (vCtx && vCtx.state === "closed") { vCtx = null; vNode = null; vSrc = null; }
    vCtx = vCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (vCtx.state !== "running") { try { await vCtx.resume(); } catch(e) {} }
    // un seul « écouteur » réutilisé tant que les mots attendus ne changent pas :
    // en recréer un à chaque question saturait la mémoire du moteur vers la 8e-13e question
    const g = voskGrammar();
    if (!vRec || vRecGrammar !== g) {
      if (vRec) { try { vRec.remove(); } catch(e) {} }
      vRec = new model.KaldiRecognizer(vCtx.sampleRate, g); vRecGrammar = g;
      vRec.on("partialresult", m => {
        const raw = (m.result && m.result.partial || "").replace(/\[unk\]/g, " ").replace(/\s+/g, " ").trim(), p = voskClean(raw);
        if (!raw) return; // silence : rien à faire
        if (p !== raw) {
          // la phrase en cours contient un leurre (« hmm », « euh »...) : on annule toute validation anticipée
          clearTimeout(vPartialT); vPartial = raw; return;
        }
        if (p !== vPartial) setVoiceNote(`🎙 « ${p} »...`);
        voskEarlyCommit(p);
      });
      vRec.on("result", m => {
        vPartial = ""; clearTimeout(vPartialT);
        const done = vExec; vExec = {};
        const t = voskClean(m.result && m.result.text || "");
        if (!t) { if (vPartial === "" && /🎙 « /.test(($("voiceNote") || {}).textContent || "")) setVoiceNote("🎙 J'écoute... " + voiceHelpText()); return; } // bruit ou « hmm » : ignoré
        if (voskFinal(t, done)) return; // commandes simples (déjà exécutées pendant la phrase ou non)
        if (!handleVoice(t)) setVoiceNote(`Entendu « ${t} » mais pas compris. ${voiceHelpText()}`);
      });
    }
    if (!vNode) {
      vSrc = vCtx.createMediaStreamSource(vStream);
      vNode = vCtx.createScriptProcessor(4096, 1, 1);
      vNode.onaudioprocess = ev => { vLastAudio = Date.now(); if (vOn && vRec && !paused && view === "quiz") { try { vRec.acceptWaveform(ev.inputBuffer); } catch(e) {} } };
      vSrc.connect(vNode); vNode.connect(vCtx.destination);
    }
    vLastAudio = Date.now();
    if (!vWatch) vWatch = setInterval(voskWatchdog, 4000);
    voskTries = 0;
    setVoiceNote("🎙 J'écoute... " + voiceHelpText());
  } catch(e) {
    vOn = false;
    const n = e && e.name;
    setVoiceNote(n === "NotAllowedError" || n === "SecurityError" ? MIC_MSG
      : n === "NotFoundError" ? "Aucun micro détecté : vérifie qu'un micro est branché et autorisé, puis recharge la page."
      : n === "NoMedia" ? "Ton navigateur ne donne pas accès au micro sur cette page."
      : null);
    if (!(n === "NotAllowedError" || n === "SecurityError" || n === "NotFoundError" || n === "NoMedia")) {
      console.warn("Vosk", e);
      voskTries++;
      if (voskTries <= 2) { // petite coupure réseau : on réessaie tout seul
        setVoiceNote("⏳ Nouvel essai de chargement de la reconnaissance vocale...");
        setTimeout(() => { if (view === "quiz" && opts.voice && !vOn) voskStart(); }, 3000);
        return;
      }
      setVoiceNote("La reconnaissance vocale n'a pas pu se charger. Tu peux répondre au clavier en attendant.");
      const nEl = $("voiceNote"), b = document.createElement("button");
      b.className = "linkbtn"; b.textContent = "Réessayer"; b.style.marginLeft = "8px";
      b.onclick = () => { voskTries = 0; voskStart(); };
      nEl.appendChild(b);
    }
  }
}
// Le moteur n'accepte qu'une commande par phrase : si « vrai » puis « suivante » tombent dans la même phrase,
// seul le dernier mot ressortait. On exécute donc tout de suite une commande simple dès qu'elle reste stable
// un court instant pendant la phrase, et on ignore ensuite sa répétition dans le résultat final.
const VOSK_QUICK = /^(vrai|faux|suivante?|précédente?|valider?)$/;
let vExec = {}; // nombre de fois où chaque commande a déjà été exécutée dans la phrase en cours
const vCount = (words, w) => words.filter(x => x === w).length;
function voskEarlyCommit(p){
  if (p === vPartial) return;
  vPartial = p; clearTimeout(vPartialT);
  const words = p.split(" "), last = words[words.length - 1];
  if (!VOSK_QUICK.test(last) || (vExec[last] || 0) >= vCount(words, last)) return;
  vPartialT = setTimeout(() => {
    if (vPartial !== p || (vExec[last] || 0) >= vCount(words, last)) return;
    vExec[last] = (vExec[last] || 0) + 1;
    if (!handleVoice(last)) setVoiceNote(`Entendu « ${last} » mais pas compris. ${voiceHelpText()}`);
  }, 300);
}
// Résultat final : chaque commande simple est exécutée autant de fois qu'elle a été dite, jamais plus
function voskFinal(t, done){
  const words = t.split(" ");
  if (!words.every(x => VOSK_QUICK.test(x))) return false;
  const seen = {};
  words.forEach(x => { seen[x] = (seen[x] || 0) + 1; if (seen[x] > (done[x] || 0)) handleVoice(x); });
  return true;
}
function voskResetAudio(){
  try { if (vNode) { vNode.onaudioprocess = null; vNode.disconnect(); } if (vSrc) vSrc.disconnect(); } catch(e) {}
  vNode = null; vSrc = null;
  try { if (vStream) vStream.getTracks().forEach(t => t.stop()); } catch(e) {}
  vStream = null;
}
// Surveillance : si le son n'arrive plus (veille, onglet en pause, micro coupé), on relance la chaîne audio
async function voskWatchdog(){
  if (!vOn || view !== "quiz" || paused || document.visibilityState !== "visible") return;
  if (Date.now() - vLastAudio < 5000) return;
  try { if (vCtx && vCtx.state !== "running") await vCtx.resume(); } catch(e) {}
  setTimeout(() => { if (vOn && view === "quiz" && Date.now() - vLastAudio > 5000) { voskResetAudio(); voskStart(); } }, 1500);
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && window.VOICE_ENGINE === "vosk" && view === "quiz" && opts.voice && !paused) setTimeout(() => voskStart(), 300); });
function voskStop(){
  vOn = false;
  try { if (vRec) { vRec.remove(); } } catch(e) {}
  vRec = null; vRecGrammar = "";
  voskResetAudio();
  if (vWatch) { clearInterval(vWatch); vWatch = null; }
}
// Précharge le modèle dès qu'on active « Répondre à l'oral »
document.addEventListener("click", e => { if (e.target && e.target.id === "swVoice" && window.VOICE_ENGINE === "vosk") setTimeout(() => { if (opts.voice) voskModel().catch(() => {}); }, 0); });
// Précharge aussi le modèle à l'ouverture d'une matière (micro activé par défaut)
document.addEventListener("click", e => { const s = e.target && e.target.closest && e.target.closest(".subj"); if (s && window.VOICE_ENGINE === "vosk") setTimeout(() => { if (opts.voice) voskModel().catch(() => {}); }, 300); });
