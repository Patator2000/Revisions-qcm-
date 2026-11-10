"""Construit le site Kinésis (index.html) à partir des sources de src/.

Usage : python3 build.py
- index.html            : le site publié sur GitHub Pages
- build/claude.html     : la variante pour un artefact claude.ai (non publiée)
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"

# Projet Supabase (clé publique « publishable » : prévue pour être visible dans le navigateur)
SUPA_URL = "https://eempregmkymltwgzrofl.supabase.co"
SUPA_KEY = "sb_publishable_4A1YYev7-Qmgbl_aRV7CIQ_Gxq267_N"

# Abonnement Kinésis+ (4,99 €/mois) : préparé mais INVISIBLE tant que ce réglage vaut False.
# Mise en service : voir docs/abonnement.md
ABONNEMENT_ACTIF = False
ABONNEMENT_RESERVE = []  # fonctions réservées aux abonnés, ex. ["examens"]

DATA = ["anatomie.js", "physiologie.js", "physiologie_examen.js", "physiologie_examen_2.js", "physiologie_complements.js"]


def read(p):
    return (SRC / p).read_text(encoding="utf-8")


def check(name, html):
    assert "—" not in html, f"{name} : tiret cadratin interdit"
    assert all(c in html for c in "éèàùêîôûç"), f"{name} : accents manquants"
    assert 'charset="UTF-8"' in html, f"{name} : encodage UTF-8 absent"


# 1) assemblage commun
data = "\n".join(read("data/" + f) for f in DATA)
app = (read("app/app.js")
       .replace("/*EXTRAS*/", read("app/extras.js") + "\n" + read("app/dash.js"))
       .replace("/*ASK*/", read("app/ask.js")))
full = read("template.html").replace("/*__DATA__*/", data).replace("/*__APP__*/", app)

# 2) variante claude.ai (stockage claude, synchro par copier-coller, micro bloqué)
(ROOT / "build").mkdir(exist_ok=True)
(ROOT / "build" / "claude.html").write_text(full, encoding="utf-8")
check("claude", full)

# 3) site GitHub Pages : profils Supabase, voix Vosk sur l'appareil
site = full.replace('<meta name="viewport"', '<meta name="theme-color" content="#2f5fd0">\n<meta name="viewport"', 1)
site = site.replace('<details class="sync">', '<details class="sync" hidden>', 1)
site = site.replace(
    'const MIC_MSG = "Micro bloqué : claude.ai n\'autorise pas le micro dans ses pages publiées. Utilise la version « micro » à ouvrir dans Chrome, ou réponds au clavier (V, F, N, A à E, P, Entrée).";',
    'const MIC_MSG = "Micro refusé par le navigateur : touche l\'icône de cadenas (ou de réglages) à gauche de l\'adresse, autorise le micro, puis recharge la page. En attendant, réponds au clavier (V, F, N, A à E, P, Entrée).";')
assert "Micro refusé" in site
cfg = (f'window.SUPA_URL = "{SUPA_URL}";\nwindow.SUPA_KEY = "{SUPA_KEY}";\n'
       f'window.ABONNEMENT_ACTIF = {"true" if ABONNEMENT_ACTIF else "false"};\nwindow.ABONNEMENT_RESERVE = {json.dumps(ABONNEMENT_RESERVE)};\n')
j = site.index("<script>") + len("<script>")
site = site[:j] + "\n" + cfg + site[j:]
site = site.replace("<script>", '<script src="vendor/supabase.js"></script>\n<script>', 1)
i = site.rindex("</script>")
site = site[:i] + '\nwindow.VOICE_ENGINE = "vosk";\n' + read("app/voix.js") + "\n" + read("app/profils.js") + "\n" + read("app/abonnement.js") + "\n" + site[i:]
site = site.replace("(Chrome recommandé)", "(marche dans tous les navigateurs, Brave compris)")
site = site.replace("voice:false, auto:true};", "voice:true, auto:true};").replace('<button class="switch" id="swVoice"', '<button class="switch on" id="swVoice"')
assert "voice:true" in site
site = site.replace("Ta progression est gardée dans ce navigateur.", "")
check("site", site)
(ROOT / "index.html").write_text(site, encoding="utf-8")
print("build ok")
