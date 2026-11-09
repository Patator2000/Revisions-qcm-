// ================= Poser une question (Claude + liens Google) =================
let sampleFn = null, sampleOff = false, sampleReady = false;
// Hors de claude.ai (version micro, site) : on ouvre claude.ai dans un nouvel onglet avec la question pré-remplie
const EXTERNAL_AI = !(window.claude && window.claude.use);
function claudeUrl(prompt){ return "https://claude.ai/new?q=" + encodeURIComponent(prompt.slice(0, 6000)); }
// Conversation Claude unique (choisie dans le menu du profil) : la question est copiée puis la conversation s'ouvre
function claudeChat(){ let u = window.PROFILE_CLAUDE || ""; if (!u) { try { u = localStorage.getItem("qcm-claude-chat") || ""; } catch(e) {} } return /^https:\/\/claude\.ai\/(chat|project)\//.test(u) ? u : ""; }
async function copyText(t){
  try { await navigator.clipboard.writeText(t); return true; } catch(e) {}
  try { const a = document.createElement("textarea"); a.value = t; a.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(a); a.select(); const ok = document.execCommand("copy"); a.remove(); return ok; } catch(e) { return false; }
}
function openClaude(prompt, container){
  const chat = claudeChat();
  const p = document.createElement("div"); p.className = "msg ai";
  if (chat) {
    const txt = prompt.slice(0, 12000);
    let w = null; try { w = window.open(chat, "kinesis-claude"); } catch(e) {}
    copyText(txt).then(ok => {
      p.innerHTML = ok
        ? `<b>Question copiée.</b> Dans ta conversation Claude, colle-la (Ctrl+V, ou appui long puis « Coller » sur téléphone) et envoie. <a href="${chat}" target="kinesis-claude">Rouvrir la conversation</a>`
        : `La copie automatique a échoué : sélectionne le texte ci-dessous, copie-le, puis colle-le dans <a href="${chat}" target="kinesis-claude">ta conversation Claude</a>.<textarea readonly rows="4" style="width:100%;margin-top:6px"></textarea>`;
      const ta = p.querySelector("textarea"); if (ta) ta.value = txt;
    });
    if (container) container.appendChild(p);
    return w;
  }
  const url = claudeUrl(prompt);
  let w = null; try { w = window.open(url, "_blank", "noopener"); } catch(e) {}
  p.innerHTML = `Question envoyée à Claude dans un nouvel onglet. <a href="${url}" target="_blank" rel="noopener">Si rien ne s'est ouvert, clique ici</a>.${window.SUPA_URL ? '<br><span class="small muted">Pour garder toutes tes questions dans une seule conversation : menu du profil (en haut à droite), « Conversation Claude ».</span>' : ""}`;
  if (container) container.appendChild(p);
  return w;
}
const extOn = () => EXTERNAL_AI || sampleOff;
const askEls = {};   // un fil de discussion par question, gardé pendant la visite
async function initSample(){
  try { if (window.claude && window.claude.use) sampleFn = await window.claude.use("sample"); } catch(e) { sampleFn = null; }
  sampleReady = true;
  document.querySelectorAll(".ask").forEach(el => el._refresh && el._refresh());
  if (view === "quiz" && fmt === "open") render();
}
const SUGG = ["Donne-moi un exemple concret", "Fais-moi un schéma", "Explique plus simplement", "Un moyen mnémotechnique ?", "Pourquoi l'autre réponse est fausse ?"];

function rulesFor(qi){
  const q = items()[qi];
  let ctx;
  if (fmt === "vf") ctx = `Question du QCM (format VRAI / FAUX) : « ${q[2]} »\nRéponse correcte : ${LABEL[q[3]]}.\nExplication du corrigé : ${q[4]}`;
  else if (fmt === "qcm") ctx = `Question de QCM à 5 propositions (une ou plusieurs justes) : « ${q[2]} »\n${q[3].map((t,j) => `${LET[j]}. ${t}`).join("\n")}\nBonnes réponses : ${q[4].map(j => LET[j]).join(", ")}.\nExplication du corrigé : ${q[5]}`;
  else ctx = `Question ouverte de contrôle écrit : « ${q[2]} »\nÉléments attendus du corrigé type :\n${q[3].map(k => "- " + k).join("\n")}`;
  return `Tu es un tuteur qui aide un étudiant à réviser en ${S.name.toLowerCase()} (niveau licence STAPS / études de santé, cours sur ${S.desc.replace(/^Partie A : /,"")}).
${ctx}
Thème : ${S.THEMES[q[1]]}.

Le corrigé ci-dessus est tiré du cours de l'étudiant : appuie-toi d'abord sur lui.

Règles de réponse :
- Réponds en français, de façon claire et courte (5 à 12 lignes en général), en restant fidèle au corrigé ci-dessus.
- N'utilise jamais le tiret long ; utilise des virgules, des deux-points ou un tiret court.
- Mise en forme simple : paragraphes courts, listes avec "- ", **gras** pour les mots clés. Pas de tableaux.
- Si l'étudiant demande un schéma, un dessin ou une illustration : fournis un schéma SVG simple et lisible dans un bloc \`\`\`svg ... \`\`\`, avec viewBox (largeur 500 à 700), fond blanc, traits sombres, légendes en français (police sans-serif, taille 14 ou plus), flèches si utile, sans script ni image externe. Ajoute 2 ou 3 phrases pour expliquer le schéma. C'est un schéma pédagogique simplifié : dis-le en une phrase.
- Si tu n'es pas sûr d'un détail qui dépasse le corrigé, dis-le et conseille de vérifier dans le cours.`;
}
function googleLinks(qi){
  const q = items()[qi][2].replace(/[«»"]/g, "");
  const words = q.split(/\s+/).slice(0, 14).join(" ");
  const base = "https://www.google.com/search?q=" + encodeURIComponent(words + " " + S.name.toLowerCase());
  return `<span class="ask-links"><a href="${base}" target="_blank" rel="noopener">Google</a><a href="${base}&tbm=isch" target="_blank" rel="noopener">Google Images</a></span>`;
}
function renderAsk(container, qi){
  if (!container) return;
  const id = S.id + fmt + qi;
  if (!askEls[id]) askEls[id] = buildAsk(qi);
  container.replaceChildren(askEls[id]);
  askEls[id]._refresh();
}
function buildAsk(qi){
  const el = document.createElement("div"); el.className = "ask";
  el.innerHTML = `<div class="ask-head"><b>Une question sur ce point ?</b>${googleLinks(qi)}</div>
    <div class="msgs"></div>
    <div class="ai-zone">
      <div class="sugg">${SUGG.map(s => `<button type="button">${s}</button>`).join("")}</div>
      <form class="ask-form"><textarea rows="1" placeholder="Pose ta question (ex. : donne-moi un exemple en sport)"></textarea><button class="btn primary" type="submit">Envoyer</button></form>
    </div>
    <div class="small muted off-note hidden">La zone de question n'est pas disponible ici. Utilise les liens Google ci-dessus.</div>
    <p class="small muted ext-note hidden" style="margin:6px 0 0">Ta question s'ouvrira dans Claude (nouvel onglet), avec la question du QCM, la bonne réponse et le corrigé tiré de ton cours.</p>`;
  const msgs = el.querySelector(".msgs"), ta = el.querySelector("textarea"), form = el.querySelector("form");
  const sendBtn = form.querySelector("button");
  const turns = []; let ctl = null, busy = false;
  el._refresh = () => {
    const ext = extOn(), on = ext || (!!sampleFn && !sampleOff);
    el.querySelector(".ai-zone").classList.toggle("hidden", !on);
    el.querySelector(".off-note").classList.toggle("hidden", on || !sampleReady);
    el.querySelector(".ext-note").classList.toggle("hidden", !ext);
  };
  const setBusy = b => {
    busy = b; ta.disabled = b;
    el.querySelectorAll(".sugg button").forEach(x => x.disabled = b);
    sendBtn.textContent = b ? "Arrêter" : "Envoyer"; sendBtn.classList.toggle("primary", !b);
  };
  async function ask(text){
    text = text.trim(); if (!text || busy) return;
    if (extOn()) {
      const me = document.createElement("div"); me.className = "msg me"; me.textContent = text; msgs.appendChild(me);
      ta.value = "";
      openClaude(rulesFor(qi) + "\n\nMa question : " + text, msgs);
      return;
    }
    const me = document.createElement("div"); me.className = "msg me"; me.textContent = text; msgs.appendChild(me);
    const ai = document.createElement("div"); ai.className = "msg ai"; ai.innerHTML = `<span class="thinking">Claude réfléchit...</span>`; msgs.appendChild(ai);
    turns.push({role:"user", content:text});
    ta.value = ""; setBusy(true); ctl = new AbortController();
    try {
      const input = [{role:"user", content: rulesFor(qi)}, ...turns.slice(-8)];
      const {text: out, truncated} = await sampleFn(input, {cache:false, signal: ctl.signal, onText: ({text}) => { ai.innerHTML = md(text); }});
      ai.innerHTML = md(out) + (truncated ? `<p class="small muted">Réponse coupée : demande une partie à la fois.</p>` : "");
      turns.push({role:"assistant", content: out});
    } catch(e) {
      turns.pop();
      const code = e && e.code;
      if (code === "cancelled") { ai.innerHTML = e.text ? md(e.text) + `<p class="small muted">Arrêté.</p>` : `<span class="small muted">Arrêté.</span>`; }
      else if (["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].includes(code)) {
        ai.remove(); me.remove(); sampleOff = true;
        document.querySelectorAll(".ask").forEach(x => x._refresh && x._refresh());
      } else {
        ai.className = "msg err";
        ai.textContent = code === "rate_limited" ? "Trop de questions d'un coup ou limite d'utilisation atteinte : réessaie dans un moment."
          : code === "session_expired" ? "Ta session Claude a expiré : reconnecte-toi puis réessaie."
          : code === "refused" ? "Claude n'a pas pu répondre à cette question : reformule-la."
          : "La réponse n'a pas pu arriver (problème de connexion). Réessaie.";
      }
    } finally { setBusy(false); ctl = null; }
  }
  form.onsubmit = e => { e.preventDefault(); if (busy) { ctl && ctl.abort(); return; } ask(ta.value); };
  ta.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  el.querySelectorAll(".sugg button").forEach(b => b.onclick = () => ask(b.textContent));
  return el;
}

// Mise en forme minimale et sûre de la réponse (texte échappé, SVG affiché comme image)
function md(src){
  const svgs = [];
  src = src.replace(/```svg\s*([\s\S]*?)```/g, (m, s) => { svgs.push(s); return `\u0000SVG${svgs.length-1}\u0000`; });
  src = src.replace(/```svg[\s\S]*$/, () => "\u0000PENDING\u0000"); // schéma en cours d'écriture
  src = src.replace(/(<svg[\s\S]*?<\/svg>)/g, (m, s) => { svgs.push(s); return `\u0000SVG${svgs.length-1}\u0000`; });
  src = src.replace(/```[a-z]*\s*([\s\S]*?)```/g, (m, s) => s);
  const blocks = src.split(/\n{2,}/);
  return blocks.map(b => {
    if (/^\u0000SVG(\d+)\u0000$/.test(b.trim())) return svgImg(svgs[+b.trim().match(/\d+/)[0]]);
    if (b.trim() === "\u0000PENDING\u0000") return `<p class="thinking">Schéma en cours de dessin...</p>`;
    const lines = b.split("\n");
    if (lines.every(l => /^\s*[-*•] /.test(l) || !l.trim())) return "<ul>" + lines.filter(l => l.trim()).map(l => "<li>" + inline(l.replace(/^\s*[-*•] /, "")) + "</li>").join("") + "</ul>";
    return "<p>" + lines.map(l => {
      const m = l.match(/\u0000SVG(\d+)\u0000/); if (m) return svgImg(svgs[+m[1]]);
      if (l.includes("\u0000PENDING\u0000")) return `<span class="thinking">Schéma en cours de dessin...</span>`;
      return /^#{1,4}\s/.test(l) ? "<b>" + inline(l.replace(/^#{1,4}\s*/, "")) + "</b>" : inline(l);
    }).join("<br>") + "</p>";
  }).join("");
}
function inline(s){
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>");
}
function svgImg(svg){
  if (!/^\s*<svg[\s>]/.test(svg)) svg = svg.slice(svg.indexOf("<svg"));
  if (!/xmlns=/.test(svg)) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  // Affiché via <img> : aucun script du SVG ne peut s'exécuter
  return `<img class="svg" alt="Schéma" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}">`;
}
