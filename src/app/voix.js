// ================= Reconnaissance vocale intégrée (Vosk, sur l'appareil) =================
// Utilisée sur le site : marche dans tous les navigateurs (Brave compris), sans service extérieur.
const VOSK_MODELS = [
  "models/vosk-model-small-fr.tar.gz",                                                   // copie hébergée sur le site (si présente)
  "https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-fr-pguyot-0.3.tar.gz" // modèle public de secours
];
let voskTries = 0, vModel = null, vModelPromise = null, vRec = null, vStream = null, vCtx = null, vNode = null, vSrc = null, vOn = false;
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
  w.push("[unk]");
  return JSON.stringify(w);
}
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
          const m = new Vosk.Model(url, -1);
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
    setVoiceNote("⏳ Préparation de la reconnaissance vocale...");
    const model = await voskModel();
    if (!vOn) return;
    vCtx = vCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (vCtx.state === "suspended") { try { await vCtx.resume(); } catch(e) {} }
    if (vRec) { try { vRec.remove(); } catch(e) {} }
    vRec = new model.KaldiRecognizer(vCtx.sampleRate, voskGrammar());
    vRec.on("partialresult", m => { const p = (m.result && m.result.partial || "").trim(); if (p && p !== "[unk]") setVoiceNote(`🎙 « ${p} »...`); });
    vRec.on("result", m => {
      const t = (m.result && m.result.text || "").replace(/\[unk\]/g, "").trim();
      if (!t) return;
      if (!handleVoice(t)) setVoiceNote(`Entendu « ${t} » mais pas compris. ${VOICE_HELP}`);
    });
    if (!vNode) {
      vSrc = vCtx.createMediaStreamSource(vStream);
      vNode = vCtx.createScriptProcessor(4096, 1, 1);
      vNode.onaudioprocess = ev => { if (vOn && vRec && !paused && view === "quiz") { try { vRec.acceptWaveform(ev.inputBuffer); } catch(e) {} } };
      vSrc.connect(vNode); vNode.connect(vCtx.destination);
    }
    voskTries = 0;
    setVoiceNote("🎙 J'écoute... " + VOICE_HELP);
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
function voskStop(){
  vOn = false;
  try { if (vRec) { vRec.remove(); vRec = null; } } catch(e) {}
  try { if (vNode) { vNode.disconnect(); vNode = null; } if (vSrc) { vSrc.disconnect(); vSrc = null; } } catch(e) {}
  try { if (vStream) { vStream.getTracks().forEach(t => t.stop()); vStream = null; } } catch(e) {}
}
// Précharge le modèle dès qu'on active « Répondre à l'oral »
document.addEventListener("click", e => { if (e.target && e.target.id === "swVoice" && window.VOICE_ENGINE === "vosk") setTimeout(() => { if (opts.voice) voskModel().catch(() => {}); }, 0); });
// Précharge aussi le modèle à l'ouverture d'une matière (micro activé par défaut)
document.addEventListener("click", e => { const s = e.target && e.target.closest && e.target.closest(".subj"); if (s && window.VOICE_ENGINE === "vosk") setTimeout(() => { if (opts.voice) voskModel().catch(() => {}); }, 300); });
