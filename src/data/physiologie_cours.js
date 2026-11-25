// Fiches de cours de physiologie de l'exercice (L1), rédigées à partir des CM :
// mise à niveau biologie (CM 1-3), fonction musculaire (CM 4-6), bioénergétique (CM 7-8), bioénergétique appliquée (CM 9-10).
// **mot** = mis en gras à l'affichage.
const PHYSIO_COURS = {
  titre: "Fiches de cours",
  type: "fiches",
  chapitres: [
  {
    id: "C1", titre: "CM 1-3 · Généralités et homéostasie", themes: ["C1", "T1"],
    sections: [
      {h: "Définitions", pts: [
        "**Anatomie** : étude de la structure du corps. **Physiologie** : étude du rôle des fonctions de l'organisme dans le maintien de la vie.",
        "Branches de l'anatomie : **cytologie** (cellules), **histologie** (tissus), **embryologie** (développement). Exemples de spécialités de la physiologie : neurophysiologie, physiologie cardio-vasculaire.",
        "Père de la physiologie : **Claude Bernard**. Sa phrase : « La fixité du milieu intérieur est la condition de la vie libre ».",
        "Le corps est un **système ouvert** avec un milieu interne : il doit se protéger de l'environnement tout en en dépendant (chaleur, O2, nutriments, déchets, informations)."
      ]},
      {h: "Les niveaux d'organisation (du plus petit au plus grand)", pts: [
        "**Chimique** : atomes et molécules (C, H, O, N, Ca, K, Na...).",
        "**Cellulaire** : la cellule, unité structurale et fonctionnelle, avec ses organites.",
        "**Tissulaire** : groupe de cellules semblables. 4 tissus fondamentaux : **épithélial, musculaire, conjonctif, nerveux**.",
        "**Organique** : plusieurs types de tissus, fonction définie et forme reconnaissable.",
        "**Systémique** : ensemble d'organes = système (ou appareil). Puis **l'organisme**.",
        "Ordre à retenir : chimique, cellule, tissu, organe, système, organisme."
      ]},
      {h: "Les systèmes et leur rôle", pts: [
        "Nerveux : contrôle de l'ensemble des fonctions. Endocrinien : hormones (glycémie, croissance, reproduction).",
        "Musculaire : mouvement et production de chaleur. Osseux : soutien, protection, charpente, érythropoïèse.",
        "Cardio-vasculaire : transport des gaz, nutriments et déchets. Respiratoire : oxygénation du sang, rejet du CO2.",
        "Digestif : dégradation des aliments, apport de nutriments. Urinaire : déchets azotés, équilibre hydrique, électrolytique et acido-basique.",
        "Tégumentaire : protection. Lymphatique et immunitaire : défense. Génital : reproduction.",
        "À l'exercice, le muscle dépend surtout des systèmes **cardio-vasculaire, respiratoire et nerveux**."
      ]},
      {h: "Les processus vitaux", pts: [
        "Maintien des **limites**, **métabolisme**, mouvement, excitabilité (faculté de réponse), croissance, différenciation, reproduction.",
        "**Métabolisme** = somme des réactions chimiques du corps : **catabolisme** (dégradation, libère de l'énergie) et **anabolisme** (synthèse, utilise cette énergie).",
        "**Différenciation** : des cellules non spécialisées deviennent spécialisées (ex. lignée érythroïde).",
        "Cellules **excitables** (nerveuses, musculaires) : équipées de canaux ioniques voltage-dépendants, elles produisent des potentiels d'action."
      ]},
      {h: "Homéostasie", pts: [
        "Définition : propriété des êtres vivants à maintenir leur **milieu interne stable**. Une homéostasie perturbée de façon chronique = pathologie.",
        "Le **milieu intérieur** = le **liquide extracellulaire** dans lequel baignent les cellules : **liquide interstitiel** (entre les cellules) et **plasma**. Le liquide intracellulaire (cytosol) est l'autre compartiment. Molécule essentielle : l'**eau**.",
        "Elle repose surtout sur des **rétrocontrôles négatifs**, qui s'opposent à l'écart et ramènent la variable vers son point de réglage.",
        "Il faut des **récepteurs**, un **centre de contrôle** (comparateur) et des **effecteurs**. Plus le rétrocontrôle est sensible, plus la variable reste proche de sa valeur de consigne.",
        "Deux systèmes régulateurs : le **nerveux**, rapide (ex. température : vasodilatation, sudation, frissons commandés par l'hypothalamus) et l'**endocrinien**, plus lent (ex. glycémie).",
        "Osmolarité : un globule rouge gonfle en milieu **hypotonique**, se ratatine en milieu **hypertonique**, reste stable en **isotonique** (d'où l'importance des perfusions isotoniques)."
      ]}
    ]
  },
  {
    id: "C2", titre: "CM 1-3 · Niveau chimique : les molécules de la vie", themes: ["C2", "T2"],
    sections: [
      {h: "Éléments et atomes", pts: [
        "Le corps contient 26 des 92 éléments naturels. **O, C, H, N = 96 %** de la masse ; Ca, P, K, S, Na, Cl, Mg = 3,9 % ; plus les oligo-éléments (Fe, I).",
        "Atome : un noyau (**protons** + **neutrons** = nucléons) et des **électrons** autour. Nombre d'électrons = nombre de protons.",
        "**Z** (numéro atomique) = nombre de protons. **A** (nombre de masse) = nombre de nucléons. Neutrons = A - Z. Exemple : Na, Z = 11 et A = 23, donc 11 p+, 11 e- et 12 neutrons.",
        "**Isotopes** : même Z, A différent.",
        "**Ion** : atome qui gagne des électrons = **anion** (négatif, ex. Cl-) ; qui en perd = **cation** (positif, ex. Na+, Ca2+)."
      ]},
      {h: "Liaisons et moles", pts: [
        "**Liaison ionique** : un atome cède un ou plusieurs électrons à un autre. **Liaison covalente** : les atomes partagent des électrons par paires.",
        "**Mole** : 6,02 × 10^23 entités. La masse molaire (g/mol) est la masse d'une mole.",
        "Repères : C = 12, N = 14, O = 16 g/mol. H2O = 18, O2 = 32, NaCl = 57 (valeur du cours), KCl = 74, glucose C6H12O6 = 180 g/mol.",
        "Calcul type : moles = masse / masse molaire. 1 kg de glucose = 1000 / 180 ≈ 5,56 mol."
      ]},
      {h: "Composés inorganiques : eau, sels, pH", pts: [
        "Inorganiques : en général sans carbone (H2O, O2, CO2, sels, acides, bases). Organiques : toujours C et H.",
        "L'eau représente 60 % des globules rouges, 75 % du tissu musculaire, 92 % du plasma.",
        "Un sel dissous se dissocie en cations et anions (KCl donne K+ + Cl-). Acide + base donnent un sel + de l'eau.",
        "**pH** : mesure la concentration en H+. pH < 7 acide, pH > 7 basique.",
        "Normes : **sang 7,35 à 7,45**, urine 4,6 à 8, suc gastrique 1,2 à 3. Le pH est maintenu par des **systèmes tampons**, qui transforment acides ou bases forts en faibles."
      ]},
      {h: "Glucides", pts: [
        "Formule (CH2O)n : C, H, O avec H/O = 2. 2 à 3 % du poids du corps.",
        "Rôle principal : fournir de l'**énergie rapidement** (ATP).",
        "Monosaccharides (glucose, fructose ; les pentoses ont 5 C comme le ribose), disaccharides (2 sucres liés), polysaccharides (le **glycogène** est la réserve de l'organisme)."
      ]},
      {h: "Lipides", pts: [
        "C, H, O mais rapport H/O différent de 2. Surtout **insolubles dans l'eau** : ils circulent dans le sang grâce aux **lipoprotéines** (HDL, LDL).",
        "**Triglycérides** = 1 glycérol + 3 acides gras. Dans le tissu adipeux : réserve d'énergie, protection, isolation.",
        "**Phospholipides** : glycérol + 2 acides gras (queue apolaire) + phosphate et groupe azoté (tête polaire). Ils forment la **bicouche** des membranes.",
        "**Stéroïdes** (dérivés du cholestérol) : hormones sexuelles, cortisol, aldostérone, sels biliaires, vitamine D.",
        "Le **cholestérol** (4 cycles carbonés) entre dans les membranes et sert à fabriquer les stéroïdes.",
        "Autres : éicosanoïdes (prostaglandines, leucotriènes), vitamines liposolubles A, E, K."
      ]},
      {h: "Protéines et enzymes", pts: [
        "12 à 18 % du corps ; toujours C, H, O, N, parfois S.",
        "Faites de **20 acides aminés** ; chacun a un groupe amine (-NH2), un groupe carboxyle (-COOH) et une chaîne latérale R.",
        "Les acides aminés s'unissent par des **liaisons peptidiques** : dipeptide, tripeptide, polypeptide. L'hémoglobine compte 4 chaînes.",
        "Rôles : structure, transport, fonctions physiologiques. La fonction dépend de la forme en 3D : chaleur ou pH modifié la **dénaturent** (le blanc d'œuf qui cuit).",
        "Les **enzymes** sont des protéines catalyseurs, très spécifiques d'une réaction (hexokinase, PFK...). Certaines ont besoin de cofacteurs ou de coenzymes."
      ]}
    ]
  },
  {
    id: "C3", titre: "CM 1-3 · La cellule et la synthèse protéique", themes: ["C3", "T3"],
    sections: [
      {h: "Les trois parties de la cellule", pts: [
        "**Noyau** : centre de contrôle. **Cytoplasme** : lieu de la plupart des activités. **Membrane plasmique** : contrôle les entrées et sorties.",
        "Noyau : nucléoplasme, chromatine, **nucléole** (assemble les ribosomes), membrane nucléaire double percée de pores.",
        "Il contient l'**ADN**, organisé en **23 paires de chromosomes** (46) chez l'humain."
      ]},
      {h: "ADN et ARN", pts: [
        "Acides nucléiques : C, O, H, N, P. Unité de base : le **nucléotide** = base azotée + sucre pentose + phosphate.",
        "Bases : adénine, thymine, guanine, cytosine, et l'**uracile** propre à l'ARN (qui remplace la thymine). Appariements : **A avec T**, **G avec C**. L'ADN contient du désoxyribose, l'ARN du ribose.",
        "**ADN** : code génétique ; un **gène** est un segment d'ADN qui code une protéine. **ARN** : transmet les instructions des gènes pour assembler les acides aminés."
      ]},
      {h: "Les organites", pts: [
        "**REG** (avec ribosomes) : finition, stockage et transport des protéines ; produit des vésicules de transition et des membranes.",
        "**REL** (sans ribosomes) : synthèse des lipides, dégradation des toxiques, membranes.",
        "**Appareil de Golgi** : saccules empilés qui modifient, trient et emballent les produits.",
        "**Lysosomes** : vésicules remplies d'enzymes digestives, issues du Golgi.",
        "**Mitochondrie** : deux membranes ; lieu de la **respiration cellulaire** et de la synthèse de l'**ATP**.",
        "Autres : vésicules, vacuoles, peroxysomes."
      ]},
      {h: "Synthèse des protéines", pts: [
        "Deux phases : **transcription** dans le noyau, puis **traduction** dans le cytoplasme, sur les **ribosomes**.",
        "Transcription : des enzymes séparent les deux brins d'ADN ; un **ARN messager** complémentaire est fabriqué à partir d'un brin, puis sort par les pores nucléaires.",
        "Traduction : le ribosome (ARNr) lit l'ARNm **trois bases par trois** ; chaque triplet est un **codon** qui code un acide aminé.",
        "L'**ARN de transfert** apporte l'acide aminé correspondant au codon. Trois ARN à retenir : **ARNm, ARNt, ARNr**."
      ]},
      {h: "Membrane plasmique", pts: [
        "Bicouche de phospholipides avec des protéines.",
        "Rôles : délimite la cellule, contrôle les échanges (**perméabilité sélective**), permet la reconnaissance entre cellules et leur regroupement en tissus (sucres de surface), déclenche la réponse immunitaire."
      ]}
    ]
  },
  {
    id: "C4", titre: "CM 1-3 · Transport membranaire et système nerveux", themes: ["C4", "T1", "T3"],
    sections: [
      {h: "Transports passifs (sans énergie)", pts: [
        "Les molécules suivent leur **gradient de concentration**, du plus concentré vers le moins concentré.",
        "**Diffusion simple** : les substances liposolubles et non polaires (O2, CO2, graisses, alcool) traversent la bicouche ; les polaires passent par des pores, lentement.",
        "**Osmose** : diffusion de l'**eau** à travers les **aquaporines**, dirigée par le gradient de concentration des solutés. **Osmolarité** = concentration totale des particules d'une solution.",
        "**Diffusion facilitée** : grâce à un **transporteur** spécifique (ex. GLUT pour le glucose, trop gros pour les pores). Très sélective, elle peut **saturer** car les transporteurs sont en nombre limité."
      ]},
      {h: "Transports actifs (avec ATP)", pts: [
        "**Transport actif primaire** : une pompe utilise l'ATP pour déplacer une substance **contre son gradient** (des faibles vers les fortes concentrations).",
        "**Pompe Na+/K+** : fait **sortir 3 Na+** et **entrer 2 K+**, tous les deux contre leur gradient (Na+ est plus concentré dehors, K+ dedans).",
        "**Transport actif secondaire** : utilise le gradient d'une substance pour en transporter une autre.",
        "**Transport vésiculaire** : **endocytose** (entrée de grosses molécules) et **exocytose** (sortie, ex. neurotransmetteurs, hormones)."
      ]},
      {h: "Organisation du système nerveux", pts: [
        "**SNC** : encéphale (cerveau, diencéphale, cervelet, tronc cérébral) et moelle épinière. **SNP** : nerfs crâniens et rachidiens (43 paires).",
        "Cortex : partie consciente (percevoir, réfléchir, contrôler les mouvements). **Thalamus** : intégration sensorielle. **Hypothalamus** : homéostasie (pression artérielle, FC, ventilation, température).",
        "**Cervelet** : coordonne les contractions des muscles squelettiques. **Tronc cérébral** : jonction cerveau-moelle, centres du système nerveux autonome.",
        "Voies **sensitives (afférentes)** vers le SNC ; voies **motrices (efférentes)** vers la périphérie. 5 types de récepteurs : mécano-, thermo-, noci-, photo- et chémorécepteurs.",
        "SN **somatique** (volontaire) et SN **autonome** (involontaire), lui-même divisé en sympathique et parasympathique, aux effets opposés."
      ]},
      {h: "Sympathique et parasympathique", pts: [
        "**Sympathique** : action et lutte. Neurotransmetteur **noradrénaline**, hormone **adrénaline**.",
        "À l'exercice, il augmente la FC et la force du cœur, dilate les vaisseaux des muscles actifs et les bronches, augmente le métabolisme et fait libérer du glucose par le foie.",
        "**Parasympathique** : repos, digestion, économie d'énergie. Baisse de la FC, bronchoconstriction."
      ]},
      {h: "Neurone et influx nerveux", pts: [
        "Neurone : **corps cellulaire** (noyau), **dendrites** (rôle sensitif, plusieurs), **un seul axone** (rôle moteur) terminé par des boutons synaptiques remplis de neurotransmetteurs.",
        "**Potentiel de repos** ≈ **-70 mV** (intérieur négatif), entretenu par la pompe Na+/K+ et les canaux de fuite (surtout K+).",
        "**Dépolarisation** : l'intérieur devient moins négatif. **Hyperpolarisation** : la différence augmente.",
        "**Potentiel d'action** : dépolarisation brève (≈ 1 ms) de -70 à environ **+30 mV**, puis retour au repos. Il n'apparaît que si le **seuil d'excitation** est atteint : loi du **tout ou rien**.",
        "Vitesse : plus rapide si l'axone est **myélinisé** (conduction **saltatoire** de nœud de Ranvier en nœud, jusqu'à 120 m/s, 5 à 50 fois plus vite) et de **gros diamètre**."
      ]},
      {h: "La synapse", pts: [
        "**Synapse chimique** : neurone présynaptique, fente synaptique, neurone postsynaptique. Le message passe par un **neurotransmetteur**.",
        "Transmission dans **un seul sens** : de l'axone présynaptique vers les récepteurs postsynaptiques (souvent sur les dendrites).",
        "Il existe aussi des synapses électriques, où le potentiel d'action passe directement."
      ]}
    ]
  },
  {
    id: "C5", titre: "CM 4-6 · Fonction musculaire", themes: ["C5", "T4", "T5", "T6"],
    sections: [
      {h: "Trois tissus musculaires", pts: [
        "**Squelettique** : strié, **volontaire** ; contraction rapide et forte mais **très fatigable**.",
        "**Cardiaque** : strié, **involontaire**. **Lisse** : non strié, involontaire, dans la paroi des organes creux.",
        "Fonctions : mouvement, maintien de la posture, stabilisation des articulations, production de chaleur.",
        "Propriétés : **excitabilité, contractilité, extensibilité, élasticité**."
      ]},
      {h: "Structure du muscle", pts: [
        "**Épimysium** : autour du muscle entier (protection, forme, glissement). **Périmysium** : autour de chaque **faisceau**. **Endomysium** : autour de chaque **fibre** (isolant électrique).",
        "**Fibre musculaire** : cellule géante, **plurinucléée**, 10 à 100 µm de diamètre, jusqu'à environ 30 cm de long.",
        "**Sarcolemme** : membrane de la fibre qui transmet l'excitation ; ses invaginations sont les **tubules transverses (T)**.",
        "**Sarcoplasme** : contient **glycogène** et **myoglobine** (réserve d'O2), des mitochondries, et le **réticulum sarcoplasmique** dont les citernes stockent le **Ca2+**.",
        "Les **myofibrilles** remplissent la fibre ; elles sont faites de sarcomères en série."
      ]},
      {h: "Le sarcomère", pts: [
        "Unité **contractile** du muscle, limitée par deux **stries Z**.",
        "**Bande A** sombre au centre = longueur des filaments **épais de myosine**. **Bandes I** claires de part et d'autre = filaments **fins d'actine** seuls.",
        "L'**actine** est accrochée aux **stries Z** ; la **myosine** est au milieu (ligne M).",
        "Filament fin : **actine + tropomyosine + troponine**. Têtes de myosine : elles **dégradent l'ATP** et **se lient à l'actine**."
      ]},
      {h: "Commande et contraction", pts: [
        "**Jonction neuromusculaire** : synapse chimique entre motoneurone et fibre ; neurotransmetteur **acétylcholine**. En général **une seule** par fibre ; la **plaque motrice** est la zone du sarcolemme qui la reçoit.",
        "1. **Excitation** : le PA parcourt le sarcolemme et les tubules T ; les citernes libèrent le **Ca2+**.",
        "2. **Couplage** : le Ca2+ se fixe sur la **troponine**, qui fait pivoter la **tropomyosine**.",
        "3. **Pontage** : les sites de l'actine sont libérés, les têtes de myosine s'y accrochent.",
        "4. **Glissement** : l'ATP est dégradé, la tête pivote (le « rameur ») et tire l'actine vers le centre. Les stries Z se rapprochent, **aucun filament ne change de longueur**.",
        "5. **Relâchement** : quand les PA cessent, le Ca2+ est repompé dans les citernes et la tropomyosine reprend sa place."
      ]},
      {h: "Unité motrice et gradation de la force", pts: [
        "**Unité motrice** = un motoneurone + toutes les fibres qu'il innerve, en moyenne **≈ 150** fibres. Petites dans les muscles de précision, grandes dans les muscles posturaux. Ses fibres sont **dispersées** dans le muscle.",
        "Un PA du motoneurone fait contracter **toutes** les fibres de l'unité.",
        "**Secousse** : réponse à un stimulus unique, avec **latence** (couplage excitation-contraction), **contraction** (10 à 100 ms) et **relâchement** (retour du Ca2+, phase la plus longue).",
        "Pour plus de force : **sommation temporelle** (augmenter la fréquence des PA, jusqu'au **tétanos** incomplet puis complet) et **sommation spatiale** (recruter plus d'unités motrices).",
        "Le tétanos (contractions fusionnées) est le mode habituel de contraction de nos muscles."
      ]},
      {h: "Types de fibres", pts: [
        "Répartition moyenne : **50 % ST**, **25 % FTa**, **25 % FTb**, variable selon le muscle. Le **soléaire** est presque entièrement en fibres lentes.",
        "**ST (lentes, type I)** : **rouges** (myoglobine), très vascularisées, riches en mitochondries, ATP par voie **oxydative**, **peu fatigables**, myosine ATPase lente. Unités motrices de **10 à 180 fibres**, très excitables.",
        "**FT (rapides, type II)** : blanches, peu vascularisées, ATP surtout par la **glycolyse**, contraction forte et brève, **fatigables**. Unités motrices de **300 à 800 fibres**, peu excitables.",
        "La différence de force vient du **nombre de fibres** par unité motrice, pas de la force d'une fibre isolée.",
        "Exemples : ST pour le marathon ; FTa pour le 1500 m ou le 400 m nage ; FTb pour le 100 m ou le 50 m nage libre.",
        "Recrutement : marche = ST, jogging = ST + FTa, sprint = + FTb. Les fondeurs ont une majorité de ST, les sprinters de FT, mais la typologie n'est pas le seul facteur de performance."
      ]},
      {h: "Recrutement et types de contraction", pts: [
        "À faible fréquence, seuls les petits motoneurones (fibres ST) sont recrutés. Plus la fréquence des PA augmente, plus d'unités sont recrutées, selon leur seuil d'excitabilité.",
        "**Recrutement asynchrone** : les unités se relaient, ce qui leur permet de se relâcher et de resynthétiser leur ATP.",
        "Rôles des muscles : **agonistes** (responsables du mouvement), **antagonistes** (s'y opposent, protègent l'articulation), **synergiques** (aident les agonistes).",
        "**Isométrique** : contraction sans mouvement (pousser un objet trop lourd).",
        "**Isotonique (anisométrique)** : **concentrique** (le muscle se raccourcit) ou **excentrique** (il se contracte en s'allongeant, comme les extenseurs du genou en descente)."
      ]}
    ]
  },
  {
    id: "C6", titre: "CM 7-8 · Bioénergétique de l'exercice", themes: ["C6", "T7", "T8"],
    sections: [
      {h: "L'ATP", pts: [
        "Unités : 1 kcal = 4,185 kJ. L'énergie des aliments est stockée sous forme d'**ATP**, la « monnaie énergétique » de la cellule.",
        "**Hydrolyse** : ATP + H2O donne ADP + P et libère **30,5 kJ/mol**. Elle est **anaérobie** et immédiate.",
        "Réserve très faible (≈ 85 g) et l'ATP ne peut pas être apporté par le sang : il doit être **resynthétisé en continu** dans la cellule."
      ]},
      {h: "Voie 1 : la phosphocréatine (anaérobie alactique)", pts: [
        "La **PCr** cède son phosphate à l'ADP pour reformer de l'ATP, vite et sans O2.",
        "Sa concentration est **3 à 5 fois** celle de l'ATP : c'est un réservoir de phosphates. Si l'ATP est en excès, la réaction s'inverse."
      ]},
      {h: "Voie 2 : la glycolyse (anaérobie lactique)", pts: [
        "Dégradation partielle du glucose en **2 acides pyruviques**, dans le **cytoplasme** (hors des mitochondries), sans O2.",
        "Elle consomme 2 ATP et en produit 4 : **bilan net + 2 ATP**.",
        "Si les besoins dépassent l'apport d'O2 ou les enzymes oxydatives (effort intense), le pyruvate devient **acide lactique**, qui diffuse dans le sang.",
        "L'acide lactique **n'est pas un déchet** : le foie peut le retransformer en glucose (**cycle de Cori**, néoglucogenèse)."
      ]},
      {h: "Voie 3 : les oxydations phosphorylantes (aérobie)", pts: [
        "Dans la **mitochondrie**, des transporteurs prennent les électrons des hydrogènes arrachés aux substrats et les passent le long de la **chaîne respiratoire** ; chaque transfert libère de l'énergie stockée en ATP.",
        "L'**oxygène** est le **dernier accepteur d'électrons** : il se combine aux H+ pour former de l'**eau**.",
        "Trois conditions : des transporteurs d'électrons, assez d'O2, assez d'enzymes."
      ]},
      {h: "Énergie des glucides", pts: [
        "Seuls nutriments capables de refaire de l'ATP **sans O2**. Ils couvrent environ la moitié des besoins lors d'activités légères à modérées.",
        "Oxydation complète : C6H12O6 + 6 O2 donne 6 CO2 + 6 H2O + **2880 kJ**, soit 94 ATP en théorie mais **36 ATP** en réalité : seulement **38 %** de l'énergie est récupérée, le reste part en chaleur.",
        "Le pyruvate entre dans la mitochondrie et devient **acétyl-CoA** (+ 1 NADH,H+), qui entre dans le **cycle de Krebs**.",
        "Un tour de Krebs : 1 ATP, 3 NADH,H+ et 1 FADH2. Avec 1 NADH = 3 ATP et 1 FADH2 = 2 ATP, cela fait **12 ATP par tour**.",
        "Bilan du glucose : glycolyse + 2, NADH de la glycolyse + 6, leur transport - 2, 2 pyruvates + 6, 2 tours de Krebs + 24 = **36 ATP**."
      ]},
      {h: "Énergie des lipides et des protides", pts: [
        "Les lipides sont la **plus grande réserve** d'énergie (environ 72 000 kcal contre environ 1500 kcal de glucides). Ils fournissent 30 à 80 % de l'énergie utilisée.",
        "Un triglycéride donne 1 glycérol + 3 acides gras. Le glycérol rejoint la voie du pyruvate (**22 ATP**) ; les acides gras sont transformés en acétyl-CoA par la **β-oxydation** (147 ATP par acide gras), soit **463 ATP** par triglycéride.",
        "Leur dégradation est **impossible sans O2**.",
        "Protides : les acides aminés perdent leur azote par **transamination** et donnent un acide cétonique qui peut entrer dans le cycle de Krebs."
      ]}
    ]
  },
  {
    id: "C7", titre: "CM 9-10 · Bioénergétique appliquée à l'exercice", themes: ["C7", "T9", "T10"],
    sections: [
      {h: "Coût et rendement énergétiques", pts: [
        "**Coût énergétique** : énergie totale dépensée ; il dépend de la distance, du poids et de la durée (donc de la vitesse). Ex. : 100 m ≈ 80 kcal, marathon ≈ 2500 kcal.",
        "**Rendement** (%) = puissance mécanique / puissance métabolique × 100 : la part de l'énergie dépensée qui sert vraiment au travail mécanique."
      ]},
      {h: "Mesurer la dépense : VO2 et QR", pts: [
        "Lors d'un effort long, la production d'ATP est proportionnelle à la **consommation d'O2**. 1 L d'O2 ≈ **21 kJ** avec des glucides, ≈ 20,1 kJ avec un mélange lipides-glucides.",
        "**Quotient respiratoire** QR = VCO2 / VO2. **Glucides = 1**, **lipides = 0,7**, entre les deux = mélange.",
        "Mesure par **calorimétrie indirecte** : on compare l'air inspiré (20,9 % O2, 0 % CO2) et l'air expiré (≈ 16 % O2, ≈ 4 % CO2). VO2 = Vi × FiO2 - Ve × FeO2.",
        "**Métabolisme de base** : dépense minimale, au repos, allongé, après au moins 8 h de sommeil et 12 h de jeûne ; **1200 à 2400 kcal/jour**.",
        "Il augmente avec la masse maigre (hommes > femmes), la température et le stress ; il diminue avec l'âge. Dépense quotidienne normale : 1800 à 3000 kcal ; certains athlètes dépassent 10 000 kcal."
      ]},
      {h: "VO2max", pts: [
        "La VO2 augmente avec l'intensité jusqu'à un **plateau** : c'est la **VO2max**, consommation maximale d'O2, meilleur indicateur de l'aptitude aérobie.",
        "Exprimée en **ml/min/kg**. Jeunes de 18-22 ans modérément actifs : 38 à 42. Records : 94 (skieur de fond norvégien), 74 chez les femmes (skieuse russe).",
        "Chez les inactifs, elle baisse d'environ **1 % par an** après 25-30 ans."
      ]},
      {h: "Déficit et dette d'O2", pts: [
        "**Déficit d'O2** : au début de l'effort, l'apport d'O2 met plusieurs minutes à atteindre l'état stable (le temps que cœur et ventilation s'adaptent). Les voies **anaérobies** comblent le manque.",
        "**EPOC** (ancienne « dette d'O2 ») : la VO2 reste élevée en récupération pour reconstituer l'ATP et la PCr, transformer les lactates (glycogène ou CO2 + H2O), recharger l'O2 de l'hémoglobine et de la myoglobine et rétablir la température."
      ]},
      {h: "Les trois filières", pts: [
        "**Anaérobie alactique** (ATP-PCr) : puissance maximale en **moins d'1 s**, la plus puissante ; réserves épuisées en moins de 10 s de sprint.",
        "**Anaérobie lactique** (glycolyse) : puissance maximale en **≈ 5 s**. Les H+ produits causent une **acidose** qui inhibe la **PFK** et freine la glycolyse.",
        "**Aérobie** : puissance maximale en **≈ 3 min** pour les glucides et **≈ 30 min** pour les lipides (grande inertie), mais **grande capacité** : les glucides permettent ≈ 93 min à 70 % de VO2max, les lipides plusieurs jours à faible intensité.",
        "Puissances maximales (mol ATP/kg/s) : ATP 11,2 ; PCr 8,6 ; glycolyse 5,2 ; glucides oxydés 2,7 ; lipides 1,4.",
        "Les filières fonctionnent **toujours ensemble** : l'intensité et la durée décident laquelle domine."
      ]},
      {h: "Glucides ou lipides : le croisement", pts: [
        "Sous **70 % de VO2max**, on brûle surtout des **lipides** ; au-dessus, surtout des **glucides** : c'est le concept de **cross-over** (croisement métabolique).",
        "L'entraînement décale ce point de croisement vers des intensités plus élevées."
      ]},
      {h: "Lactate et seuils", pts: [
        "La lactatémie dépend de la production et de l'élimination (clearance) du lactate.",
        "**Seuil aérobie (LT)** : intensité où le lactate sanguin dépasse sa valeur de repos ; indicateur du potentiel aérobie. Sédentaires **50-60 %** de VO2max, endurants **70-80 %**.",
        "**OBLA** : intensité correspondant à **4 mmol/L** de lactate. Les seuils s'expriment en % de VO2max."
      ]},
      {h: "Notions de terrain", pts: [
        "**Capacité aérobie** : énergie totale disponible par voie oxydative (réserves de substrats).",
        "**VAM** (vitesse aérobie maximale) : vitesse atteinte à VO2max ; elle dépend de la VO2max, de l'économie de déplacement et de la motivation. **PAM** : puissance atteinte à VO2max.",
        "**Endurance aérobie** : pourcentage de VO2max, de PAM ou de VAM tenable pendant une durée donnée.",
        "**Économie de locomotion** : coût énergétique le plus faible pour se déplacer à une vitesse donnée."
      ]}
    ]
  }
  ]
};
