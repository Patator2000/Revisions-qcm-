// Sépare les questions gratuites (cours 1-2) des questions Kinésis+.
// Usage : node tools/contenu.js '<json des thèmes gratuits>'
// Sortie (JSON) : { js: bloc de données pour la page, paid: [{subject, fmt, idx, item}] }
// Une question payante est remplacée dans la page par [partie, thème, {lock: clé}] :
// la clé (empreinte de l'énoncé) garde la progression intacte, l'énoncé n'y figure pas.
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.resolve(__dirname, "..");
const FILES = ["anatomie", "physiologie", "physiologie_examen", "physiologie_examen_2", "physiologie_complements"];
const free = JSON.parse(process.argv[2] || "{}");

const ctx = {};
vm.createContext(ctx);
vm.runInContext(FILES.map(f => fs.readFileSync(path.join(ROOT, "src/data", f + ".js"), "utf8")).join("\n") +
  "\n;this.D = {ANAT_THEMES, ANAT_PARTS, ANAT_Q, PHYSIO_THEMES, PHYSIO_PARTS, PHYSIO_Q, PHYSIO_MCQ, PHYSIO_OPEN};", ctx);
const D = ctx.D;

function hkey(s){ let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return "q" + h.toString(36); }
const PREFIX = {vf: "", qcm: "m", open: "o"};
const ARR = {anat: {vf: "ANAT_Q"}, physio: {vf: "PHYSIO_Q", qcm: "PHYSIO_MCQ", open: "PHYSIO_OPEN"}};

const paid = [], out = {};
for (const subject in ARR) for (const fmt in ARR[subject]) {
  const name = ARR[subject][fmt], ok = new Set(free[subject] || []);
  out[name] = D[name].map((q, idx) => {
    if (ok.has(q[1])) return q;
    paid.push({subject, fmt, idx, item: q});
    return [q[0], q[1], {lock: PREFIX[fmt] + hkey(q[2])}];
  });
}
let js = "";
for (const k of ["ANAT_THEMES", "ANAT_PARTS", "PHYSIO_THEMES", "PHYSIO_PARTS"]) js += `const ${k} = ${JSON.stringify(D[k])};\n`;
for (const k in out) js += `const ${k} = ${JSON.stringify(out[k])};\n`;
process.stdout.write(JSON.stringify({js, paid}));
