// ================= Modules du profil =================
// Chaque profil choisit ses modules : les matières de révision et les mails.
// Un profil neuf n'en a aucun. Le choix est gardé sur l'appareil et, avec un profil, dans Supabase (profiles.modules).
const MODULE_EXTRA = {
  mails: {id: "mails", name: "Mails", desc: "Les mails importants de tes boîtes (Gmail, Outlook), triés par tes règles, dans une boîte de notifications.",
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>'}
};
function moduleList(){
  return [...Object.values(SUBJECTS).filter(x => fmtList(x).length).map(x => ({id: x.id, name: x.name, desc: x.desc, icon: ICONS[x.id], subject: true})),
          ...Object.values(MODULE_EXTRA)];
}
let MODS = null; // Set des modules actifs ; null = pas encore connu
function modKey(){ return "kinesis-modules-" + (typeof SB_USER !== "undefined" && SB_USER ? SB_USER.id : "local"); }
function modLoadLocal(){ try { const r = localStorage.getItem(modKey()); MODS = new Set(r ? JSON.parse(r) : []); } catch(e) { MODS = new Set(); } }
function modOn(id){ if (!MODS) modLoadLocal(); return MODS.has(id); }
function modSet(list){ // reçu du compte
  MODS = new Set(list || []);
  try { localStorage.setItem(modKey(), JSON.stringify([...MODS])); } catch(e) {}
}
async function modToggle(id){
  if (!MODS) modLoadLocal();
  MODS.has(id) ? MODS.delete(id) : MODS.add(id);
  try { localStorage.setItem(modKey(), JSON.stringify([...MODS])); } catch(e) {}
  if (typeof SB !== "undefined" && SB && typeof SB_USER !== "undefined" && SB_USER)
    SB.from("profiles").upsert({user_id: SB_USER.id, modules: [...MODS]}).then(r => { if (r.error) console.warn("modules", r.error.message); });
  renderView();
}
// Panneau « Ajouter / retirer des modules »
function modulesPanel(){
  const all = moduleList();
  return `<div class="mod-panel" id="modPanel">
    <div class="mod-head"><b>Mes modules</b><span class="small muted">Choisis ce qui apparaît sur ton tableau de bord.</span><button class="mod-x" id="modClose" aria-label="Fermer">×</button></div>
    ${all.map(m => `<div class="mod-row"><span class="mod-ico" style="--c:var(--${m.id}, var(--accent));--cs:var(--${m.id}-soft, var(--surface2))">${m.icon}</span>
      <span class="mod-txt"><b>${m.name}</b><span>${m.desc}</span></span>
      <button class="switch${modOn(m.id) ? " on" : ""}" data-mod="${m.id}" aria-label="${m.name}"></button></div>`).join("")}
  </div>`;
}
function bindModulesPanel(root){
  root.querySelectorAll("[data-mod]").forEach(b => b.onclick = () => modToggle(b.dataset.mod));
  const x = root.querySelector("#modClose"); if (x) x.onclick = () => { modPanelOpen = false; renderView(); };
}
let modPanelOpen = false;
// Bloc « Mails » sur le tableau de bord
function mailsCard(){
  const bx = typeof mailBoxes === "function" && typeof GMAIL !== "undefined" && GMAIL ? mailBoxes() : [], ok = bx.length > 0;
  const n = ok ? mailImportant().length : 0, names = bx.map(x => x.name).join(" + ");
  return `<button class="subj" data-mod-open="mails" style="--c:var(--mails);--cs:var(--mails-soft)">
    <div class="ico">${MODULE_EXTRA.mails.icon}</div>
    <h3>Mails</h3><p>${ok ? names + " connecté : les mails qui comptent sont dans ta boîte de notifications." : "Connecte ta boîte mail : les mails qui comptent s'afficheront dans ta boîte de notifications."}</p>
    <div class="foot"><span>${ok ? names : "aucune boîte"}</span><span>${ok ? n + " à voir" : "à connecter"}</span></div>
  </button>`;
}
