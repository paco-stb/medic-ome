if (window.location.hostname.includes("github.io")) { window.location.href = "https://medicome.fr"; }
         
         import { getFirestore, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, collection, query, orderBy, limit, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
         import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
         import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

         // --- AJOUTE CECI ICI ---
   function getLocalDayKey() {
       const date = new Date();
       // On décale l'heure en soustrayant le décalage horaire
       const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
       // On retourne la date au format AAAA-MM-JJ
       return localDate.toISOString().split("T")[0];
   }
  
         // --- FONCTION POUR CHANGER LE TITRE DYNAMIQUEMENT ---
         function setDocTitle(titre) {
             const baseName = "Medicome - Cas Cliniques Interactifs";
             if (titre) {
                 document.title = `${titre} • Medicome`;
             } else {
                 document.title = baseName;
             }
         }
         
         // --- NEW GLOBAL IMAGE MAP ---
         // Cette variable va stocker toutes les associations Signe -> Image au chargement du JSON
         let GLOBAL_IMG_MAP = {};
         
         const REFINEMENTS = {
    "douleur_thoracique": [
        "douleur_thoracique_constrictive",      // Infarctus
        "douleur_thoracique_dechirante",        // Dissection
        "douleur_latero_thoracique_brutale",    // Pneumothorax
        "douleur_thoracique_respiratoire",      // Péricardite / Pneumonie
        "douleur_thoracique_basithoracique",    // Embolie
        "irradiation_bras_gauche_machoire",     // Infarctus
        "irradiation_dorsale_interscapulaire",  // Dissection
        "soulage_position_penche_avant",        // Péricardite
        "douleur_thoracique_atypique"           // Angoisse / FA
    ],
    "douleur_abdominale": [
        "douleur_migratrice_epigastre_fid",     // Appendicite
        "douleur_point_mcburney",               // Appendicite
        "douleur_hypocondre_droit",             // Cholécystite
        "douleur_epigastrique_transfixiante",   // Pancréatite
        "douleur_abdominale_dorsale_brutale",   // Rupture AAA
        "douleur_fosse_lombaire_brutale",       // Colique Néphrétique (CORRIGÉ: fosse)
        "douleur_fig",                          // Sigmoïdite
        "douleur_pelvienne_lateralisee",        // GEU / Kyste
        "douleur_pelvienne_bilaterale",         // Salpingite
        "defense_fid",                          // Appendicite
        "contracture_invincible_ventre_bois",   // Péritonite
        "douleur_brutale_hcd",                  // Lithiase biliaire
        "crampes_abdominales"                   // Gastro
    ],
    "toux": [
        "toux_seche",                           // Pneumothorax / Grippe
        "toux_grasse",                          // Bronchite
        "toux_chronique",                       // Tuberculose
        "toux_aboyante_rauque",                 // Laryngite
        "toux_quinteuse_emetisante",            // Coqueluche
        "reprise_inspiratoire_chant_coq",       // Coqueluche
        "expectorations_mousseuses_roses",      // OAP (CORRIGÉ: roses)
        "expectorations_purulentes",            // BPCO / Pneumonie
        "hemoptysie"                            // EP / Cancer / Tuberculose
    ],
    "dyspnee": [
        "dyspnee_effort",                       // Anémie / IC
        "dyspnee_brutale",                      // EP
        "orthopnee",                            // OAP
        "dyspnee_expiratoire",                  // Asthme
        "bradypnee_inspiratoire",               // Laryngite
        "dyspnee_sifflante",                    // Asthme / Bronchiolite
        "freinage_expiratoire",                 // Asthme / BPCO
        "polypnee"                              // Choc
    ],
    "fievre": [
        "fievre_elevee",                        // Grippe / Méningite
        "fievre_moderee",                       // Appendicite
        "frissons_intenses",                    // Pneumonie / Pyélo
        "sueurs_nocturnes",                     // Tuberculose / Lymphome
        "triade_frissons_chaleur_sueurs",       // Paludisme
        "fievre_retour_voyage"                  // Paludisme
    ],
    "cephalees": [
        "cephalee_coup_tonnerre",               // HSA
        "cephalees_progressives",               // HSD / Tumeur
        "cephalee_unilaterale",                 // Migraine
        "pulsatilite",                          // Migraine
        "raideur_nuque",                        // Méningite / HSA
        "photophobie_phonophobie",              // Méningite / Migraine
        "cephalees_retro_orbitaires",           // Grippe
        "cephalees_matinales"                   // Apnée du sommeil
    ],
    "troubles_visuels": [
        "diplopie",                             // Myasthénie
        "vision_floue",                         
        "baisse_acuite_visuelle_unilaterale",   // Glaucome / Névrite
        "metamorphopsies",                      // DMLA
        "scotome_central",                      // DMLA
        "phosphenes_eclairs",                   // Décollement rétine
        "myodesopsies_pluie_suie",              // Décollement rétine
        "vision_halos_colores",                 // Glaucome
        "amputation_champ_visuel_peripherique"  // Décollement rétine
    ],
    "troubles_neuro": [
        "hemiplegie",                           // AVC
        "aphasie",                              // AVC
        "perte_connaissance_brutale",           // Épilepsie
        "convulsions",                          // Épilepsie
        "confusion",                            // Choc / Hypoglycémie
        "tremblement_repos",                    // Parkinson
        "rigidite_plastique_roue_dentee",       // Parkinson
        "paralysie_ascendante_symetrique",      // Guillain-Barré
        "paralysie_faciale_centrale"            // AVC
    ],
    "anomalie_peau": [
        "ictere",                               // Cirrhose / Drépanocytose
        "ictere_cutaneo_muqueux",               // Hépatite (AJOUTÉ)
        "purpura_fulminans",                    // Méningite
        "eruption_vesiculeuse_metamerique",     // Zona
        "plaques_erythemato_squameuses",        // Psoriasis
        "erytheme_migrant_pathognomonique",     // Lyme
        "tache_vasculaire_saignante",           // Epistaxis
        "melanodermie",                         // Addison
        "eruption_maculo_papuleuse_descendante",// Rougeole
        "prurit_nocturne"                       // Gale
    ],
    "genes_urinaires": [
        "brulures_mictionnelles",               // Cystite / Pyélo
        "hematurie_macroscopique_totale",       // Cancer Vessie
        "urines_troubles_malodorantes",         // Cystite
        "pollakiurie",                          // Cystite / Prostate
        "dysurie",                              // Prostate
        "anurie_oligurerie",                    // IRA
        "globe_vesical_palpable"                // RAU
    ],
    "douleur_membre_traumatisme": [
        "impotence_fonctionnelle_totale",       // Fracture
        "raccourcissement_membre",              // Fracture col fémur
        "rotation_externe_pied",                // Fracture col fémur
        "deformtion_dos_fourchette",            // Pouteau-Colles (Laisser la faute car elle est dans le JSON)
        "douleur_brutale_intense",              // Ischémie
        "abolition_pouls_distaux",              // Ischémie
        "articulation_rouge_chaude_gonflee",    // Arthrite
        "monoarthrite_gros_orteil"              // Goutte
    ],
    "douleur_dos": [
        "douleur_lombaire_brutale_effort",      // Lumbago
        "douleur_trajet_membre_inf",            // Sciatique / Hernie
        "rachialgies_inflammatoires",           // Spondylarthrite
        "impulsivite_toux"                      // Hernie / Sciatique
    ],
    "trouble_psy": [
        "humeur_triste_constante",              // Dépression
        "idees_suicidaires",                    // Dépression
        "syndrome_delirant_paranoide",          // Schizophrénie
        "episode_maniaque",                     // Bipolaire
        "peur_intense_brutale",                 // Panique
        "dysmorphophobie",                      // Anorexie
        "triade_3A"                             // Anorexie
    ]
};

    // Les "Chefs de file" : Questions génériques qui orientent vers une spécialité
const GENERAL_SYMPTOMS = [
    "douleur_thoracique",       // Oriente vers Cardio / Pneumo
    "douleur_abdominale",// Oriente vers Digestif / Uro / Gynéco
    "douleur_dos",
    "fievre",                   // Oriente vers Infectio / Inflammatoire
    "dyspnee",                  // Oriente vers Pneumo / Cardio
    "cephalees",                // Oriente vers Neuro / ORL
    "troubles_neuro",           // Oriente vers Neuro (Déficit, malaise...)
    "anomalie_peau",            // Oriente vers Dermato
    "douleur_membre_traumatisme", // Oriente vers Ortho/Rhumato
    "genes_urinaires",          // Oriente vers Uro/Nephro
    "trouble_psy"               // Oriente vers Psy
];     
         const PATHO_GROUPS = {
    // CARDIO
    "Infarctus du myocarde": "Cardio", "Embolie pulmonaire": "Cardio", "OAP (Insuffisance Cardiaque)": "Cardio", 
    "Dissection Aortique": "Cardio", "Péricardite Aiguë": "Cardio", "Fibrillation Atriale": "Cardio", 
    "Endocardite Infectieuse": "Cardio", "Ischémie Aiguë Membre": "Cardio", "Rupture Anévrisme Aorte": "Cardio", 
    "Choc Septique": "Cardio",

    // NEURO
    "AVC Ischémique": "Neuro", "Méningite Aiguë": "Neuro", "Hémorragie Méningée": "Neuro", 
    "Crise d'Épilepsie": "Neuro", "Parkinson": "Neuro", "Sclérose en Plaques": "Neuro", 
    "Maladie d'Alzheimer": "Neuro", "Myasthénie": "Neuro", "Hématome Sous-Dural": "Neuro", 
    "Hématome Extra-Dural": "Neuro", "Guillain-Barré": "Neuro",

    // PNEUMO
    "Pneumopathie Franche": "Pneumo", "Pneumothorax": "Pneumo", "Crise d'Asthme": "Pneumo", 
    "Bronchiolite": "Pneumo", "BPCO Exacerbation": "Pneumo", "Cancer Bronchique": "Pneumo", 
    "Tuberculose Pulmonaire": "Pneumo", "Apnée du Sommeil": "Pneumo", "Pleurésie": "Pneumo",

    // DIGESTIF
    "Appendicite Aiguë": "Digestif", "Cholécystite Aiguë": "Digestif", "Gastro-entérite": "Digestif", 
    "Occlusion Intestinale": "Digestif", "Pancreatite Aiguë": "Digestif", "Hémorragie Digestive Haute": "Digestif", 
    "Sigmoïdite": "Digestif", "Hernie Inguinale Étranglée": "Digestif", "Reflux Gastro-Oesophagien": "Digestif", 
    "Cirrhose Décompensée": "Digestif", "Cancer Colorectal": "Digestif", "Maladie de Crohn": "Digestif", 
    "Rectocolite Hémorragique": "Digestif", "Ulcère Gastroduodénal": "Digestif", "Hépatite Aiguë": "Digestif", 
    "Lithiase Biliaire": "Digestif", "Hernie Hiatale": "Digestif", "Péritonite": "Digestif", 
    "Ischémie Mésentérique": "Digestif", "Sténose du Pylore": "Digestif", "Invagination Intestinale Aiguë": "Digestif",

    // URO / NEPHRO
    "Colique Néphrétique": "Uro/Nephro", "Pyélonéphrite Aiguë": "Uro/Nephro", "Torsion du Testicule": "Uro/Nephro", 
    "Rétention Aiguë d'Urine": "Uro/Nephro", "Cancer Prostate": "Uro/Nephro", "Tumeur Vessie": "Uro/Nephro", 
    "Insuffisance Rénale Aiguë": "Uro/Nephro", "Syndrome Néphrotique": "Uro/Nephro", "Cystite Aiguë": "Uro/Nephro", 
    "Cancer du Testicule": "Uro/Nephro", "Insuffisance Rénale Chronique": "Uro/Nephro",

    // GYNECO
    "Grossesse Extra-Utérine": "Gynéco", "Salpingite Aiguë": "Gynéco", "Endométriose": "Gynéco", 
    "Cancer du Sein": "Gynéco", "Pré-éclampsie": "Gynéco", "Fibrome Utérin": "Gynéco", 
    "Kyste Ovarien": "Gynéco", "Mycose Vaginale": "Gynéco", "SOPK": "Gynéco",

    // DERMATO
    "Érysipèle": "Dermato", "Zona": "Dermato", "Purpura Rhumatoïde": "Dermato", "Varicelle": "Dermato", 
    "Psoriasis": "Dermato", "Mélanome": "Dermato", "Carcinome Basocellulaire": "Dermato", "Gale": "Dermato", 
    "Rougeole": "Dermato", "Syndrome de Kawasaki": "Dermato", "Scarlatine": "Dermato", "Impétigo": "Dermato", 
    "Acné Sévère": "Dermato", "Eczéma Atopique": "Dermato", "Urticaire Aiguë": "Dermato",

    // RHUMATO / ORTHO
    "Fracture Col Fémur": "Rhumato", "Arthrite Septique": "Rhumato", "Sciatique": "Rhumato", 
    "Crise de Goutte": "Rhumato", "Fracture Pouteau-Colles": "Rhumato", "Polyarthrite Rhumatoïde": "Rhumato", 
    "Spondylarthrite": "Rhumato", "Ostéoporose Fracturaire": "Rhumato", "Canal Carpien": "Rhumato", 
    "Lumbago": "Rhumato", "Entorse de Cheville": "Rhumato", "Arthrose": "Rhumato", "Lupus Érythémateux": "Rhumato", 
    "Hernie Discale": "Rhumato",

    // HEMATO / ENDO
    "Anémie Ferriprive": "Endo/Hémato", "Hypothyroïdie": "Endo/Hémato", "Hyperthyroïdie": "Endo/Hémato", 
    "Diabète Type 1": "Endo/Hémato", "Diabète Type 2": "Endo/Hémato", "Insuffisance Surrénalienne": "Endo/Hémato", 
    "Syndrome de Cushing": "Endo/Hémato", "Leucémie Aiguë": "Endo/Hémato", "Lymphome de Hodgkin": "Endo/Hémato", 
    "Myélome Multiple": "Endo/Hémato", "Drépanocytose": "Endo/Hémato", "Hyperparathyroïdie": "Endo/Hémato", 
    "Acromégalie": "Endo/Hémato", "Hémophilie": "Endo/Hémato", "Anémie de Biermer": "Endo/Hémato", "Diabète Insipide": "Endo/Hémato",

    // PSY
    "Attaque de Panique": "Psy", "Dépression": "Psy", "Schizophrénie": "Psy", 
    "Trouble Bipolaire": "Psy", "Anorexie Mentale": "Psy",

    // ORL / OPHTALMO
    "Glaucome Aigu": "ORL/Ophtalmo", "Otite Moyenne Aiguë": "ORL/Ophtalmo", "DMLA": "ORL/Ophtalmo", 
    "Cataracte": "ORL/Ophtalmo", "Décollement de Rétine": "ORL/Ophtalmo", "VPPB": "ORL/Ophtalmo", 
    "Angine Bactérienne": "ORL/Ophtalmo", "Epistaxis": "ORL/Ophtalmo", "Sinusite Aiguë": "ORL/Ophtalmo", 
    "Laryngite Aiguë": "ORL/Ophtalmo", "Conjonctivite": "ORL/Ophtalmo", "Orgelet": "ORL/Ophtalmo",

    // INFECTIO
    "Paludisme": "Infectio", "Coqueluche": "Infectio", "Grippe": "Infectio", 
    "Mononucléose Infectieuse": "Infectio", "Primo-Infection VIH": "Infectio", "Maladie de Lyme": "Infectio", 
    "Tétanos": "Infectio", "Botulisme": "Infectio", "Rubéole": "Infectio", 
    "Syphilis": "Infectio", "Oreillons": "Infectio", "Muguet Buccal": "Infectio"
};
         // MAPPING : Groupe de Maladie -> Symptôme Chef de file (Doit exister dans GENERAL_SYMPTOMS)
const SYSTEM_LEADERS = {
    "Cardio": "douleur_thoracique",
    "Pneumo": "dyspnee", // ou toux, mais dyspnee est plus sensible en urgence
    "Neuro": "troubles_neuro", // Couvre déficit, malaise...
    "Digestif": "douleur_abdominale",
    "Uro/Nephro": "genes_urinaires", // ou douleur_abdominale (flanc)
    "Gynéco": "douleur_abdominale", // Pelvienne
    "Dermato": "anomalie_peau",
    "Rhumato": "douleur_membre_traumatisme",
    "Endo/Hémato": "fievre", // Souvent systémique (ou fatigue, mais fievre est mieux)
    "Psy": "trouble_psy",
    "ORL/Ophtalmo": "cephalees", // ou troubles_visuels
    "Infectio": "fievre"
};

// MAPPING : Facteur de Risque (state.demo) -> Bonus pour Groupes de maladies
const CONTEXT_RULES = [
    // Risque Vasculaire -> Cardio & Neuro
    { trigger: ['tabac', 'diabete', 'hta', 'cholesterol', 'surpoids', 'homme_age'], targets: ['Cardio', 'Neuro'], bonus: 15 },
    // Risque Pulmonaire -> Pneumo
    { trigger: ['tabac', 'fumeur'], targets: ['Pneumo'], bonus: 15 },
    // Risque Thrombo-embolique -> Cardio (EP)
    { trigger: ['chirurgie', 'alitement', 'cancer', 'avion', 'voyage'], targets: ['Cardio'], bonus: 20 },
    // Terrain Infectieux
    { trigger: ['fievre', 'voyage', 'immuno', 'hiv'], targets: ['Infectio', 'Pneumo'], bonus: 10 },
    // Terrain Gynéco
    { trigger: ['femme', 'grossesse', 'contraception'], targets: ['Gynéco'], bonus: 10 },
    // Terrain Psy/Jeune
    { trigger: ['stress', 'jeune', 'etudiant'], targets: ['Psy'], bonus: 10 },
    // Terrain Trauma/Sport
    { trigger: ['sport', 'trauma', 'chute'], targets: ['Rhumato'], bonus: 20 }
];
         
         // --- 3D-STYLE ICONS (USING PHOSPHOR DUOTONE) ---
         const ACHIEVEMENTS = [
             { id: "played_10_days", title: "Habitué", desc: "Connexion 10 jours", iconClass: "ph-duotone ph-calendar-check color-bronze" },
             { id: "played_30_days", title: "Fidèle", desc: "Connexion 30 jours", iconClass: "ph-duotone ph-calendar-check color-silver" },
             { id: "played_90_days", title: "Addict", desc: "Connexion 90 jours", iconClass: "ph-duotone ph-calendar-check color-gold" },
         
             { id: "baby_doc", title: "P1 validée", desc: "Identifier 1 pathologie", iconClass: "ph-duotone ph-baby color-silver" },
             { id: "med_student", title: "Externe", desc: "Identifier 25 pathologies", iconClass: "ph-duotone ph-student color-accent" },
             { id: "intern", title: "Interne", desc: "Identifier 50 pathologies", iconClass: "ph-duotone ph-stethoscope color-accent" },
             { id: "chief", title: "Chef de Clinique", desc: "Identifier 100 pathologies", iconClass: "ph-duotone ph-hospital color-gold" },
             
             { id: "cases_100", title: "Débutant", desc: "100 cas joués", iconClass: "ph-duotone ph-folder-open color-bronze" },
             { id: "cases_1000", title: "Expérimenté", desc: "1000 cas joués", iconClass: "ph-duotone ph-folder-open color-silver" },
             { id: "cases_5000", title: "Vétéran", desc: "5000 cas joués", iconClass: "ph-duotone ph-folder-open color-gold" },
         
             { id: "daily_10", title: "Expert du Quotidien", desc: "10 défis du jour", iconClass: "ph-duotone ph-sun color-bronze" },
             { id: "daily_50", title: "Champion du Jour", desc: "50 défis du jour", iconClass: "ph-duotone ph-sun color-silver" },
             { id: "daily_150", title: "Légende Solaire", desc: "150 défis du jour", iconClass: "ph-duotone ph-sun color-gold" },
         
             { id: "critic", title: "Critique Médical", desc: "Publier un avis", iconClass: "ph-duotone ph-star color-gold" },
             { id: "fan", title: "Fan Club", desc: "Suivre sur les réseaux", iconClass: "ph-duotone ph-heart color-ruby" },
             { id: "bookworm_1", title: "Rat de Bibliothèque", desc: "Télécharger 1 fiche PDF", iconClass: "ph-duotone ph-scroll color-bronze" },
             { id: "bookworm_25", title: "Archiviste", desc: "Télécharger 25 fiches PDF", iconClass: "ph-duotone ph-books color-silver" },
             { id: "bookworm_50", title: "Bibliothécaire", desc: "Télécharger 50 fiches PDF", iconClass: "ph-duotone ph-columns color-gold" },
             { id: "bookworm_100", title: "Savoir Absolu", desc: "Télécharger 100 fiches PDF", iconClass: "ph-duotone ph-brain color-accent" },
             { id: "master_5", title: "Major de Promo", desc: "5 pathologies au rang Maître", iconClass: "ph-duotone ph-medal color-bronze" },
             { id: "master_30", title: "Professeur", desc: "30 pathologies au rang Maître", iconClass: "ph-duotone ph-crown color-silver" },
             { id: "master_100", title: "Légende", desc: "100 pathologies au rang Maître", iconClass: "ph-duotone ph-trophy color-gold" },
             { id: "encyclopedia", title: "Encyclopédie Vivante", desc: "Débloquer toutes les pathologies", iconClass: "ph-duotone ph-globe color-accent" },
             { id: "god_mode", title: "Dieu de la Médecine", desc: "Toutes pathologies en Maître", iconClass: "ph-duotone ph-lightning color-gold" },
             { id: "speed_demon", title: "Flash", desc: "10 diagnostics en moins de 30s", iconClass: "ph-duotone ph-rocket color-ruby" }, 
             { id: "speed_50", title: "Vitesse Lumière", desc: "50 diagnostics en moins de 30s", iconClass: "ph-duotone ph-shooting-star color-gold" },
             { id: "speed_100", title: "Voyageur Temporel", desc: "100 diagnostics en moins de 30s", iconClass: "ph-duotone ph-hourglass color-accent" }
         ];
         
         const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
         function playSound(type) {
             if(audioCtx.state === 'suspended') audioCtx.resume();
             const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
             osc.connect(gainNode); gainNode.connect(audioCtx.destination);
             
             if (type === 'success') {
                 osc.type = 'sine'; osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(1046.5, audioCtx.currentTime + 0.1);
                 gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                 osc.start(); osc.stop(audioCtx.currentTime + 0.4);
             } else if (type === 'error') {
                 osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, audioCtx.currentTime); osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.3);
                 gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                 osc.start(); osc.stop(audioCtx.currentTime + 0.3);
             }
         }
         
         const firebaseConfig = {
             apiKey: "AIzaSyCig9G4gYHU5h642YV1IZxthYm_IXp6vZU",
             authDomain: "medicome-paco.firebaseapp.com",
             projectId: "medicome-paco",
             storageBucket: "medicome-paco.firebasestorage.app",
             messagingSenderId: "332171806096",
             appId: "1:332171806096:web:36889325196a7a718b5f15",
             measurementId: "G-81HJ9DWBMX"
         };
         
         let app, auth, db;
         try {
             app = initializeApp(firebaseConfig);
             auth = getAuth(app);
             db = getFirestore(app);
         } catch (error) {
             console.error("Erreur Firebase:", error);
             document.querySelector('#app').innerHTML = `<div class="alert alert-error">Erreur de configuration : ${error.message}</div>`;
         }
         
         let PATHOLOGIES = [];
         
         let state = {
              currentUser: null, 
              pseudo: null, 
              useLLM: false,     
              progression: { 
                  correct: 0, 
                  incorrect: 0, 
                  streak: 0, 
                  mastery: {}, 
                  dailyStreak: 0, 
                  lastDaily: null, 
                  achievements: [], 
                  bestTimes: {}, 
                  errorLog: {},
                  pdfDownloads: 0, 
                  speedWins: 0, 
                  socialDone: false, 
                  reviewDone: false,
                  dailyHistory: {}
              },
              isGuest: false, 
              isPremiumCode: false, // AJOUT : Identifie l'accès illimité via code partenaire
              demo: {}, 
              currentSign: null, 
              answers: {}, 
              asked: [], 
              allSigns: [], 
              ranked: [], 
              diagnosticShown: false, 
              previousDiagnostics: [],
              history: [],
              // Variables pour la phase de confirmation
              confirmationMode: false, 
              confirmationQueue: [], 
              confirmedPatho: null,
              // File d'attente pour les symptômes précis (Refinements)
              priorityQueue: [],
              isChrono: false, 
              startTime: null, 
              dailyTarget: null,
            exam: {
    active: false,
    queue: [],
    results: [],
    currentIndex: 0,
    totalTime: 0,
    config: {}
}
          };

         // Variable pour stocker le moteur du chrono
let chronoInterval = null;

// Fonction pour lancer et afficher le temps
function startLiveTimer() {
    // 1. On arrête l'ancien chrono s'il tourne encore pour éviter les bugs
    if (chronoInterval) clearInterval(chronoInterval);

    // 2. On récupère la boîte d'affichage
    const display = document.getElementById('liveTimerDisplay');
    
    // Si on n'est pas en mode chrono ou si l'affichage n'existe pas, on arrête tout
    if (!state.isChrono || !state.startTime || !display) return;

    // 3. On définit la fonction qui va tourner toutes les 1000ms (1 seconde)
    chronoInterval = setInterval(() => {
        const now = Date.now();
        const diff = Math.floor((now - state.startTime) / 1000); // Temps écoulé en secondes

        // Calcul des minutes et secondes
        const m = Math.floor(diff / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');

        // Mise à jour du texte à l'écran
        const el = document.getElementById('liveTimerDisplay');
        if (el) {
            el.innerHTML = `<i class="ph-bold ph-clock"></i> ${m}:${s}`;
        } else {
            // Si l'élément a disparu (changement de page), on coupe le moteur
            clearInterval(chronoInterval);
        }
    }, 1000);
}
         
         // === GUEST MODE ===
         // Vérifie si un invité peut jouer (1 fois par session, reset toutes les 2h)
         function checkGuestAvailability() {
         const guestData = JSON.parse(sessionStorage.getItem('guestMode')) || { canPlay: true, timestamp: 0 };
         const now = Date.now();
         
         // Reset après 2 heures
         if (now - guestData.timestamp > 2 * 60 * 60 * 1000) {
         guestData.canPlay = true;
         guestData.timestamp = now;
         }
         
         return guestData;
         }
         
         // Remplacez toute la fonction startGuestMode par :
function startGuestMode() {
    // ON SUPPRIME le blocage ici (checkGuestAvailability)
    // L'utilisateur peut entrer, c'est le bouton "Lancer le cas" qui sera grisé plus tard
    
    state.isGuest = true;
    state.pseudo = "Invité";
    
    // On initialise la progression vide si elle n'existe pas
    if (!state.progression) {
       state.progression = { correct: 0, incorrect: 0, streak: 0, mastery: {}, dailyStreak: 0 };
    }
    
    // On enregistre juste le mode, sans bloquer
    const guestData = { canPlay: true, timestamp: Date.now() }; // On garde ça pour la forme
    sessionStorage.setItem('guestMode', JSON.stringify(guestData));
    
    updateHeader();
    renderHome(); // On l'envoie sur l'accueil
    return true;
}
         
         
         // --- THEME LOGIC ---
         function toggleTheme() {
             const body = document.body;
             const current = body.getAttribute('data-theme');
             const newTheme = current === 'light' ? 'dark' : 'light';
             body.setAttribute('data-theme', newTheme);
             localStorage.setItem('medicome_theme', newTheme);
             updateThemeIcon(newTheme);
         }
         
         function updateThemeIcon(theme) {
             const btn = document.getElementById('themeBtn');
             if(btn) {
                 btn.innerHTML = theme === 'light' ? '<i class="ph-duotone ph-moon"></i>' : '<i class="ph-duotone ph-sun"></i>';
             }
         }
         
         function loadTheme() {
             const saved = localStorage.getItem('medicome_theme');
             if(saved) {
                 document.body.setAttribute('data-theme', saved);
                 updateThemeIcon(saved);
             }
             const btn = document.getElementById('themeBtn');
             if(btn) btn.onclick = toggleTheme;
         }
         
         // --- DAILY CHALLENGE LOGIC ---
         function getDailyPatho() {
             if(PATHOLOGIES.length === 0) return null;
             const today = new Date().toDateString(); 
             let hash = 0;
             for (let i = 0; i < today.length; i++) {
                 hash = today.charCodeAt(i) + ((hash << 5) - hash);
             }
             const index = Math.abs(hash) % PATHOLOGIES.length;
             return PATHOLOGIES[index];
         }
         
         // --- FONCTION LIMITE INVITÉ ---
         function checkGuestLimit() {
         if (!state.isGuest) return { allowed: true }; // Pas de limite pour les inscrits
         
         const lastPlayed = localStorage.getItem('medicome_guest_last_play');
         if (!lastPlayed) return { allowed: true };
         
         const now = Date.now();
         const twoHours = 2 * 60 * 60 * 1000; // 2 heures en millisecondes
         const diff = now - parseInt(lastPlayed);
         
         if (diff < twoHours) {
         const remainingMinutes = Math.ceil((twoHours - diff) / (60000));
         let timeText = remainingMinutes + " min";
         if (remainingMinutes > 60) {
             const h = Math.floor(remainingMinutes / 60);
             const m = remainingMinutes % 60;
             timeText = `${h}h ${m}min`;
         }
         return { allowed: false, remaining: timeText };
         }
         
         return { allowed: true };
         }
         
         
         async function initApp() {
             try {
                 // Chargement des données
                 const response = await fetch('./pathologies.json');
                 if (!response.ok) throw new Error("Impossible de lire le fichier de données pathologies.json");
                 PATHOLOGIES = await response.json();
                 
                 // --- NEW : GENERATE GLOBAL IMAGE MAP FROM JSON DATA ---
                 // This allows renderCurrentQuestion to access images easily
                 PATHOLOGIES.forEach(p => {
                     if(p.images) {
                         for (const [signKey, imgUrl] of Object.entries(p.images)) {
                             GLOBAL_IMG_MAP[signKey] = imgUrl;
                         }
                     }
                 });
                 console.log("Images loaded:", Object.keys(GLOBAL_IMG_MAP).length);
                 
                 // DEEP LINKING
                 const urlParams = new URLSearchParams(window.location.search);
                 const ficheDemandee = urlParams.get('fiche');
                 if (ficheDemandee) {
                     const pathoTrouvee = PATHOLOGIES.find(p => p.name.toLowerCase() === ficheDemandee.toLowerCase());
                     if (pathoTrouvee) {
                         q('#app').innerHTML = ''; 
                         showDiagnosticDetails({patho: pathoTrouvee});
                         return;
                     }
                 }
                 
                 loadTheme();
                 startAuthListener();
                 fetchNotifications();
                 
                 // === INIT BUTTON LISTENERS ===
                 const btnLegal = q('#legalLink');
                 if(btnLegal) btnLegal.onclick = renderLegalPage;
                 
                 const cLink = q('#contactLink');
                 if(cLink) cLink.onclick = renderContact;
                 
                 const rLink = q('#reviewsLink');
                 if(rLink) rLink.onclick = renderReviews;
         
                 // Social Links
                 ['linkInsta', 'linkTiktok', 'linkX'].forEach(id => {
                     const el = document.getElementById(id);
                     if(el) el.addEventListener('click', trackSocial);
                 });
         
                 // Notifs
                 const notifBtn = q('#notifBtn');
                 const notifModal = q('#notifModal');
                 if(notifBtn) {
                     notifBtn.onclick = (e) => {
                         e.stopPropagation();
                         const isVisible = notifModal.style.display === 'block';
                         notifModal.style.display = isVisible ? 'none' : 'block';
                         
                         if(!isVisible) { 
                             const badge = q('#notifBadge'); 
                             if(badge) badge.style.display = 'none'; 
                             
                             if(state.latestNotifId) {
                                 localStorage.setItem('medicome_last_read_notif', state.latestNotifId);
                             }
                         }
                     };
                 }
                 window.onclick = () => { if(notifModal) notifModal.style.display = 'none'; };
         
                 const brandLogo = document.getElementById('brandLogo');
                 if(brandLogo) {
                     brandLogo.onclick = () => { if (state.currentUser || state.isGuest) { renderHome(); } };
                 }
         
                 // GESTION DE LA VISIBILITÉ DE L'ONGLET (TITRE)
                 document.addEventListener("visibilitychange", () => {
                     if (document.hidden) {
                         // L'utilisateur a changé d'onglet
                         document.title = "⚠️ Le patient attend !";
                     } else {
                         // L'utilisateur est revenu
                         if(q('.question-text')) {
                              setDocTitle(`Question ${state.asked.length}`);
                         } else if(state.diagnosticShown && state.ranked.length > 0) {
                              setDocTitle(`Diagnostic : ${state.ranked[0].patho.name}`);
                         } else if(state.currentUser) {
                              // Si on est connecté mais pas en quiz, on peut mettre Accueil ou laisser générique
                              document.title = "Medicome";
                         } else {
                              document.title = "Medicome";
                         }
                     }
                 });
         
                 // GESTION CLAVIER AJOUTÉE
                 // GESTION CLAVIER CORRIGÉE
         document.addEventListener('keydown', (e) => {
             if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
         
             // Navigation Quiz
             if (q('.question-text')) {
                 if (e.key === 'ArrowRight' || e.key === 'y' || e.key === 'o') {
                     const btn = document.querySelector('.btn-success');
                     if(btn) btn.click();
                 } else if (e.key === 'ArrowLeft' || e.key === 'n') {
                     const btn = document.querySelector('.btn-error');
                     if(btn) btn.click();
                 } else if (e.key === 'ArrowUp' || e.key === 'i' || e.key === ' ') {
                     e.preventDefault();
                     const btns = document.querySelectorAll('.button-group .link');
                     if(btns.length > 0) btns[0].click();
                 } else if (e.key === 'Enter') {
                     const btn = document.querySelector('.btn-success');
                     if(btn) btn.click();
                 }
             } else {
                 // Navigation Menus / Accueil
                 if (e.key === 'Enter') {
                     // On vérifie si l'utilisateur est déjà sur un élément cliquable (via TAB)
                     const active = document.activeElement;
                     const isInteractive = active && (
                         active.tagName === 'BUTTON' || 
                         active.tagName === 'A' || 
                         active.classList.contains('link') || 
                         active.classList.contains('footer-link') ||
                         active.classList.contains('social-link')
                     );
         
                     // Si on n'est PAS sur un élément interactif, on clique sur le bouton principal
                     if (!isInteractive) {
                         const primaryBtn = q('.btn'); 
                         if(primaryBtn && primaryBtn.offsetParent !== null) {
                             primaryBtn.click();
                         }
                     }
                 }
             }
             
             if (e.key === 'Escape') {
                 const notifModal = q('#notifModal');
                 if(notifModal && notifModal.style.display === 'block') {
                     notifModal.style.display = 'none';
                 } else if (!q('.question-text') && state.currentUser) {
                     renderHome();
                 }
             }
         });
         
             } catch (err) {
                 console.error(err);
                 document.querySelector('#app').innerHTML = `<div class="card center"><h2 style="color:var(--error)">Erreur de chargement</h2><div class="small" style="color:orange">${err.message}</div></div>`;
             }
         }
         initApp();
         
         async function fetchNotifications() {
             try {
                 const qRef = query(collection(db, "notifications"), orderBy("date", "desc"), limit(5));
                 const snapshot = await getDocs(qRef);
                 const container = q('#notifContent');
                 
                 if (snapshot.empty) { 
                     container.innerHTML = '<div class="small">Aucune nouveauté pour le moment.</div>'; 
                     return; 
                 }
                 
                 container.innerHTML = '';
                 
                 const latestNotifId = snapshot.docs[0].id;
                 state.latestNotifId = latestNotifId; 
         
                 snapshot.forEach(doc => {
                     const n = doc.data();
                     const div = document.createElement('div');
                     div.className = 'notif-item';
                     const dateStr = n.date && n.date.seconds ? new Date(n.date.seconds * 1000).toLocaleDateString() : 'Récemment';
                     div.innerHTML = `<div class="notif-date">${dateStr}</div><div style="color:var(--text-main);">${n.message}</div>`;
                     container.appendChild(div);
                 });
         
                 const badge = q('#notifBadge');
                 const lastReadId = localStorage.getItem('medicome_last_read_notif');
         
                 if(badge && latestNotifId !== lastReadId) {
                     badge.style.display = 'block';
                 } else if (badge) {
                     badge.style.display = 'none';
                 }
         
             } catch (e) { console.log("Erreur notifs", e); }
         }
         
         function startAuthListener() {
             onAuthStateChanged(auth, async (user) => {
                 if (user) {
                     state.currentUser = user; state.isGuest = false;
                     let displayPseudo = user.displayName;
                     if (!displayPseudo && user.email) displayPseudo = user.email.split('@')[0];
                     state.pseudo = displayPseudo; updateHeader(); 
                     const docRef = doc(db, "users", user.uid);
                     try {
                         const docSnap = await getDoc(docRef);
                         if (docSnap.exists()) {
    const data = docSnap.data();
    if (data.pseudo) state.pseudo = data.pseudo;
    state.progression = { ...state.progression, ...data.progression };

    // --- DÉTECTION D'ABSENCE (NOUVEAU) ---
    if (data.lastUpdate && data.lastUpdate.seconds) {
        const lastDate = new Date(data.lastUpdate.seconds * 1000);
        const now = new Date();
        // Calcul de la différence en jours
        const diffTime = Math.abs(now - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays >= 3) {
            // On attend un peu que la page charge pour afficher le message
            setTimeout(() => {
                showAlert(`👋 Bon retour ${state.pseudo} ! Ça faisait ${diffDays} jours. Prêt à réviser ?`, "success");
                triggerConfetti(); // Petite pluie de confettis pour l'encourager
            }, 1000);
        }
    }
    // -------------------------------------
 updateHeader(); 
    updateStreakDisplay(); // ← NOUVEAU
    renderHome();
} else { saveProgression(); }
                         updateHeader(); renderHome();
                     } catch(e) { renderHome(); }
                 } else {
                     const savedGuest = localStorage.getItem('medicome_guest_progression');
                     const savedPseudo = localStorage.getItem('medicome_guest_pseudo');
                     if(!state.isGuest && savedGuest && savedPseudo) {
                         state.isGuest = true; state.pseudo = savedPseudo;
                         const parsed = JSON.parse(savedGuest);
                         state.progression = { ...state.progression, ...parsed };
                         
                         if(state.progression.streak === undefined) state.progression.streak = 0;
                         if(!state.progression.mastery) state.progression.mastery = {};
                         updateHeader(); updateStreakDisplay(); renderHome();
                         setTimeout(() => showAlert(`<i class="ph-duotone ph-party-popper"></i> Bon retour, ${state.pseudo} !`, 'success'), 500);
                     } else {
                         state.currentUser = null; state.pseudo = null; 
                         state.progression = { 
                             correct: 0, incorrect: 0, streak: 0, mastery: {}, dailyStreak: 0, lastDaily: null, achievements: [], bestTimes: {}, errorLog: {},
                             pdfDownloads: 0, speedWins: 0, socialDone: false, reviewDone: false
                         };
                         renderLogin(); updateHeader();
                     }
                 }
             });
         }
         
         function q(sel){ return document.querySelector(sel); }
         function formatSigneName(sign){ return sign.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }
         function showAlert(message,type){
             const alertDiv = document.createElement('div');
             alertDiv.className = 'alert alert-' + type;
             alertDiv.innerHTML = message; 
             const app = q('#app');
             if(app){ app.insertBefore(alertDiv,app.firstChild); setTimeout(()=>{ if(alertDiv.parentNode) alertDiv.parentNode.removeChild(alertDiv); },3000); }
         }
         
         function triggerConfetti() {
             if(window.confetti) { window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); }
         }
         
         async function saveProgression() {
    checkAchievements();
    
    console.log("🔄 saveProgression() appelée", {
        isGuest: state.isGuest,
        currentUser: state.currentUser ? state.currentUser.uid : null,
        correct: state.progression.correct,
        incorrect: state.progression.incorrect,
        streak: state.progression.streak
    });
    
    if (!state.isGuest && state.currentUser) {
        try {
            console.log("📤 Envoi vers Firebase...");
            const userRef = doc(db, "users", state.currentUser.uid);
            await setDoc(userRef, { 
                progression: state.progression, 
                pseudo: state.pseudo, 
                lastUpdate: new Date() 
            }, { merge: true });
            console.log("✅ Firebase sauvegarde réussie !");
        } catch (e) { 
            console.error("❌ Erreur sauvegarde Firebase:", e); 
            showAlert("Erreur de sauvegarde : " + e.message, "error");
        }
    } else if (state.isGuest) {
        localStorage.setItem('medicome_guest_progression', JSON.stringify(state.progression));
        localStorage.setItem('medicome_guest_pseudo', state.pseudo);
        console.log("💾 LocalStorage sauvegarde OK");
    } else {
        console.warn("⚠️ Aucune sauvegarde effectuée");
    }
                  updateStreakDisplay();
}
         
         function checkAchievements() {
             if(!state.progression.achievements) state.progression.achievements = [];
             const unlock = (id) => {
                 if(!state.progression.achievements.includes(id)) {
                     state.progression.achievements.push(id);
                     showAlert(`<i class="ph-duotone ph-trophy"></i> Succès débloqué !`, 'success');
                     triggerConfetti();
                 }
             };
             
             const p = state.progression;
             const totalPlayed = p.correct + p.incorrect;
             const dailyVal = p.dailyStreak || 0;
         
             if(p.correct >= 1) unlock('baby_doc');
             if(p.correct >= 25) unlock('med_student');
             if(p.correct >= 50) unlock('intern');
             if(p.correct >= 100) unlock('chief');
             if(p.reviewDone) unlock('critic');
             if(p.socialDone) unlock('fan');
             if(p.pdfDownloads >= 1) unlock('bookworm_1');
             if(p.pdfDownloads >= 25) unlock('bookworm_25');
             if(p.pdfDownloads >= 50) unlock('bookworm_50');
             if(p.pdfDownloads >= 100) unlock('bookworm_100');
             
             if(p.speedWins >= 10) unlock('speed_demon'); 
             if(p.speedWins >= 50) unlock('speed_50');
             if(p.speedWins >= 100) unlock('speed_100');
             
             if (totalPlayed >= 100) unlock('cases_100');
             if (totalPlayed >= 1000) unlock('cases_1000');
             if (totalPlayed >= 5000) unlock('cases_5000');
         
             if (dailyVal >= 10) unlock('played_10_days');
             if (dailyVal >= 30) unlock('played_30_days');
             if (dailyVal >= 90) unlock('played_90_days');
         
             if (dailyVal >= 10) unlock('daily_10');
             if (dailyVal >= 50) unlock('daily_50');
             if (dailyVal >= 150) unlock('daily_150');
             
             const unlockedCount = Object.keys(p.mastery || {}).filter(k => p.mastery[k].success > 0).length;
             const masterCount = Object.keys(p.mastery || {}).filter(k => p.mastery[k].success >= 10).length;
             
             if(masterCount >= 5) unlock('master_5');
             if(masterCount >= 30) unlock('master_30');
             if(masterCount >= 100) unlock('master_100');
             
             if(unlockedCount >= PATHOLOGIES.length && PATHOLOGIES.length > 0) unlock('encyclopedia');
             if(masterCount >= PATHOLOGIES.length && PATHOLOGIES.length > 0) unlock('god_mode');
         }
         
         function trackPdf() {
             if(state.isGuest) {
         showAlert("Les fiches PDF ne sont pas disponibles en mode invité.", "error");
         return;
         }
             state.progression.pdfDownloads = (state.progression.pdfDownloads || 0) + 1;
             saveProgression();
         }
         
         function trackSocial() {
             if(!state.progression.socialDone) {
                 state.progression.socialDone = true;
                 saveProgression();
             }
         }
         
         function updateHeader(){
             const pseudoBox = q("#pseudoBox"); const homeBtn = q("#homeBtn"); const logoutBtn = q("#logoutBtn");
             const currentStreak = state.progression.streak || 0;
             const streakDisplay = currentStreak > 0 ? ` <span style="color:#ff9f43; margin-left:8px; display:inline-flex; align-items:center; gap:4px;"><i class="ph-duotone ph-fire"></i> ${currentStreak}</span>` : '';
         
             if(state.pseudo){ 
                 pseudoBox.innerHTML = state.pseudo + (state.isGuest ? " (Local)" : "") + streakDisplay; 
                 pseudoBox.style.display='inline-block'; pseudoBox.onclick=renderProfile;
                 homeBtn.style.display='inline-block'; logoutBtn.style.display='inline-block';
             } else { 
                 pseudoBox.style.display='none'; homeBtn.style.display='none'; logoutBtn.style.display='none';
             }
             homeBtn.onclick=renderHome;
             logoutBtn.onclick = () => {
                 localStorage.removeItem('medicome_guest_progression'); localStorage.removeItem('medicome_guest_pseudo');
                 state.isGuest = false; state.pseudo = null; state.currentUser = null; 
                 state.progression = { correct: 0, incorrect: 0, streak: 0, mastery: {}, dailyStreak: 0, lastDaily: null, achievements: [], bestTimes: {}, errorLog: {}, pdfDownloads: 0, speedWins: 0, socialDone: false, reviewDone: false }; 
                 signOut(auth).then(() => { renderLogin(); updateHeader(); showAlert("Déconnecté", "success"); }).catch(() => { renderLogin(); updateHeader(); });
             };
            checkAdminAccess();
         }

function updateStreakDisplay() {
    const pseudoBox = q("#pseudoBox");
    if (!pseudoBox || !state.pseudo) return;
    
    const currentStreak = state.progression.streak || 0;
    const streakDisplay = currentStreak > 0 
        ? ` <span style="color:#ff9f43; margin-left:8px; display:inline-flex; align-items:center; gap:4px;"><i class="ph-duotone ph-fire"></i> ${currentStreak}</span>` 
        : '';
    
    const guestLabel = state.isGuest ? " (Local)" : "";
    pseudoBox.innerHTML = state.pseudo + guestLabel + streakDisplay;
}
         
         function renderLogin() {
    setDocTitle(null);
    window.scrollTo(0, 0);
    const app = q('#app');
    app.innerHTML = ''; // Nettoyer l'écran

    // Conteneur Principal (Grid)
    const grid = document.createElement('div');
    grid.className = 'landing-grid';

    // --- COLONNE GAUCHE : PRÉSENTATION & INVITÉ ---
    const leftCol = document.createElement('div');
    leftCol.className = 'landing-info';
    leftCol.innerHTML = `
        <h1>Maîtrisez le Diagnostic Médical</h1>
        <p>
            Medicome est le simulateur interactif conçu pour les étudiants en médecine (ECNi, EDN, R2C).
            Confrontez-vous à une IA pédagogique, affinez votre raisonnement clinique et révisez vos pathologies en situation réelle.
        </p>
        
        <div class="feature-list">
             <div class="feature-item">
                <i class="ph-duotone ph-brain feature-icon"></i>
                <span>Pédagogie Inversée : Faites deviner l'IA</span>
            </div>
            <div class="feature-item">
                <i class="ph-duotone ph-check-circle feature-icon"></i>
                <span>+100 Pathologies Officielles (R2C)</span>
            </div>
            <div class="feature-item">
                <i class="ph-duotone ph-images feature-icon"></i>
                <span>Imagerie Médicale & ECG inclus</span>
            </div>
             <div class="feature-item">
                <i class="ph-duotone ph-chart-line-up feature-icon"></i>
                <span>Suivi de progression détaillé</span>
            </div>
        </div>

<div style="display: flex; flex-direction: column; align-items: flex-start; gap: 8px;">
    <button id="heroGuestBtn" class="btn-guest-hero">
        <i class="ph-duotone ph-user-circle"></i>
        Tester sans connexion
    </button>
    <div class="small" style="opacity:0.7; width: 100%; text-align: center; max-width: 280px;">
        Mode invité limité
    </div>
</div>
    `;
    grid.appendChild(leftCol);

    // --- COLONNE DROITE : AUTHENTIFICATION ---
    const rightCol = document.createElement('div');
    rightCol.className = 'landing-auth-card';

    // Système d'onglets (Login vs Register)
    const tabsDiv = document.createElement('div');
    tabsDiv.className = 'auth-tabs';
    const tabLogin = document.createElement('div'); tabLogin.className = 'auth-tab active'; tabLogin.innerText = 'Connexion';
    const tabReg = document.createElement('div'); tabReg.className = 'auth-tab'; tabReg.innerText = 'Inscription';
    
    tabsDiv.appendChild(tabLogin);
    tabsDiv.appendChild(tabReg);
    rightCol.appendChild(tabsDiv);

    // Conteneur du Formulaire
    const formContainer = document.createElement('div');
    rightCol.appendChild(formContainer);

    // Fonction pour afficher le formulaire de CONNEXION
    const showLoginForm = () => {
        formContainer.innerHTML = '';
        tabLogin.classList.add('active'); tabReg.classList.remove('active');

        const inputUser = document.createElement('input'); inputUser.placeholder = 'Email'; inputUser.className = 'input';
        const inputPass = document.createElement('input'); inputPass.placeholder = 'Mot de passe'; inputPass.className = 'input'; inputPass.type = 'password';
        
        const btnLogin = document.createElement('button'); btnLogin.className = 'btn'; btnLogin.textContent = 'Se connecter';
        btnLogin.onclick = async () => {
            try {
                await signInWithEmailAndPassword(auth, inputUser.value, inputPass.value);
                showAlert("Connexion réussie !", "success");
            } catch (error) {
                showAlert("Erreur: " + error.message, "error");
            }
        };

        const btnForgot = document.createElement('div');
        btnForgot.className = 'small link'; btnForgot.style.border = 'none'; btnForgot.textContent = 'Mot de passe oublié ?';
        btnForgot.onclick = async () => {
            if (!inputUser.value) return showAlert("Veuillez entrer votre email d'abord", "error");
            try { await sendPasswordResetEmail(auth, inputUser.value); showAlert("Email envoyé ! Vérifiez vos spams.", "success"); } catch (e) { showAlert(e.message, "error"); }
        };

        formContainer.append(inputUser, inputPass, btnLogin, btnForgot);
    };

    // Fonction pour afficher le formulaire d'INSCRIPTION
    const showRegForm = () => {
        formContainer.innerHTML = '';
        tabReg.classList.add('active'); tabLogin.classList.remove('active');

        const infoFree = document.createElement('div');
        infoFree.className = 'alert alert-success';
        infoFree.style.marginBottom = '15px';
        infoFree.innerHTML = '<i class="ph-bold ph-gift"></i> L\'inscription est 100% Gratuite !';

        const inRegEmail = document.createElement('input'); inRegEmail.placeholder = 'Votre Email'; inRegEmail.className = 'input';
        const inRegPass = document.createElement('input'); inRegPass.placeholder = 'Créer un Mot de passe'; inRegPass.className = 'input'; inRegPass.type = 'password';
        const inPseudo = document.createElement('input'); inPseudo.placeholder = 'Votre Pseudo (ex: Dr. House)'; inPseudo.className = 'input';

        const btnReg = document.createElement('button'); btnReg.className = 'btn'; btnReg.textContent = "S'inscrire gratuitement";
        btnReg.onclick = async () => {
            if (!inRegEmail.value || !inRegPass.value || !inPseudo.value) return showAlert('Veuillez tout remplir', 'error');
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, inRegEmail.value, inRegPass.value);
                const user = userCredential.user; await updateProfile(user, { displayName: inPseudo.value });
                await setDoc(doc(db, "users", user.uid), { pseudo: inPseudo.value, email: inRegEmail.value, progression: { correct: 0, incorrect: 0, streak: 0, mastery: {} }, createdAt: new Date() }, { merge: true });
                state.pseudo = inPseudo.value; showAlert("Compte créé ! Bienvenue.", "success"); updateHeader(); renderHome();
            } catch (error) { showAlert("Erreur création: " + error.message, "error"); }
        };

        formContainer.append(infoFree, inPseudo, inRegEmail, inRegPass, btnReg);
    };

    // Gestion des clics onglets
    tabLogin.onclick = showLoginForm;
    tabReg.onclick = showRegForm;

    // Initialisation par défaut (Connexion)
    showLoginForm();

    // --- ZONE CODE D'ACCÈS (En bas à droite) ---
    const separator = document.createElement('div');
    separator.style.margin = "20px 0"; separator.style.borderTop = "1px solid var(--glass-border)";
    rightCol.appendChild(separator);

    const codeTitle = document.createElement('div');
    codeTitle.className = "small"; codeTitle.style.marginBottom = "5px"; codeTitle.innerHTML = "<i class='ph-duotone ph-key'></i> Code d'accès (École / Fac)";
    rightCol.appendChild(codeTitle);

    const codeGroup = document.createElement('div');
    codeGroup.style.display = "flex"; codeGroup.style.gap = "10px";
    
    const inputCode = document.createElement('input'); inputCode.placeholder = 'Code...'; inputCode.className = 'input'; inputCode.style.margin = "0";
    const btnCode = document.createElement('button'); btnCode.className = 'btn'; btnCode.textContent = 'OK'; btnCode.style.width = "auto"; btnCode.style.margin = "0";
    
    btnCode.onclick = async () => {
        const codeSaisi = inputCode.value.trim();
        if (!codeSaisi) return;

        try {
            // Recherche du code dans ta collection Firebase
            const codeRef = doc(db, "access_codes", codeSaisi);
            const codeSnap = await getDoc(codeRef);

            if (codeSnap.exists() && codeSnap.data().active === true) {
                const data = codeSnap.data();
                
                // Activation du mode "Privilégié"
                state.isGuest = true;
                state.isPremiumCode = true; // Débloque les PDF et le Glossaire
                state.pseudo = data.pseudo;
                
                // Initialisation d'une progression propre pour la session
                state.progression = { 
                    correct: 0, 
                    incorrect: 0, 
                    streak: 0, 
                    mastery: {}, 
                    dailyHistory: {} 
                };
                
                updateHeader();
                renderHome();
                showAlert(`Accès Partenaire : ${data.pseudo}`, 'success');
            } else {
                showAlert('Code invalide ou expiré', 'error');
            }
        } catch (e) {
            console.error(e);
            showAlert("Erreur de connexion à la base de données", "error");
        }
    };

    codeGroup.append(inputCode, btnCode);
    rightCol.appendChild(codeGroup);

    grid.appendChild(rightCol);
    app.appendChild(grid);

    // Attacher l'événement au bouton "Hero Guest" (gauche)
    setTimeout(() => {
        const heroBtn = document.getElementById('heroGuestBtn');
        if(heroBtn) heroBtn.onclick = startGuestMode;
    }, 100);
}
   // ========================================
// FONCTIONS MODE EXAMEN BLANC
// ========================================

function renderExamConfig() {
    setDocTitle("Configuration Examen");
    window.scrollTo(0,0);
    const app = q('#app'); app.innerHTML='';
    const card = document.createElement('div'); card.className='card center';
    
    card.innerHTML = `
        <h2><i class="ph-duotone ph-exam"></i> Examen Blanc</h2>
        <p class="small" style="margin-bottom:25px">Configurez votre épreuve de révision</p>
    `;

    // 1. Nombre de cas (Slider + Chips)
    const nbLabel = document.createElement('div');
    nbLabel.className = 'section-label';
    nbLabel.textContent = 'Nombre de cas';
    card.appendChild(nbLabel);

    const chipsNb = document.createElement('div');
    chipsNb.className = 'chips-container';
    let selectedCount = 10; // Par défaut
    
    [3, 5, 10, 20, 30].forEach(n => {
        const chip = document.createElement('div');
        chip.className = n === 10 ? 'chip selected' : 'chip';
        chip.innerHTML = `<i class="ph-duotone ph-clipboard-text"></i> ${n} cas`;
        chip.onclick = () => {
            selectedCount = n;
            chipsNb.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
        };
        chipsNb.appendChild(chip);
    });
    card.appendChild(chipsNb);

    // 2. Spécialités (Toutes cochées par défaut)
    const specLabel = document.createElement('div');
    specLabel.className = 'section-label';
    specLabel.textContent = 'Spécialités';
    card.appendChild(specLabel);

    const chipsSpec = document.createElement('div');
    chipsSpec.className = 'chips-container';
    
    const uniqueSpecs = [...new Set(Object.values(PATHO_GROUPS))].sort();
    const selectedSpecs = new Set(uniqueSpecs);

    uniqueSpecs.forEach(spec => {
        const chip = document.createElement('div');
        chip.className = 'chip selected';
        chip.innerHTML = `<i class="ph-duotone ph-check-circle"></i> ${spec}`;
        chip.onclick = () => {
            if (selectedSpecs.has(spec)) {
                if(selectedSpecs.size === 1) return showAlert("Gardez au moins une spécialité", "error");
                selectedSpecs.delete(spec);
                chip.classList.remove('selected');
                chip.innerHTML = `<i class="ph-duotone ph-circle"></i> ${spec}`;
            } else {
                selectedSpecs.add(spec);
                chip.classList.add('selected');
                chip.innerHTML = `<i class="ph-duotone ph-check-circle"></i> ${spec}`;
            }
        };
        chipsSpec.appendChild(chip);
    });
    card.appendChild(chipsSpec);

    // 3. Options
    const optLabel = document.createElement('div');
    optLabel.className = 'section-label';
    optLabel.textContent = 'Options';
    card.appendChild(optLabel);

    const chipsOpt = document.createElement('div');
    chipsOpt.className = 'chips-container';
    let withTimer = true;

    const chipTimer = document.createElement('div');
    chipTimer.className = 'chip selected';
    chipTimer.innerHTML = '<i class="ph-duotone ph-timer"></i> Chronomètre';
    chipTimer.onclick = () => {
        withTimer = !withTimer;
        chipTimer.classList.toggle('selected');
    };
    chipsOpt.appendChild(chipTimer);
    card.appendChild(chipsOpt);

    // Boutons
    const btnStart = document.createElement('button'); 
    btnStart.className='btn'; 
    btnStart.innerHTML='<i class="ph-bold ph-play"></i> Démarrer l\'examen';
    btnStart.style.marginTop='30px';
    btnStart.onclick = () => startExamSession({
        count: selectedCount,
        specs: Array.from(selectedSpecs),
        timer: withTimer
    });

    const btnBack = document.createElement('button'); 
    btnBack.className='link'; 
    btnBack.textContent='Annuler';
    btnBack.onclick=renderHome;

    card.append(btnStart, btnBack);
    app.appendChild(card);
}

function startExamSession(config) {
    const pool = PATHOLOGIES.filter(p => {
        const group = PATHO_GROUPS[p.name];
        return config.specs.includes(group);
    });

    if (pool.length < config.count) {
        return showAlert(`Pas assez de pathologies dans ces spécialités (${pool.length} disponibles)`, "error");
    }

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const queue = shuffled.slice(0, config.count);

    state.exam = {
        active: true,
        queue: queue,
        results: [],
        currentIndex: 0,
        totalTime: 0,
        config: config,
        startTime: Date.now()
    };

    playNextExamCase();
}

function playNextExamCase() {
    const exam = state.exam;
    if (exam.currentIndex >= exam.queue.length) {
        renderExamSummary();
        return;
    }

    const targetPatho = exam.queue[exam.currentIndex];
    state.dailyTarget = targetPatho;
    state.isChrono = exam.config.timer;
    
    renderExamCaseIntro(targetPatho, exam.currentIndex + 1, exam.queue.length);
}

function renderExamCaseIntro(patho, current, total) {
    window.scrollTo(0,0);
    const app = q('#app'); app.innerHTML='';
    const card = document.createElement('div'); card.className='card center';
    
    const progress = Math.round((current / total) * 100);
    
    card.innerHTML = `
        <div style="width:100%; background:rgba(125,125,125,0.1); border-radius:10px; height:6px; margin-bottom:20px;">
            <div style="width:${progress}%; background:var(--accent); height:100%; border-radius:10px; transition:0.3s;"></div>
        </div>
        <div class="small" style="color:var(--accent); margin-bottom:10px;">
            <i class="ph-duotone ph-student"></i> EXAMEN BLANC • CAS ${current}/${total}
        </div>
        <h2 style="margin:20px 0;">Faites deviner :</h2>
        <div style="font-size:1.8rem; font-weight:bold; color:var(--text-main); margin:20px 0;">
            ${patho.name}
        </div>
        <div style="background:rgba(0,210,255,0.1); padding:15px; border-radius:12px; border-left:3px solid var(--accent); margin:20px 0;">
            <i class="ph-duotone ph-info"></i> Répondez aux questions en pensant à cette pathologie
        </div>
    `;
    
    const btnGo = document.createElement('button'); 
    btnGo.className='btn btn-success';
    btnGo.innerHTML='<i class="ph-bold ph-play"></i> Commencer le cas';
    btnGo.onclick = () => {
        state.answers = {}; state.asked = []; state.diagnosticShown = false; 
        state.history = []; state.confirmationMode = false;
        renderDemographics();
    };
    
    card.appendChild(btnGo);
    app.appendChild(card);
}

function renderExamSummary() {
    setDocTitle("Résultats Examen");
    state.exam.active = false;
    state.dailyTarget = null;
    
    const totalTime = Math.round((Date.now() - state.exam.startTime) / 1000);
    state.exam.totalTime = totalTime;

    const app = q('#app'); app.innerHTML='';
    const card = document.createElement('div'); card.className='card center';
    
    const correctCount = state.exam.results.filter(r => r.success).length;
    const total = state.exam.results.length;
    const percentage = Math.round((correctCount / total) * 100);
    
    let grade = percentage >= 90 ? "Excellent" : percentage >= 70 ? "Bien" : percentage >= 50 ? "Moyen" : "À revoir";
    let color = percentage >= 70 ? 'var(--success)' : percentage >= 50 ? 'var(--gold)' : 'var(--error)';
    
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    
    card.innerHTML = `
        <h2><i class="ph-duotone ph-check-circle"></i> Examen Terminé</h2>
        <div style="margin:30px 0;">
            <div style="font-size:4rem; font-weight:bold; color:${color};">
                ${percentage}%
            </div>
            <div style="font-size:1.2rem; color:var(--text-muted); margin-top:10px;">
                ${grade}
            </div>
        </div>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; width:100%; margin-bottom:30px;">
            <div class="stat-box">
                <div class="stat-number" style="color:var(--success)">${correctCount}</div>
                <div class="stat-label">Réussites</div>
            </div>
            <div class="stat-box">
                <div class="stat-number" style="color:var(--text-muted)">${minutes}:${seconds.toString().padStart(2,'0')}</div>
                <div class="stat-label">Temps total</div>
            </div>
        </div>
        
        <div class="result-section-title" style="width:100%; text-align:left;">
            <i class="ph-bold ph-list"></i> Détails des cas
        </div>
    `;

    const resultList = document.createElement('div');
    resultList.className = 'result-list';
    
    state.exam.results.forEach((res, idx) => {
        const icon = res.success 
            ? '<i class="ph-fill ph-check-circle" style="color:var(--success); font-size:1.3em;"></i>' 
            : '<i class="ph-fill ph-x-circle" style="color:var(--error); font-size:1.3em;"></i>';
        
        const detail = res.success 
            ? `${res.questions} questions` 
            : `Confondu avec ${res.found}`;
        
        const row = document.createElement('div');
        row.className = 'result-item';
        row.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                ${icon}
                <strong>${res.target}</strong>
            </div>
            <div style="font-size:0.85em; color:var(--text-muted);">${detail}</div>
        `;
        resultList.appendChild(row);
    });
    
    card.appendChild(resultList);

    const btnHome = document.createElement('button'); 
    btnHome.className='btn';
    btnHome.innerHTML='<i class="ph-duotone ph-house"></i> Retour Accueil';
    btnHome.style.marginTop='30px';
    btnHome.onclick=renderHome;
    
    card.appendChild(btnHome);
    app.appendChild(card);
}

// ========================================
// FIN DES FONCTIONS MODE EXAMEN
// ========================================
         
         function renderHome() {
             setDocTitle("Accueil");
             window.scrollTo(0,0);
             const app = q('#app'); app.innerHTML='';
             const prog = state.progression;
             const card = document.createElement('div'); card.className='card center';
             let cloudBadge = state.isGuest ? '<span style="color:orange; font-size:0.8em; margin-bottom:10px"><i class="ph-duotone ph-floppy-disk"></i> Mode Local</span>' : '<span style="color:var(--success); font-size:0.8em; margin-bottom:10px"><i class="ph-duotone ph-cloud-check"></i> Sauvegarde activée</span>';
             const displayName = state.pseudo || '...';
             const btnGuest = document.createElement('button');
         btnGuest.className = 'btn';
         btnGuest.innerHTML = '<i class="ph-duotone ph-user-circle"></i> Tester sans connexion';
         btnGuest.style.marginTop = '10px';
         btnGuest.onclick = startGuestMode; // fonction du patch
         
         card.appendChild(btnGuest);
             const dailyPatho = getDailyPatho();
             const todayStr = new Date().toDateString();
             const isDailyDone = prog.lastDaily === todayStr;
             const dailyClass = isDailyDone ? "daily-title" : "daily-title"; 
             const dailyText = isDailyDone ? `<i class='ph-duotone ph-check-circle color-success'></i> Défi du jour validé !` : `<i class='ph-duotone ph-sun color-gold'></i> Défi du ${new Date().toLocaleDateString()}`;
             const dailyContent = isDailyDone ? "Revenez demain pour un nouveau défi du jour!" : `Faire identifier : <strong>${dailyPatho ? dailyPatho.name : 'Chargement...'}</strong>`;
         
             card.innerHTML = `<h2>Bonjour ${displayName}</h2>${cloudBadge}
                             
                             <div class="daily-card">
                                 <div class="${dailyClass}">${dailyText}</div>
                                 <div style="font-size:0.9em; color:var(--text-main); margin-bottom:5px;">${dailyContent}</div>
                                 ${!isDailyDone ? `<button id="btnDaily" class="btn" style="background:var(--gold); color:#000; font-size:12px; padding:8px 15px; margin-top:5px;">Relever le défi</button>` : ''}
                             </div>
         
                             <div class="stat-box" style="width:100%"><div class="stat-number">${prog.correct + prog.incorrect}</div><div class="stat-label">Cas joués</div></div>
                             <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;margin-top:12px;">
                             <div class="stat-box" style="text-align:center; background:rgba(0, 255, 157, 0.1); border-color:var(--success)"><div class="stat-number" style="color:var(--success);">${prog.correct}</div><div class="stat-label">Succès</div></div>
                             <div class="stat-box" style="text-align:center; background:rgba(255, 77, 77, 0.1); border-color:var(--error)"><div class="stat-number" style="color:var(--error);">${prog.incorrect}</div><div class="stat-label">Échecs</div></div>
                             </div>`;
             
             const howToCard = document.createElement('div');
             howToCard.style.cssText = "background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); padding:15px; border-radius:12px; margin-top:20px; width:100%; text-align:left;";
             howToCard.innerHTML = `
                 <div style="font-weight:bold; color:var(--accent); margin-bottom:8px;"><i class="ph-duotone ph-info"></i> Comment ça marche ?</div>
                 <div style="font-size:0.9em; color:var(--text-muted); line-height:1.4;">
                     1. Réfléchissez à une pathologie et ses signes cliniques associés.<br>
                     2. Faites deviner à l'IA la pathologie à laquelle vous pensez.<br>
                     3. Répondez correctement aux questions de l'IA.<br>
                     4. La pathologie est découverte si les signes cliniques sont corrects!
                 </div>
             `;
             card.appendChild(howToCard);
         
             // ========================================
// LIGNE DE 2 BOUTONS : Questions + IA
// ========================================
const btnDiagRow = document.createElement('div');
btnDiagRow.style.display = 'flex';
btnDiagRow.style.gap = '15px';
btnDiagRow.style.marginTop = '24px';
btnDiagRow.style.width = '100%';

// --- BOUTON 1 : DIAGNOSTIC QUESTIONS ---
const btnQuestions = document.createElement('button');
btnQuestions.className = 'btn';
btnQuestions.style.flex = '1';
btnQuestions.innerHTML = '<i class="ph-duotone ph-stethoscope"></i> Diagnostic Questions';

if (state.isGuest) {
    const limit = checkGuestLimit();
    if (!limit.allowed) {
        btnQuestions.style.background = "linear-gradient(135deg, #555 0%, #333 100%)";
        btnQuestions.style.opacity = "0.7";
        btnQuestions.innerHTML = `<i class="ph-duotone ph-lock-key"></i> Bloqué (${limit.remaining})`;
    }
}

btnQuestions.onclick = () => {
    const limit = checkGuestLimit();
    if (!limit.allowed) {
        showAlert(`Mode invité limité !<br>Prochaine partie dans : <strong>${limit.remaining}</strong>.<br>Créez un compte pour jouer en illimité !`, "error");
        return;
    }
    if(audioCtx.state === 'suspended') audioCtx.resume();
    state.useLLM = false; // MODE QUESTIONS
    state.dailyTarget = null;
    renderDemographics();
};

// --- BOUTON 2 : DIAGNOSTIC IA ---
const btnIA = document.createElement('button');
btnIA.className = 'btn';
btnIA.style.flex = '1';
btnIA.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
btnIA.innerHTML = '<i class="ph-duotone ph-brain"></i> Diagnostic IA';

if (state.isGuest) {
    const limit = checkGuestLimit();
    if (!limit.allowed) {
        btnIA.style.background = "linear-gradient(135deg, #555 0%, #333 100%)";
        btnIA.style.opacity = "0.7";
        btnIA.innerHTML = `<i class="ph-duotone ph-lock-key"></i> Bloqué (${limit.remaining})`;
    }
}

btnIA.onclick = () => {
    const limit = checkGuestLimit();
    if (!limit.allowed) {
        showAlert(`Mode invité limité !<br>Prochaine partie dans : <strong>${limit.remaining}</strong>.<br>Créez un compte pour jouer en illimité !`, "error");
        return;
    }
    if(audioCtx.state === 'suspended') audioCtx.resume();
    
    // --- CHANGEMENT ICI : On active le mode IA et on demande le motif ---
    state.useLLM = true; 
    state.dailyTarget = null;
    
    // Au lieu d'aller direct aux paramètres, on va vers le motif
    renderChiefComplaintInput(); 
};

btnDiagRow.append(btnQuestions, btnIA);
card.appendChild(btnDiagRow);
         
           const btnExam = document.createElement('button'); 
btnExam.className='btn'; 
// Style violet pour le distinguer
btnExam.style.background = 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)'; 
btnExam.style.marginTop='15px'; 
btnExam.innerHTML='<i class="ph-duotone ph-exam"></i> Examen Blanc'; 

btnExam.onclick = () => {
    // On bloque les invités qui n'ont pas de code VIP
    if (state.isGuest && !state.isPremiumCode) {
        showAlert("Mode réservé aux inscrits ou accès partenaire.", "error");
        return;
    }
    renderExamConfig();
};

const btnGloss = document.createElement('button'); btnGloss.className='link'; btnGloss.innerHTML='<i class="ph-duotone ph-book-bookmark"></i> Glossaire'; btnGloss.style.marginTop='12px'; btnGloss.onclick=renderGlossary;
const btnProf = document.createElement('button'); btnProf.className='link'; btnProf.innerHTML='<i class="ph-duotone ph-user-circle"></i> Profil & Succès'; btnProf.style.marginTop='6px'; btnProf.onclick=renderProfile;

card.appendChild(btnExam); card.appendChild(btnGloss); card.appendChild(btnProf);
             app.appendChild(card);
         
             const btnDaily = q('#btnDaily');
             if(btnDaily) {
                 btnDaily.onclick = () => {
                     const limit = checkGuestLimit();
         if (!limit.allowed) {
             showAlert(`Mode invité limité !<br>Prochaine partie dans : <strong>${limit.remaining}</strong>.<br>Créez un compte pour jouer en illimité !`, "error");
             return;
         }
                     if(audioCtx.state === 'suspended') audioCtx.resume();
                     state.dailyTarget = dailyPatho;
                     state.isChrono = false; 
                     renderDemographics();
                 };
             }
         }
         
         async function renderReviews() {
             setDocTitle("Avis Utilisateurs");
             window.scrollTo(0,0);
             const app = q('#app'); app.innerHTML='';
             const card = document.createElement('div'); card.className='card center';
             card.innerHTML = `<h2><i class="ph-duotone ph-star color-gold"></i> Avis Utilisateurs</h2><p class="small" style="margin-bottom:20px">Ce qu'ils pensent de Medicome.</p>`;
         
             const formDiv = document.createElement('div');
             formDiv.style.background = 'rgba(125,125,125,0.1)'; formDiv.style.padding='15px'; formDiv.style.borderRadius='10px'; formDiv.style.width='100%'; formDiv.style.marginBottom='20px';
             
             formDiv.innerHTML = `<h4 style="margin-bottom:10px; color:var(--accent);">Laisser un avis</h4>
             <div class="star-rating">
                 <input type="radio" id="5-stars" name="rating" value="5" /><label for="5-stars"><i class="ph-fill ph-star"></i></label>
                 <input type="radio" id="4-stars" name="rating" value="4" /><label for="4-stars"><i class="ph-fill ph-star"></i></label>
                 <input type="radio" id="3-stars" name="rating" value="3" /><label for="3-stars"><i class="ph-fill ph-star"></i></label>
                 <input type="radio" id="2-stars" name="rating" value="2" /><label for="2-stars"><i class="ph-fill ph-star"></i></label>
                 <input type="radio" id="1-star" name="rating" value="1" /><label for="1-star"><i class="ph-fill ph-star"></i></label>
             </div>
             <textarea id="reviewText" class="input" placeholder="Votre commentaire..." style="min-height:60px;"></textarea>
             <button id="submitReviewBtn" class="btn" style="width:100%; font-size:13px;">Envoyer (Soumis à modération)</button>`;
             
             card.appendChild(formDiv);
         
             const reviewsContainer = document.createElement('div');
             reviewsContainer.className = 'reviews-container';
             
             try {
                 const qRev = query(collection(db, "reviews"), where("approved", "==", true), orderBy("date", "desc"), limit(10));
                 const snap = await getDocs(qRev);
                 snap.forEach(doc => {
                     const r = doc.data();
                     let stars = "";
                     for(let i=0; i<5; i++) {
                         if(i < r.rating) stars += '<i class="ph-fill ph-star"></i>';
                         else stars += '<i class="ph-duotone ph-star"></i>';
                     }
         
                     const div = document.createElement('div');
                     div.className = 'review-card';
                     div.innerHTML = `
                         <div class="review-header">
                             <div><div class="review-name">${r.pseudo}</div><div class="review-stars" style="color:var(--gold)">${stars}</div></div>
                         </div>
                         <div class="review-text">${r.text}</div>
                     `;
                     reviewsContainer.insertBefore(div, reviewsContainer.firstChild);
                 });
             } catch(e) { 
                 console.log("Erreur avis", e); 
             }
         
             card.appendChild(reviewsContainer);
             const btnBack = document.createElement('button'); btnBack.className='btn'; btnBack.textContent='Retour';
             btnBack.style.marginTop = '20px'; btnBack.onclick = () => { if(state.pseudo) renderHome(); else renderLogin(); };
             card.appendChild(btnBack); app.appendChild(card);
         
             setTimeout(() => {
                 const submitBtn = q('#submitReviewBtn');
                 if(submitBtn){
                     submitBtn.onclick = async () => {
                         const text = q('#reviewText').value;
                         const ratingEl = document.querySelector('input[name="rating"]:checked');
                         if(!text || !ratingEl) return showAlert("Note et message requis", "error");
                         try {
                             await addDoc(collection(db, "reviews"), { 
                                 pseudo: state.pseudo || "Anonyme", 
                                 text, 
                                 rating: parseInt(ratingEl.value), 
                                 date: new Date(),
                                 approved: false 
                             });
                             showAlert("Avis envoyé ! Il sera visible après validation.", "success"); 
                             
                             if(!state.progression.reviewDone) {
                                 state.progression.reviewDone = true;
                                 saveProgression();
                             }
         
                             q('#reviewText').value = ''; 
                         } catch(e) { showAlert("Erreur d'envoi", "error"); }
                     };
                 }
             }, 100);
         }
         
         function renderContact() {
             setDocTitle("Nous Contacter");
             window.scrollTo(0,0);
             const app = q('#app'); app.innerHTML='';
             const card = document.createElement('div'); card.className='card center';
             card.innerHTML = `<h2><i class="ph-duotone ph-envelope"></i> Nous Contacter</h2>`;
             const inputName = document.createElement('input'); inputName.className='input'; inputName.placeholder='Votre Nom';
             if(state.pseudo) inputName.value = state.pseudo;
             const inputEmail = document.createElement('input'); inputEmail.className='input'; inputEmail.placeholder='Votre Email';
             if(state.currentUser) inputEmail.value = state.currentUser.email;
             const inputText = document.createElement('textarea'); inputText.className='input'; inputText.placeholder='Votre message...';
             const btnSend = document.createElement('button'); btnSend.className='btn'; btnSend.textContent='Envoyer';
             btnSend.onclick = async () => {
                 if(!inputText.value) return;
                 try {
                     await addDoc(collection(db, "messages"), { name: inputName.value, email: inputEmail.value, message: inputText.value, date: new Date(), uid: state.currentUser ? state.currentUser.uid : 'guest' });
                     showAlert("Envoyé !", "success"); setTimeout(() => { if(state.pseudo) renderHome(); else renderLogin(); }, 1500);
                 } catch(e) { showAlert("Erreur", "error"); }
             };
             const btnCancel = document.createElement('button'); btnCancel.className='link'; btnCancel.textContent='Annuler';
             btnCancel.onclick = () => { if(state.pseudo) renderHome(); else renderLogin(); };
             card.append(inputName, inputEmail, inputText, btnSend, btnCancel); app.appendChild(card);
         }
         
         function renderAbandonMenu() {
    showManualPathologySelection("abandon");
}

          function renderCalendar(targetMonth = new Date()) {
    setDocTitle("Calendrier Intelligent");
    window.scrollTo(0,0);
    const app = q('#app'); app.innerHTML='';
    const card = document.createElement('div'); card.className='card center';
    
    // Titre
    card.innerHTML = `<h2><i class="ph-duotone ph-calendar-check color-accent"></i> Suivi & Mémoire</h2>`;

    // --- 1. NAVIGATION MOIS (inchangé) ---
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const currentMonth = targetMonth.getMonth();
    const currentYear = targetMonth.getFullYear();

    const navDiv = document.createElement('div'); navDiv.className = 'calendar-header';
    
    const btnPrev = document.createElement('button'); btnPrev.className = 'btn-back'; 
    btnPrev.innerHTML = '<i class="ph-bold ph-caret-left"></i>';
    btnPrev.onclick = () => renderCalendar(new Date(currentYear, currentMonth - 1, 1));

    const titleMonth = document.createElement('div'); 
    titleMonth.style.fontWeight = 'bold'; titleMonth.style.fontSize = '1.1em';
    titleMonth.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const btnNext = document.createElement('button'); btnNext.className = 'btn-back'; 
    btnNext.innerHTML = '<i class="ph-bold ph-caret-right"></i>';
    btnNext.onclick = () => renderCalendar(new Date(currentYear, currentMonth + 1, 1));

    navDiv.append(btnPrev, titleMonth, btnNext);
    card.appendChild(navDiv);

    // --- 2. GRILLE DU CALENDRIER (inchangé) ---
    const grid = document.createElement('div'); grid.className = 'calendar-grid';
    const daysShort = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    daysShort.forEach(d => {
        const el = document.createElement('div'); el.className = 'cal-day-name'; el.textContent = d;
        grid.appendChild(el);
    });

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startDay = firstDay.getDay() - 1; 
    if(startDay === -1) startDay = 6; 

    for(let i=0; i<startDay; i++) {
        const empty = document.createElement('div'); empty.className = 'cal-day empty';
        grid.appendChild(empty);
    }

    const history = state.progression.dailyHistory || {};
    const todayStr = new Date().toISOString().split('T')[0];

    for(let d=1; d<=daysInMonth; d++) {
        const dateObj = new Date(currentYear, currentMonth, d);
        const localDateStr = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        
        const dayCell = document.createElement('div'); 
        dayCell.className = 'cal-day';
        dayCell.textContent = d;

        if(localDateStr === todayStr) dayCell.classList.add('today');

        const dayData = history[localDateStr];
        if(dayData) {
            const dots = document.createElement('div'); dots.className = 'dots-container';
            const sCount = dayData.success ? dayData.success.length : 0;
            const fCount = dayData.fail ? dayData.fail.length : 0;
            
            for(let i=0; i<Math.min(sCount, 3); i++) {
                const dot = document.createElement('div'); dot.className = 'dot dot-success'; dots.appendChild(dot);
            }
            if(fCount > 0) {
                 const dot = document.createElement('div'); dot.className = 'dot dot-error'; dots.appendChild(dot);
            }
            dayCell.appendChild(dots);
            dayCell.onclick = () => showDayDetails(localDateStr, dayData);
        }
        grid.appendChild(dayCell);
    }
    card.appendChild(grid);

    // --- 3. SECTION "À REVOIR" (MODIFIÉE avec système de révision) ---
const memorySection = document.createElement('div'); 
memorySection.style.marginTop = "25px";
memorySection.style.borderTop = "1px solid var(--glass-border)";
memorySection.style.paddingTop = "15px";

memorySection.innerHTML = `<h4 style="color:var(--text-muted); margin-bottom:15px; display:flex; align-items:center; gap:8px;">
    <i class="ph-duotone ph-clock-counter-clockwise"></i> À revoir (Ancienneté)
</h4>`;

// Calcul des dates
const lastSeen = {};
Object.entries(history).forEach(([date, data]) => {
    if(data.success) {
        data.success.forEach(item => {
            const pName = (typeof item === 'string') ? item : item.name;
            if(!lastSeen[pName] || date > lastSeen[pName]) {
                lastSeen[pName] = date;
            }
        });
    }
});

// Buckets exclusifs
const buckets = {
    '30': [], // > 30j
    '15': [], // 15-30j
    '10': [], // 10-14j
    '7': []   // 7-9j
};

const now = new Date();
Object.entries(lastSeen).forEach(([name, dateStr]) => {
    const date = new Date(dateStr);
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if(diffDays > 30) buckets['30'].push({name, days: diffDays});
    else if(diffDays > 15) buckets['15'].push({name, days: diffDays});
    else if(diffDays > 10) buckets['10'].push({name, days: diffDays});
    else if(diffDays >= 7) buckets['7'].push({name, days: diffDays});
});

// Création des contrôles (Boutons)
const filterContainer = document.createElement('div');
filterContainer.style.display = "flex";
filterContainer.style.gap = "8px";
filterContainer.style.marginBottom = "15px";
filterContainer.style.overflowX = "auto";
filterContainer.style.paddingBottom = "5px";

const tabs = [
    { id: '30', label: '> 30 jours', color: 'var(--ruby)' },
    { id: '15', label: '> 15 jours', color: 'orange' },
    { id: '10', label: '> 10 jours', color: 'var(--gold)' },
    { id: '7',  label: '> 7 jours',  color: 'var(--text-muted)' }
];

// Créer les boutons
tabs.forEach((tab, index) => {
    const count = buckets[tab.id].length;
    const btn = document.createElement('button');
    btn.className = `filter-btn ${index === 0 ? 'active' : ''}`;
    btn.innerHTML = `${tab.label} (${count})`;
    if(count > 0) btn.style.fontWeight = "bold";
    if(tab.id === '30' && count > 0) btn.style.color = 'var(--ruby)';
    
    btn.onclick = () => {
        card.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        card.querySelectorAll('.filter-content').forEach(c => c.classList.remove('active'));
        const content = document.getElementById(`content-${tab.id}`);
        if(content) content.classList.add('active');
    };
    filterContainer.appendChild(btn);
});
memorySection.appendChild(filterContainer);

// --- 🆕 FONCTION POUR MARQUER COMME RÉVISÉ ---
window.markAsRevised = async (pathoName, bucketId) => {
    // 1. Supprimer de l'historique des échecs
    if(state.progression.dailyHistory) {
        Object.keys(state.progression.dailyHistory).forEach(dateKey => {
            const dayData = state.progression.dailyHistory[dateKey];
            if(dayData.fail) {
                dayData.fail = dayData.fail.filter(item => {
                    const itemName = (typeof item === 'string') ? item : item.name;
                    return itemName !== pathoName;
                });
            }
        });
    }
    
    // 2. Réduire le compteur d'échecs dans mastery
    if(state.progression.mastery && state.progression.mastery[pathoName]) {
        const m = state.progression.mastery[pathoName];
        if(m.failures > 0) m.failures--;
    }
    
    // 3. Supprimer du errorLog
    if(state.progression.errorLog && state.progression.errorLog[pathoName]) {
        delete state.progression.errorLog[pathoName];
    }
    
    // 4. Sauvegarder
    await saveProgression();
    
    // 5. Retirer visuellement l'élément
    const itemElement = document.getElementById(`revision-item-${bucketId}-${pathoName.replace(/\s+/g, '-')}`);
    if(itemElement) {
        itemElement.style.transition = "all 0.3s ease";
        itemElement.style.opacity = "0";
        itemElement.style.transform = "translateX(-20px)";
        setTimeout(() => {
            itemElement.remove();
            // Mettre à jour le compteur du bouton
            const count = document.querySelectorAll(`#content-${bucketId} .memory-item`).length;
            const btnLabel = tabs.find(t => t.id === bucketId)?.label;
            const btn = Array.from(filterContainer.children).find(b => b.textContent.includes(btnLabel));
            if(btn) btn.innerHTML = `${btnLabel} (${count})`;
        }, 300);
    }
    
    showAlert(`<i class="ph-duotone ph-check-circle"></i> ${pathoName} marquée comme révisée !`, 'success');
};

// Créer les listes (Contenu) avec checkboxes
tabs.forEach((tab, index) => {
    const listDiv = document.createElement('div');
    listDiv.id = `content-${tab.id}`;
    listDiv.className = `filter-content ${index === 0 ? 'active' : ''}`;
    
    const items = buckets[tab.id];
    if(items.length === 0) {
        listDiv.innerHTML = `<div class="small" style="padding:10px; font-style:italic;">Aucune pathologie dans cette tranche.</div>`;
    } else {
        items.sort((a,b) => b.days - a.days).forEach(item => {
            const row = document.createElement('div');
            row.className = 'memory-item';
            row.id = `revision-item-${tab.id}-${item.name.replace(/\s+/g, '-')}`;
            
            const badgeStyle = tab.id === '30' ? 'background:rgba(255,77,77,0.2); color:var(--error);' : 'background:rgba(255,255,255,0.1);';
            
            row.innerHTML = `
                <label style="display:flex; align-items:center; gap:10px; cursor:pointer; flex:1;">
                    <input type="checkbox" class="revision-checkbox" data-patho="${item.name}" data-bucket="${tab.id}" style="cursor:pointer; width:18px; height:18px;">
                    <span style="flex:1;">${item.name}</span>
                    <span class="tag-time" style="${badgeStyle}">Il y a ${item.days}j</span>
                </label>
            `;
            
            // Événement de coche
            const checkbox = row.querySelector('.revision-checkbox');
            checkbox.addEventListener('change', async (e) => {
                if(e.target.checked) {
                    await window.markAsRevised(item.name, tab.id);
                }
            });
            
            listDiv.appendChild(row);
        });
    }
    memorySection.appendChild(listDiv);
});

card.appendChild(memorySection);

    // Bouton retour
    const btnHome = document.createElement('button'); btnHome.className='btn'; btnHome.textContent='Retour';
    btnHome.style.marginTop='20px'; btnHome.onclick=renderProfile; 
    card.appendChild(btnHome);

    app.appendChild(card);
}

// --- MODALE DE DÉTAILS DU JOUR ---
function showDayDetails(dateStr, data) {
    // Formater la date en Français
    const dateObj = new Date(dateStr);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const niceDate = dateObj.toLocaleDateString('fr-FR', options);

    let content = `<h3 style="color:var(--accent); margin-bottom:15px; text-transform:capitalize;">${niceDate}</h3>`;
    
    // Fonction utilitaire pour grouper et compter
    const getGroupedList = (arr) => {
        if (!arr || arr.length === 0) return [];
        const counts = {};
        arr.forEach(item => {
            const name = (typeof item === 'string') ? item : item.name;
            counts[name] = (counts[name] || 0) + 1;
        });
        // Convertir en tableau [nom, count] trié par nombre décroissant
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    };

    // --- Succès ---
    const successGroups = getGroupedList(data.success);
    if(successGroups.length > 0) {
        const total = data.success.length;
        content += `<h4 style="color:var(--success); margin-top:10px; border-bottom:1px solid rgba(0,255,157,0.2); padding-bottom:5px;">
            <i class="ph-bold ph-check"></i> Réussites (${total})
        </h4>
        <ul style="text-align:left; font-size:14px; margin-bottom:15px; color:var(--text-main); list-style:none; padding-left:5px;">`;
        
        successGroups.forEach(([name, count]) => {
            const countBadge = count > 1 ? `<span style="background:rgba(0,255,157,0.2); color:var(--success); padding:2px 8px; border-radius:10px; font-size:11px; margin-left:8px; font-weight:bold;">x${count}</span>` : '';
            content += `<li style="padding:4px 0; border-bottom:1px dashed rgba(255,255,255,0.05);">${name} ${countBadge}</li>`;
        });
        content += `</ul>`;
    }

    // --- Echecs ---
    const failGroups = getGroupedList(data.fail);
    if(failGroups.length > 0) {
        const total = data.fail.length;
        content += `<h4 style="color:var(--error); margin-top:10px; border-bottom:1px solid rgba(255,77,77,0.2); padding-bottom:5px;">
            <i class="ph-bold ph-x"></i> Erreurs (${total})
        </h4>
        <ul style="text-align:left; font-size:14px; margin-bottom:15px; color:var(--text-main); list-style:none; padding-left:5px;">`;
        
        failGroups.forEach(([name, count]) => {
            const countBadge = count > 1 ? `<span style="background:rgba(255,77,77,0.2); color:var(--error); padding:2px 8px; border-radius:10px; font-size:11px; margin-left:8px; font-weight:bold;">x${count}</span>` : '';
            content += `<li style="padding:4px 0; border-bottom:1px dashed rgba(255,255,255,0.05);">${name} ${countBadge}</li>`;
        });
        content += `</ul>`;
    }

    // Efficacité du jour
    const total = (data.success?.length || 0) + (data.fail?.length || 0);
    const ratio = total > 0 ? Math.round(((data.success?.length || 0) / total) * 100) : 0;
    
    content += `<div style="margin-top:20px; padding:12px; background:rgba(255,255,255,0.05); border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
        <span>Efficacité du jour</span>
        <strong style="color:${ratio >= 50 ? 'var(--success)' : 'var(--error)'}; font-size:1.2em;">${ratio}%</strong>
    </div>`;

    content += `<button class="btn" style="margin-top:20px;" onclick="closeLightbox()">Fermer</button>`;

    const lb = document.getElementById('lightbox');
    lb.innerHTML = `<div class="card center" style="max-width:400px; max-height:85vh; overflow-y:auto;" onclick="event.stopPropagation()">${content}</div>`;
    lb.style.display = "flex";
}
          
         function renderProfile() {
   if (state.isGuest) {
      showAlert("L'accès au profil est réservé aux utilisateurs connectés.", "error");
      return;
   }
   setDocTitle("Profil");
   window.scrollTo(0, 0);
   const app = q('#app');
   app.innerHTML = '';
   const prog = state.progression;
   const card = document.createElement('div');
   card.className = 'card center';
   card.style.maxWidth = '800px';

   let contentHTML = `<h2>Profil de ${state.pseudo}</h2>`;

   const groupScores = {};
   let maxScore = 0;
   let bestGroup = null;
   Object.keys(prog.mastery || {}).forEach(pName => {
      const data = prog.mastery[pName];
      const count = (typeof data === 'number') ? data : (data.success || 0);
      if (count > 0) {
         const group = PATHO_GROUPS[pName] || "Autre";
         if (!groupScores[group]) groupScores[group] = 0;
         groupScores[group] += count;
         if (groupScores[group] > maxScore) {
            maxScore = groupScores[group];
            bestGroup = group;
         }
      }
   });

   if (bestGroup && maxScore >= 3) {
      contentHTML += `<div class="specialty-badge"><i class="ph-duotone ph-medal"></i> Spécialiste ${bestGroup}</div>`;
   }

   const totalPathos = PATHOLOGIES.length;
   const unlockedPathos = Object.keys(prog.mastery || {}).filter(k => {
      const d = prog.mastery[k];
      const s = (typeof d === 'number') ? d : d.success;
      return s > 0;
   }).length;
   const percentage = totalPathos > 0 ? Math.round((unlockedPathos / totalPathos) * 100) : 0;

   contentHTML += `
         <div style="width:100%; background:rgba(125,125,125,0.1); border-radius:10px; height:10px; margin-bottom:5px; overflow:hidden;">
             <div style="width:${percentage}%; background:var(--accent); height:100%;"></div>
         </div>
         <div class="small" style="margin-bottom:30px;">Progression globale : ${percentage}% (${unlockedPathos}/${totalPathos})</div>
      `;

   card.innerHTML = contentHTML;

      // Boutons Navigation
      const btnAch = document.createElement('button'); 
      btnAch.className='btn'; 
      btnAch.style.background = 'var(--gold)'; 
      btnAch.style.color = 'black'; 
      btnAch.style.marginBottom = '20px';
      btnAch.innerHTML = '<i class="ph-duotone ph-trophy"></i> Voir mes Succès';
      btnAch.onclick = renderAchievementsPage;

      const btnCal = document.createElement('button'); 
      btnCal.className='btn'; 
      btnCal.style.background = 'var(--accent)'; 
      btnCal.style.marginBottom = '10px';
      btnCal.innerHTML = '<i class="ph-duotone ph-calendar-check"></i> Calendrier Intelligent';
      btnCal.onclick = () => renderCalendar();

      card.appendChild(btnCal);
      card.appendChild(btnAch);

   // --- SECTION SUPPRIMÉE ICI (Boite a erreur & Points Faibles) ---
   // Le code a été retiré comme demandé pour alléger le profil.
   
   const masteryTitle = document.createElement('h3');
   masteryTitle.innerHTML = 'Maitrise Clinique';
   masteryTitle.style.marginTop = "30px";
   card.appendChild(masteryTitle);

   const masteryGrid = document.createElement('div');
   masteryGrid.className = 'mastery-grid';
   const sortedPathos = [...PATHOLOGIES].sort((a, b) => a.name.localeCompare(b.name));
   const masteryData = prog.mastery || {};

   sortedPathos.forEach(p => {
      const m = masteryData[p.name];
      const successCount = (typeof m === 'number') ? m : (m?.success || 0);
      const mItem = document.createElement('div');

      let sClass = 'm-locked',
          icon = '<i class="ph-duotone ph-lock-key"></i>';
      if (successCount >= 10) {
         sClass = 'm-master';
         icon = '<i class="ph-duotone ph-diamond color-ruby"></i>';
      } else if (successCount >= 5) {
         sClass = 'm-gold';
         icon = '<i class="ph-duotone ph-trophy color-gold"></i>';
      } else if (successCount >= 3) {
         sClass = 'm-silver';
         icon = '<i class="ph-duotone ph-medal color-silver"></i>';
      } else if (successCount >= 1) {
         sClass = 'm-bronze';
         icon = '<i class="ph-duotone ph-medal color-bronze"></i>';
      }

      mItem.className = `mastery-item ${sClass}`;
      mItem.innerHTML = `<div class="mastery-icon">${icon}</div><div class="mastery-name">${p.name}</div><div class="mastery-count">${successCount} réussite(s)</div>`;
      mItem.onclick = () => renderPathoStats(p);
      masteryGrid.appendChild(mItem);
   });
   card.appendChild(masteryGrid);

   const btnBack = document.createElement('button');
   btnBack.className = 'btn';
   btnBack.textContent = 'Retour';
   btnBack.style.marginTop = '20px';
   btnBack.onclick = renderHome;
   card.appendChild(btnBack);
   app.appendChild(card);
}
         
         function renderAchievementsPage() {
             setDocTitle("Succès");
             window.scrollTo(0,0);
             const app = q('#app'); app.innerHTML = '';
             const card = document.createElement('div'); card.className='card center'; card.style.maxWidth = '800px';
             card.innerHTML = `<h2 style="color:var(--gold)"><i class="ph-duotone ph-trophy"></i> Mes Succès</h2>`;
             
             const prog = state.progression;
             
             const grid = document.createElement('div');
             grid.className = 'achievements-grid';
         
             ACHIEVEMENTS.forEach(ach => {
                 const unlocked = (prog.achievements || []).includes(ach.id);
                 const row = document.createElement('div');
                 row.className = `achievement-row ${unlocked ? 'unlocked' : ''}`;
                 
                 const iconHtml = unlocked 
                     ? `<i class="${ach.iconClass} icon-md"></i>` 
                     : `<i class="ph-duotone ph-lock-key icon-md"></i>`;
         
                 row.innerHTML = `
                     <div class="ach-icon">${iconHtml}</div>
                     <div class="ach-info">
                         <div class="ach-title" style="color:${unlocked ? 'var(--text-main)' : 'var(--text-muted)'}">${ach.title}</div>
                         <div class="ach-desc">${ach.desc}</div>
                     </div>
                 `;
                 grid.appendChild(row);
             });
             
             card.appendChild(grid);
         
             const btnBack = document.createElement('button'); btnBack.className='btn'; btnBack.textContent='Retour au Profil';
             btnBack.style.marginTop = '20px';
             btnBack.onclick = renderProfile; 
             card.appendChild(btnBack);
             app.appendChild(card);
         }
         
         function renderLegalPage() {
             setDocTitle("Mentions Légales");
             window.scrollTo(0,0);
             const app = q('#app'); app.innerHTML = '';
             const card = document.createElement('div'); card.className='card center';
             
             const creditsHtml = `
                 <h3 style="margin-top:20px; border-top:1px solid var(--glass-border); padding-top:15px;">4. Crédits Images</h3>
                 <p style="font-size:0.9em; color:var(--text-muted); margin-bottom:10px;">
                     Les images médicales sont issues de banques d'images libres (Wikimedia Commons, Open-i, Wellcome Collection) sous licence Creative Commons (CC-BY, SA, ou Domaine Public). Le design du logo Medicome a été réalisé par Hector Bastogy.
                 </p>
                 
                 <div style="text-align:left; font-size:0.8em; max-height:300px; overflow-y:auto; background:rgba(0,0,0,0.2); padding:15px; border-radius:8px; line-height:1.4;">
                     
                     <strong style="color:var(--accent); display:block; margin-top:10px;"> Cardio & Vasculaire</strong>
                     <div>• <strong>st_elevation_ecg.png</strong> : Wikimedia Commons / Own work</div>
                     <div>• <strong>dvt_leg_swelling.png</strong> : Wikimedia Commons / James Heilman, MD</div>
                     <div>• <strong>hemoptysis_tissue.png</strong> : Wikimedia Commons / Dezidor</div>
                     <div>• <strong>cyanosis_lips.png</strong> : Wikimedia Commons / Thomas Godart</div>
                     <div>• <strong>livedo_reticularis.png</strong> : Wikimedia Commons / Uva L</div>
                     <div>• <strong>pale_leg_ischemia.png</strong> : Open-i / Park CB et al. (2014)</div>
         
                     <strong style="color:var(--accent); display:block; margin-top:10px;"> Dermatologie : Rougeurs & Éruptions</strong>
                     <div>• <strong>erysipelas_leg.png</strong> : Wikimedia Commons / Grook Da Oger</div>
                     <div>• <strong>urticaria_hives.png</strong> : Wikimedia Commons / Verysmallkisses</div>
                     <div>• <strong>psoriasis_plaque.png</strong> : Wikimedia Commons / MediaJet</div>
                     <div>• <strong>eczema_flexural.png</strong> : Wikimedia Commons / Gzzz</div>
                     <div>• <strong>anaphylaxis_rash.png</strong> : Wikimedia Commons / מ.י.ש.הו 0</div>
                     <div>• <strong>erythema_migrans.png</strong> : Wikimedia Commons / BruceBlaus</div>
                     <div>• <strong>lupus_butterfly_rash.png</strong> : Wikimedia Commons / Doktorinternet</div>
                     <div>• <strong>cushing_striae.png</strong> : Wikimedia Commons / PanaromicTiger</div>
                     <div>• <strong>addison_hyperpigmentation.png</strong> : Wellcome Collection</div>
                     <div>• <strong>peau_d_orange_breast.png</strong> : Open-i / Nouh MA et al. (2011)</div>
                     <div>• <strong>shingles_zoster.png</strong> : Wikimedia Commons / N.M. Matheson</div>
                     <div>• <strong>chickenpox_rash.png</strong> : Open-i / Singh R, Xess I (2010)</div>
                     <div>• <strong>rubella_rash.png</strong> : Wikimedia Commons / CDC</div>
         
                     <strong style="color:var(--accent); display:block; margin-top:10px;"> Dermatologie : Lésions & Tumeurs</strong>
                     <div>• <strong>severe_acne_face.png</strong> : Wikimedia Commons / Sedef94</div>
                     <div>• <strong>pcos_acne.png</strong> : Wikimedia Commons / Medical Photographic Library</div>
                     <div>• <strong>impetigo_crusts.png</strong> : Open-i / Lakshmi C. et al</div>
                     <div>• <strong>scabies_burrow.png</strong> : Open-i / Sugathan P. et al (2010)</div>
                     <div>• <strong>syphilis_chancre.png</strong> : Open-i / Burnett A (2014)</div>
                     <div>• <strong>melanoma.png</strong> : Wikimedia Commons / J.C.T. Braga et al.</div>
                     <div>• <strong>basal_cell_carcinoma.png</strong> : Open-i / Cureus</div>
                     <div>• <strong>hirsutism_face.png</strong> : Wikimedia Commons / Gacaferri Lumezi B et al.</div>
                     <div>• <strong>cervical_lymphadenopathy.png</strong> : Wikimedia Commons / Hudson Bernard</div>
         
                     <strong style="color:var(--accent); display:block; margin-top:10px;"> Dermatologie : Sang </strong>
                     <div>• <strong>purpura_skin.png</strong> : Wikimedia Commons / Hektor</div>
                     <div>• <strong>janeway_lesions.png</strong> : Wikimedia Commons / Warfieldian</div>
                     <div>• <strong>henoch_schonlein_purpura.png</strong> : Wikimedia Commons / Diasbuenasio</div>
                     <div>• <strong>ecchymoses_petechiae.png</strong> : Wikimedia Commons / James Heilman, MD</div>
         
                     <strong style="color:var(--accent); display:block; margin-top:10px;"> Visage & Cou</strong>
                     <div>• <strong>facial_droop.png</strong> : Wikimedia Commons / Another-anon-artist-234</div>
                     <div>• <strong>myxedema_face.png</strong> : Scientific Animations (Wiki)</div>
                     <div>• <strong>moon_face_cushing.png</strong> : Wikimedia Commons / Ozlem Celik et al.</div>
                     <div>• <strong>acromegaly_face.png</strong> : Wikimedia Commons / Philippe Chanson</div>
                     <div>• <strong>nuchal_rigidity_exam.png</strong> : Wikimedia Commons / L.A. Marty, M.D</div>
                     <div>• <strong>mumps_parotitis.png</strong> : Wikimedia Commons / Fischer, Louis (1914)</div>
         
                     <strong style="color:var(--accent); display:block; margin-top:10px;"> Yeux (Ophtalmo)</strong>
                     <div>• <strong>conjunctivitis_red_eye.png</strong> : Wikimedia Commons / Tanalai</div>
                     <div>• <strong>scleral_icterus.png</strong> : Wikimedia Commons / Unknown author</div>
                     <div>• <strong>exophthalmos.png</strong> : Wikimedia Commons / CDC / Dr. Sellers</div>
                     <div>• <strong>fixed_dilated_pupil.png</strong> : Wikimedia Commons / Jonathan Trobe, M.D.</div>
                     <div>• <strong>stye_hordeolum.png</strong> : Wikimedia Commons / Andre Riemann</div>
                     <div>• <strong>ptosis_eye.png</strong> : Wikimedia Commons / Mohankumar Kurukumbi</div>
                     <div>• <strong>amsler_grid_distortion.png</strong> : Wikimedia Commons / Isislunsky</div>
         
                     <strong style="color:var(--accent); display:block; margin-top:10px;"> Bouche & Gorge (ORL)</strong>
                     <div>• <strong>coated_tongue.png</strong> : Wikimedia Commons / Grook da oger</div>
                     <div>• <strong>strawberry_tongue.png</strong> : Wikimedia Commons / Martin Kronawitter</div>
                     <div>• <strong>atrophic_glossitis.png</strong> : Wikimedia Commons / Jihoon Kim et al.</div>
                     <div>• <strong>oral_thrush.png</strong> : Wikimedia Commons / Sol Silverman, Jr., D.D.S.</div>
                     <div>• <strong>tonsillar_exudate.png</strong> : Wikimedia Commons / Nick Berman</div>
                     <div>• <strong>mono_tonsils.png</strong> : Wikimedia Commons / Fateagued</div>
                     <div>• <strong>koplik_spots.png</strong> : Wikimedia Commons / Dctrzl</div>
         
                     <strong style="color:var(--accent); display:block; margin-top:10px;"> Os & Articulations (Rhumato/Ortho)</strong>
                     <div>• <strong>colles_fracture_fork.png</strong> : Wikimedia Commons / Sylvain Letuffe</div>
                     <div>• <strong>hip_fracture_rotation.png</strong> : Wikimedia Commons / DocP</div>
                     <div>• <strong>leg_shortening.png</strong> : Wikimedia Commons / Fischer, Louis</div>
                     <div>• <strong>septic_arthritis_knee.png</strong> : Wikimedia Commons / CDC (NIH)</div>
                     <div>• <strong>gout_toe_podagra.png</strong> : Wikimedia Commons / Gonzosft</div>
                     <div>• <strong>dactylitis_toe.png</strong> : Wikimedia Commons / Graham, Edwin Eldon</div>
                     <div>• <strong>rheumatoid_hands.png</strong> : Wikimedia Commons / Dr. G. Narasimhamurthy</div>
                     <div>• <strong>hemarthrosis_knee.png</strong> : Wikimedia Commons / James Heilman, MD</div>
                     <div>• <strong>kyphosis_dowagers_hump.png</strong> : Wikimedia Commons / BruceBlaus</div>
                     <div>• <strong>ankle_sprain_swelling.png</strong> : Wikimedia Commons / James Heilman, MD</div>
         
                     <strong style="color:var(--accent); display:block; margin-top:10px;"> Abdomen & Uro-Gyn</strong>
                     <div>• <strong>abdominal_distension.png</strong> : Wikimedia Commons / James Heilman, MD</div>
                     <div>• <strong>ascites_abdomen.png</strong> : Wikimedia Commons / Thomas Godart</div>
                     <div>• <strong>inguinal_hernia.png</strong> : Wikimedia Commons / IkeTheSloth</div>
                     <div>• <strong>bladder_distension.png</strong> : Wikimedia Commons / Treves & Hutchinson</div>
                     <div>• <strong>testicular_torsion_swelling.png</strong> : Wikimedia Commons / Javier.montero.arredondo</div>
                     <div>• <strong>anal_fistula.png</strong> : Open-i / Liaqat N. et al (2016)</div>
         
                     <strong style="color:var(--accent); display:block; margin-top:10px;"> Liquides Biologiques</strong>
                     <div>• <strong>hematuria_urine.png</strong> : Wikimedia Commons / Own Work</div>
                     <div>• <strong>gross_hematuria.png</strong> : Wikimedia Commons / James Heilman, MD</div>
                     <div>• <strong>melena_stool.png</strong> : Wikimedia Commons / Ahmed Shawky Mohammedin</div>
                     <div>• <strong>bloody_stool.png</strong> : Wikimedia Commons / Togabi</div>
                     <div>• <strong>pitting_edema.png</strong> : Wikimedia Commons / James Heilman, MD</div>
                     <div>• <strong>currant_jelly_stool.png</strong> : EMNote / jackcfchong</div>
         
                     <strong style="color:var(--accent); display:block; margin-top:10px;"> Imagerie & ECG</strong>
                     <div>• <strong>pneumonia_xray.png</strong> : Wikimedia Commons / Unknown user</div>
                     <div>• <strong>pneumothorax_xray.png</strong> : Open-i / Omar HR et al. (2011)</div>
                     <div>• <strong>afib_ecg.png</strong> : CardioNetworks / Drj</div>
                     <div>• <strong>pericarditis_ecg.png</strong> : Wikimedia Commons / James Heilman, MD</div>
                     <div>• <strong>bowel_obstruction_xray.png</strong> : Wikimedia Commons / James Heilman, MD</div>
                     <div>• <strong>subdural_hematoma_ct.png</strong> : Wikimedia Commons / Lucien Monfils</div>
                     <div>• <strong>epidural_hematoma_ct.png</strong> : Wikimedia Commons / James Heilman, MD</div>
                     <div>• <strong>hip_fracture_xray.png</strong> : Wikimedia Commons / Drvaram</div>
                     <div>• <strong>wrist_fracture_xray.png</strong> : Wikimedia Commons / Lucien Monfils</div>
                     <div>• <strong>vertebral_compression_xray.png</strong> : Wikimedia Commons / Dirk69CS</div>
                     <div>• <strong>osteoarthritis_xray.png</strong> : Wikimedia Commons / Jmarchn</div>
                     <div>• <strong>gout_erosion_xray.png</strong> : Open-i / Perez-Ruiz F et al. (2009)</div>
                     <div>• <strong>herniated_disc_mri.png</strong> : Wikimedia Commons / Miguel Tremblay</div>
                 </div>
             `;
         
             card.innerHTML = `
                 <h2 style="color:var(--text-main); margin-bottom:15px;">Mentions Légales</h2>
                 <div style="text-align:left; line-height:1.6;">
                     <h3>1. Éditeur du site</h3>
                     <p>Le site Medicome.fr est édité à titre personnel. <br>Contact : via le formulaire de contact du site.</p>
                     <br>
                     <h3>2. Hébergement</h3>
                     <p>Hébergé par GitHub Pages (USA). Données stockées sur Google Firebase (Irlande).</p>
                     <br>
                     <h3>3. Données Personnelles</h3>
                     <p>Email uniquement pour authentification et traitement de données dans un objectif de recherche. Aucune revente.</p>
                     ${creditsHtml}
                 </div>
             `;
             
             const btnBack = document.createElement('button'); btnBack.className='btn'; btnBack.textContent='Retour';
             btnBack.style.marginTop = '20px';
             btnBack.onclick = () => { if(state.pseudo) renderHome(); else renderLogin(); };
             card.appendChild(btnBack);
             app.appendChild(card);
         }
         
         function renderPathoStats(patho) {
             setDocTitle(`Statistiques : ${patho.name}`);
             window.scrollTo(0,0);
             const app = q('#app'); app.innerHTML='';
             const card = document.createElement('div'); card.className='card center';
             const m = (state.progression.mastery || {})[patho.name];
             const wins = (typeof m === 'number') ? m : (m?.success || 0);
             const loss = (m?.failures || 0);
             const mistakes = (m?.missedSigns || {});
             const bestTime = (state.progression.bestTimes || {})[patho.name];
         
             let rank = 'Verrouillé', icon=`<i class="ph-duotone ph-lock-key icon-lg"></i>`, color='var(--text-muted)';
             if(wins >= 10) { rank='Maître'; icon=`<i class="ph-duotone ph-diamond icon-lg color-ruby"></i>`; color='var(--ruby)'; }
             else if(wins >= 5) { rank='Or'; icon=`<i class="ph-duotone ph-trophy icon-lg color-gold"></i>`; color='var(--gold)'; }
             else if(wins >= 3) { rank='Argent'; icon=`<i class="ph-duotone ph-medal icon-lg color-silver"></i>`; color='var(--silver)'; }
             else if(wins >= 1) { rank='Bronze'; icon=`<i class="ph-duotone ph-medal icon-lg color-bronze"></i>`; color='var(--bronze)'; }
         
             card.innerHTML = `
             <div style="font-size:40px; margin-bottom:10px; color:${color};">${icon}</div>
             <h3 style="color:${color}; margin-bottom:10px;">Rang : ${rank}</h3>
             ${bestTime ? `<div class="small" style="color:var(--accent); margin-bottom:20px;"><i class="ph-duotone ph-lightning"></i> Record Chrono : ${bestTime.toFixed(1)}s</div>` : ''}
             <h2>${patho.name}</h2>
             
             <div style="margin: 15px 0; max-width: 100%;">
             </div>
         
             <div class="patho-desc" style="margin-bottom:20px;">${patho.short}</div>
             
             <div style="display:flex; gap:15px; width:100%; margin-bottom:20px; justify-content:center;">
                 <div class="stat-box" style="border-color:var(--success); max-width:150px;"><div class="stat-number" style="color:var(--success)">${wins}</div>Réussites</div>
                 <div class="stat-box" style="border-color:var(--error); max-width:150px;"><div class="stat-number" style="color:var(--error)">${loss}</div>Erreurs</div>
             </div>`;
         
             if(Object.keys(mistakes).length > 0) {
                 const missedRealSigns = []; 
                 const wronglySelectedSigns = []; 
         
                 Object.entries(mistakes).forEach(([sign, count]) => {
                     if(patho.signes[sign] && patho.signes[sign] > 0) {
                         missedRealSigns.push({sign, count, weight: patho.signes[sign]});
                     } else {
                         wronglySelectedSigns.push({sign, count});
                     }
                 });
         
                 const sortFn = (a, b) => {
                     if (b.count !== a.count) return b.count - a.count;
                     return (b.weight || 0) - (a.weight || 0);
                 };
         
                 missedRealSigns.sort(sortFn);
                 wronglySelectedSigns.sort((a,b) => b.count - a.count);
         
                 let html = '<div style="text-align:left; width:100%; margin-top:15px;">';
         
                 if(missedRealSigns.length > 0) {
                     html += `<h4 style="color:var(--error); margin-bottom:10px; border-bottom:1px solid rgba(255,77,77,0.3); padding-bottom:5px;">
                         <i class="ph-duotone ph-warning-circle"></i> Symptômes manqués (Oublis)
                     </h4>
                     <ul style="color:var(--text-muted); margin-bottom:20px;">`;
                     missedRealSigns.forEach(item => {
                         html += `<li style="margin-bottom:5px;">
                             <strong>${formatSigneName(item.sign)}</strong> 
                             <span style="opacity:0.6; font-size:0.9em;">(Oublié ${item.count} fois)</span>
                         </li>`;
                     });
                     html += '</ul>';
                 }
         
                 if(wronglySelectedSigns.length > 0) {
                     html += `<h4 style="color:#ff9f43; margin-bottom:10px; border-bottom:1px solid rgba(255,159,67,0.3); padding-bottom:5px;">
                         <i class="ph-duotone ph-prohibit"></i> Confusions (Signes ajoutés à tort)
                     </h4>
                     <ul style="color:var(--text-muted);">`;
                     wronglySelectedSigns.forEach(item => {
                         html += `<li style="margin-bottom:5px;">
                             <strong>${formatSigneName(item.sign)}</strong> 
                             <span style="opacity:0.6; font-size:0.9em;">(Erreur ${item.count} fois)</span>
                         </li>`;
                     });
                     html += '</ul>';
                 }
         
                 html += '</div>';
                 card.innerHTML += html;
             }
         
             const btnBack = document.createElement('button'); btnBack.className='btn'; btnBack.textContent='Retour Profil';
             btnBack.style.marginTop = '20px';
             btnBack.onclick=renderProfile;
             card.appendChild(btnBack); app.appendChild(card);
         }
         
         function renderDemographics() {
         setDocTitle("Paramètres Patient");
         window.scrollTo(0, 0);
         const app = q('#app');
         app.innerHTML = '';
         const card = document.createElement('div');
         card.className = 'card center';
         
         // --- EN-TÊTE (Modifié pour gérer le titre Examen) ---
          if (state.exam && state.exam.active) {
             // Si on est en mode examen
             const currentCase = state.exam.currentIndex + 1;
             const totalCases = state.exam.queue.length;
             card.innerHTML = `<h3><i class="ph-duotone ph-student color-accent"></i> Examen Blanc</h3><p class="small" style="margin-bottom:20px; color:var(--accent);">Cas Clinique ${currentCase} / ${totalCases}</p>`;
          } 
          else if (state.dailyTarget) {
             // Si c'est le défi du jour normal
             card.innerHTML = `<h3><i class="ph-duotone ph-sun color-gold"></i> Défi du Jour</h3><p class="small" style="margin-bottom:20px; color:var(--gold);">Cible : ${state.dailyTarget.name}</p>`;
          } 
          else {
             // Si c'est un entrainement libre
             card.innerHTML = `<h3 style="text-align:center; margin-bottom:15px;"><i class="ph-duotone ph-user-list"></i> Profil Patient</h3><p class="small" style="margin-bottom:20px">Définissez le terrain et le contexte clinique.</p>`;
          }
         
         // --- 1. IDENTITÉ (Sexe & Âge) ---
         const genderContainer = document.createElement('div');
         genderContainer.className = 'gender-selector';
         genderContainer.innerHTML = `
         <button class="gender-btn" id="btn-femme" onclick="selectGender('femme')" title="Femme"><i class="ph-duotone ph-gender-female"></i></button>
         <button class="gender-btn" id="btn-homme" onclick="selectGender('homme')" title="Homme"><i class="ph-duotone ph-gender-male"></i></button>
         `;
         card.appendChild(document.createElement('label')).textContent = "Identité";
         card.appendChild(genderContainer);
         
         let selectedGender = null;
         window.selectGender = (g) => {
         selectedGender = g;
         document.getElementById('btn-femme').className = `gender-btn ${g === 'femme' ? 'active' : ''}`;
         document.getElementById('btn-homme').className = `gender-btn ${g === 'homme' ? 'active' : ''}`;
         toggleGenderSpecificTags(g);
         };
         
         const sAge = document.createElement('select'); sAge.id = 'demo-age'; sAge.className = 'input';
         const ages = [
         { val: "nourrisson", txt: "Nourrisson (< 2 ans)" },
         { val: "enfant", txt: "Enfant (2 - 12 ans)" },
         { val: "adolescent", txt: "Adolescent (13 - 18 ans)" },
         { val: "jeune", txt: "Jeune Adulte (19 - 35 ans)" },
         { val: "adulte", txt: "Adulte (36 - 65 ans)" },
         { val: "senior", txt: "Senior (> 65 ans)" }
         ];
         ages.forEach(a => {
         const op = document.createElement('option'); op.value = a.val; op.textContent = a.txt;
         if (a.val === 'adulte') op.selected = true; 
         sAge.appendChild(op);
         });
         card.appendChild(sAge);
         
         // --- 3. TERRAIN & ANTÉCÉDENTS (Chips organisés) ---
         // On regroupe par logique clinique : Toxiques, Métabolique, Contexte aigu...
         
         const chipsDiv = document.createElement('div');
         chipsDiv.className = 'chips-container';
         
         // Définition des groupes pour l'affichage (Purement visuel)
         const groups = [
         {
             title: "Habitudes & Métabolisme",
             items: [
                 { id: 'tabac', label: 'Tabac', icon: 'ph-cigarette' },
                 { id: 'alcool', label: 'Alcool', icon: 'ph-beer-bottle' },
                 { id: 'surpoids', label: 'Surpoids / Obésité', icon: 'ph-hamburger' },
                 { id: 'metabolique', label: 'Diabète / HTA', icon: 'ph-heart-break' } // Regroupement intelligent
             ]
         },
         {
             title: "Contexte Aigu / Déclencheur",
             items: [
                 { id: 'trauma', label: 'Chute / Trauma / Effort', icon: 'ph-bone' }, // Couvre Fracture, IDM, Entorse...
                 { id: 'chirurgie', label: 'Chirurgie / Alité', icon: 'ph-bed' }, // Couvre Embolie
                 { id: 'voyage', label: 'Voyage / Plein Air', icon: 'ph-airplane' }, // Couvre Palu, Lyme, Tétanos
                 { id: 'medicaments', label: 'Médicaments / Allergie', icon: 'ph-pill' } // Couvre Choc, AINS, Anticoag...
             ]
         },
         {
             title: "Terrain Fragile",
             items: [
                 { id: 'immuno', label: 'Cancer / Immuno.', icon: 'ph-dna' }, // Couvre ID, Cancer, Corticoïdes
                 { id: 'psy', label: 'Contexte Psy / Stress', icon: 'ph-brain' }, // Couvre Panique, TCA
                 { id: 'hiver', label: 'Hiver / Épidémie', icon: 'ph-snowflake' } // Couvre Grippe, Bronchio
             ]
         },
         {
             title: "Gynécologie",
             genderSpecific: 'femme', // Sera caché si Homme
             items: [
                 { id: 'grossesse', label: 'Grossesse', icon: 'ph-baby' },
                 { id: 'sterilet', label: 'Stérilet', icon: 'ph-anchor' },
                 { id: 'menopause', label: 'Ménopause', icon: 'ph-hourglass' }
             ]
         }
         ];
         
         const selectedFactors = new Set();
         
         groups.forEach(group => {
         // Création du titre de section (ex: HABITUDES)
         const label = document.createElement('div');
         label.className = 'section-label';
         label.textContent = group.title;
         if(group.genderSpecific) label.id = `label-${group.genderSpecific}`; // Pour le cacher
         chipsDiv.appendChild(label);
         
         // Création des chips
         group.items.forEach(f => {
             const chip = document.createElement('div');
             chip.className = 'chip';
             chip.id = `chip-${f.id}`;
             chip.innerHTML = `<i class="ph-duotone ${f.icon}"></i> ${f.label}`;
             if (group.genderSpecific) chip.dataset.gender = group.genderSpecific;
         
             chip.onclick = () => {
                 if (selectedFactors.has(f.id)) {
                     selectedFactors.delete(f.id);
                     chip.classList.remove('selected');
                 } else {
                     selectedFactors.add(f.id);
                     chip.classList.add('selected');
                 }
             };
             chipsDiv.appendChild(chip);
         });
         });
         card.appendChild(chipsDiv);
         
         // Fonction de gestion d'affichage Homme/Femme
         window.toggleGenderSpecificTags = (g) => {
         // Gérer les titres de sections
         const labelFemme = document.getElementById('label-femme');
         if(labelFemme) labelFemme.style.display = (g === 'femme') ? 'block' : 'none';
         
         // Gérer les chips
         const chips = document.querySelectorAll('[data-gender="femme"]');
         chips.forEach(c => {
             if (g === 'femme') c.style.display = 'flex';
             else {
                 c.style.display = 'none';
                 c.classList.remove('selected');
                 selectedFactors.delete(c.id.replace('chip-', ''));
             }
         });
         };
         
         // Initialisation
         toggleGenderSpecificTags(null); 
         
         // --- 4. CHRONO ---
         if (!state.dailyTarget) {
         const chronoDiv = document.createElement('div');
         chronoDiv.style.margin = '10px 0 20px 0'; chronoDiv.style.textAlign = 'center';
         chronoDiv.innerHTML = `<label style="cursor:pointer; color:var(--text-muted); font-size:13px;"><input type="checkbox" id="chronoToggle" style="margin-right:6px; vertical-align:middle;"> <i class="ph-duotone ph-lightning"></i> Mode Chrono</label>`;
         card.appendChild(chronoDiv);
         }
         
         // --- BOUTONS ---
         const btnGroup = document.createElement('div'); btnGroup.className = 'button-group';
         const btnStart = document.createElement('button'); btnStart.className = 'btn'; btnStart.innerHTML = '<i class="ph-duotone ph-play"></i> Lancer le cas';
         
         btnStart.onclick = () => {
             // Si le genre n'est pas sélectionné et que ce n'est pas le défi du jour, on en choisit un au hasard
             if (!selectedGender && !state.dailyTarget) { 
                 if(Math.random() > 0.5) selectedGender = 'femme'; else selectedGender = 'homme';
             }
             
             const ageVal = q('#demo-age').value;
             
             // --- MAPPING INTELLIGENT FACTEURS EDN --- 
             // On construit l'objet demoData qui sera comparé au JSON
             const demoData = {};

             // 1. Sexe & Age de base
             if(selectedGender === 'homme') { demoData['homme'] = true; demoData['garcon'] = true; }
             if(selectedGender === 'femme') { demoData['femme'] = true; demoData['fille'] = true; }
             
             // Mapping des tranches d'âges vers les clés du JSON
             if(ageVal === 'nourrisson') { demoData['nourrisson'] = true; demoData['nourrisson_moins_2ans'] = true; demoData['nourrisson_3mois_3ans'] = true; demoData['nourrisson_non_vaccine'] = true; }
             if(ageVal === 'enfant') { demoData['enfant'] = true; demoData['enfant_3_15ans'] = true; demoData['enfant_scolarise'] = true; demoData['enfant_age_scolaire'] = true; demoData['enfant_9mois_5ans'] = true; }
             if(ageVal === 'adolescent') { demoData['adolescent'] = true; demoData['adolescente'] = true; demoData['sujet_jeune'] = true; }
             if(ageVal === 'jeune') { demoData['jeune'] = true; demoData['sujet_jeune'] = true; demoData['adulte_jeune'] = true; demoData['homme_jeune'] = (selectedGender === 'homme'); demoData['homme_jeune_20_35ans'] = (selectedGender === 'homme'); }
             if(ageVal === 'adulte') { demoData['adulte'] = true; demoData['adulte_moyen'] = true; demoData['quarantaine'] = true; demoData['age_>40ans'] = true; demoData['homme_mur'] = (selectedGender === 'homme'); demoData['femme_quarantaine'] = (selectedGender === 'femme'); }
             if(ageVal === 'senior') { 
                 demoData['senior'] = true; demoData['sujet_age'] = true; demoData['age_avance'] = true; 
                 demoData['plus_de_50ans'] = true; demoData['age_>50ans'] = true; 
                 demoData['age_>60ans'] = true; demoData['sujet_age_>60ans'] = true;
                 demoData['plus_de_65ans'] = true; demoData['age_>65ans'] = true; 
                 demoData['age_>75ans'] = true; 
                 demoData['femme_menopausee'] = (selectedGender === 'femme'); 
                 demoData['femme_agee'] = (selectedGender === 'femme');
             }

             // 2. Facteurs combinés Sexe + Age
             if(selectedGender === 'homme' && (ageVal === 'jeune' || ageVal === 'adolescent')) { demoData['homme_jeune'] = true; demoData['homme_jeune_longiligne'] = true; }
             if(selectedGender === 'homme' && (ageVal === 'senior' || ageVal === 'adulte')) demoData['homme_age'] = true;
             if(selectedGender === 'femme' && (ageVal === 'jeune' || ageVal === 'adulte' || ageVal === 'adolescent')) {
                 demoData['femme_jeune'] = true;
                 demoData['femme_age_procreer'] = true;
             }

             // 3. Mapping des boutons de l'interface (Chips) vers les clés JSON
             
             // Bouton "Diabète / HTA / Métabolisme"
             if(selectedFactors.has('metabolique')) {
                 demoData['diabete'] = true; demoData['diabete_insuline_sulfamides'] = true;
                 demoData['hta'] = true; demoData['hta_ancienne'] = true; demoData['hta_mal_controlee'] = true; demoData['hta_resistante'] = true;
                 demoData['syndrome_metabolique'] = true; demoData['dyslipidemie'] = true; demoData['hyperlipidemie'] = true;
                 demoData['nephropathie_diabetique'] = true; demoData['nephroangiosclerose'] = true;
                 demoData['fibrillation_atriale'] = true; // Facteur de risque induit
                 demoData['insuffisance_cardiaque'] = true;
                 demoData['arteriopathie'] = true;
             }
             
             // Bouton "Chute / Trauma / Effort"
             if(selectedFactors.has('trauma')) {
                 demoData['chute'] = true; demoData['chute_hauteur'] = true; demoData['chute_mains_avant'] = true; 
                 demoData['traumatisme_cranien'] = true; demoData['traumatisme_cranien_violent'] = true; demoData['traumatisme_cranien_ancien'] = true;
                 demoData['traumatisme_oculaire'] = true; demoData['traumatisme_inversion'] = true;
                 demoData['effort'] = true; demoData['effort_physique'] = true; demoData['effort_soulevement'] = true; demoData['effort_declenchant'] = true;
                 demoData['sport'] = true; demoData['sport_pivot'] = true;
                 demoData['atcd_traumatique'] = true; demoData['frottement_yeux'] = true;
                 demoData['geste_intra_articulaire'] = true;
             }
             
             // Bouton "Chirurgie / Alité"
             if(selectedFactors.has('chirurgie')) {
                 demoData['chirurgie_recente'] = true; demoData['chirurgie_abdominale'] = true;
                 demoData['alitement'] = true; demoData['alitement_prolonge'] = true;
                 demoData['bride_chirurgicale'] = true; demoData['chirurgie_cataracte'] = true;
                 demoData['post_neurochirurgie'] = true; demoData['splenectomie'] = true;
             }
             
             // Bouton "Voyage / Plein Air"
             if(selectedFactors.has('voyage')) {
                 demoData['voyage_recent'] = true; demoData['voyage_zone_endemique'] = true; demoData['voyage_recent_non_vaccine'] = true;
                 demoData['activite_forestiere'] = true; demoData['foret'] = true;
                 demoData['jardinage'] = true; demoData['blessure_jardinage'] = true;
                 demoData['voyage_chaleur'] = true;
             }
             
             // Bouton "Médicaments / Allergies"
             if(selectedFactors.has('medicaments')) {
                 demoData['medicaments'] = true; demoData['prise_medicamenteuse'] = true; demoData['arret_traitement'] = true;
                 demoData['allergies'] = true; demoData['atopie'] = true; demoData['allergie_connue'] = true; demoData['terrain_atopique_familial'] = true;
                 demoData['introduction_allergene'] = true;
                 demoData['prise_ains'] = true; demoData['ains'] = true; demoData['prise_aains'] = true;
                 demoData['anticoagulants'] = true; demoData['prise_anticoagulants'] = true;
                 demoData['corticoides'] = true; demoData['corticotherapie'] = true; demoData['corticotherapie_long_cours'] = true; demoData['prise_corticoides'] = true; demoData['corticoides_inhalés'] = true;
                 demoData['nephrotoxiques'] = true; demoData['traitement_amiodarone'] = true; demoData['arret_traitement_lasilix'] = true;
                 demoData['contraception_oestroprogestative'] = true; demoData['hormones'] = true;
                 demoData['prise_antibiotiques'] = true; demoData['antibiotiques_recents'] = true;
             }
             
             // Bouton "Cancer / Immuno"
             if(selectedFactors.has('immuno')) {
                 demoData['cancer'] = true; demoData['cancer_actif'] = true; demoData['cancer_digestif'] = true; demoData['cancer_prostate'] = true;
                 demoData['immunodepression'] = true; 
                 demoData['auto_immun'] = true; demoData['auto_immunite_associee'] = true; demoData['atcd_autoimmun'] = true;
                 demoData['chimio_anterieure'] = true; demoData['radiotherapie'] = true;
             }
             
             // Bouton "Psy / Stress"
             if(selectedFactors.has('psy')) {
                 demoData['stress'] = true; demoData['stress_obscurite'] = true; demoData['terrain_anxieux'] = true;
                 demoData['depression'] = true; demoData['antecedent_personnel'] = true;
                 demoData['perfectionnisme'] = true; demoData['dette_sommeil'] = true;
                 demoData['isolement_social'] = true; demoData['milieu_socio_eleve'] = true;
             }
             
             // Bouton "Hiver / Épidémie"
             if(selectedFactors.has('hiver')) {
                 demoData['hiver'] = true; demoData['saison_hivernale'] = true; demoData['saison_froide'] = true; demoData['hiver_printemps'] = true;
                 demoData['epidemie'] = true; demoData['epidemie_hivernale'] = true;
                 demoData['contage'] = true; demoData['contage_creche'] = true; demoData['collectivite'] = true; demoData['entourage_malade'] = true;
                 demoData['rhume_recent'] = true; demoData['rhinopharyngite'] = true; demoData['rhinopharyngite_precedente'] = true; demoData['infection_orl_recente'] = true; demoData['episode_viral_precedent'] = true; demoData['viral'] = true; demoData['infection_virale_recente'] = true;
             }

             // Facteurs simples (Boutons individuels)
             if(selectedFactors.has('tabac')) { demoData['tabac'] = true; demoData['tabagisme'] = true; demoData['tabagisme_actif'] = true; demoData['tabagisme_paquets_annee'] = true; demoData['alcool_tabac'] = true; }
             if(selectedFactors.has('alcool')) { demoData['alcool'] = true; demoData['alcoolisme'] = true; demoData['alcoolisme_chronique'] = true; demoData['ethylisme_chronique'] = true; demoData['toxiques_alcool'] = true; demoData['sevrage_alcool'] = true; demoData['exces_alimentaire_alcool'] = true; demoData['douleur_ganglionnaire_alcool'] = true; }
             if(selectedFactors.has('surpoids')) { demoData['surpoids'] = true; demoData['surpoids_obesite'] = true; demoData['obesite'] = true; demoData['obesite_abdominale'] = true; demoData['imc_bas'] = false; }
             if(selectedFactors.has('grossesse')) { demoData['grossesse'] = true; demoData['grossesse_>20SA'] = true; demoData['post_partum'] = true; demoData['femme_enceinte_risque'] = true; }
             if(selectedFactors.has('sterilet')) { demoData['dispositif_intra_uterin'] = true; demoData['sterilet'] = true; }
             if(selectedFactors.has('menopause')) { demoData['menopause'] = true; demoData['femme_menopausee'] = true; demoData['femme_post_menopause'] = true; }

             // Facteurs implicites liés au profil jeune/risque
             if(demoData['jeune'] || demoData['adolescent'] || demoData['adulte_jeune']) {
                 demoData['rapport_risque'] = true; demoData['rapport_sexuel_non_protege'] = true; demoData['rapports_non_proteges'] = true;
                 demoData['partenaires_multiples'] = true; demoData['ist_recente'] = true; demoData['comportement_sexuel_risque'] = true;
                 demoData['jeune_imprudent'] = true;
                 demoData['consommation_cannabis'] = true; demoData['toxicomanie_iv'] = true;
             }
             
             // Facteurs anatomiques/génétiques divers (activés aléatoirement si pertinent pour varier le jeu, ou liés à d'autres facteurs)
             if(demoData['senior']) { demoData['valvulopathie_connue'] = true; demoData['atcd_aaa_connu'] = true; demoData['hbp'] = true; }
             if(demoData['femme']) { demoData['regles_abondantes'] = true; demoData['catamenial'] = true; }
             if(demoData['homme']) { demoData['garcon_premier_ne'] = true; }

             // --- LANCEMENT ---
             state.demo = demoData;
             state.answers = {}; state.asked = []; state.diagnosticShown = false; state.previousDiagnostics = []; state.history = [];
             state.confirmationMode = false; state.confirmationQueue = []; state.confirmedPatho = null;
             state.priorityQueue = [];
             
             if (state.dailyTarget) state.isChrono = false;
             else state.isChrono = q('#chronoToggle')?.checked || false;
             
             if (state.isChrono) state.startTime = Date.now();
             else state.startTime = null;
             
             askNextQuestion();
          };
         
         const btnCancel = document.createElement('button'); btnCancel.className = 'link'; btnCancel.textContent = 'Annuler'; btnCancel.onclick = renderHome;
         btnGroup.appendChild(btnStart); btnGroup.appendChild(btnCancel); card.appendChild(btnGroup); app.appendChild(card);
         }
         
         function prepareSigns() {
             let allSignsSet = new Set();
             PATHOLOGIES.forEach(p => { Object.keys(p.signes).forEach(s => allSignsSet.add(s)); });
             state.allSigns = Array.from(allSignsSet);
         }
         
         function rankPathologies() {
    const scores = PATHOLOGIES.map(p => {
        // --- 1. VETO STRICT ---
        if (p.veto && p.veto.some(v => state.answers[v] === false)) {
            return { patho: p, score: -1, prob: 0 };
        }

        let matchPoints = 0;
        let maxPossiblePoints = 0;

        // --- 2. CALCUL DES POINTS CLINIQUES ---
        for (const [signe, poids] of Object.entries(p.signes)) {
            maxPossiblePoints += poids;

            if (state.answers[signe] === true) {
                matchPoints += poids;
                if (p.boost && p.boost.includes(signe)) matchPoints += 50; // Bonus Boost
            } else if (state.answers[signe] === false) {
                matchPoints -= (poids * 0.5); // Pénalité
            }
        }

        // --- 3. BONUS DE CONTEXTE (TERRAIN) ---
        // On récupère le groupe de la maladie (ex: Cardio)
        const pGroup = PATHO_GROUPS[p.name];
        
        if (pGroup && state.demo) {
            // On parcourt nos règles de contexte
            CONTEXT_RULES.forEach(rule => {
                // Si le patient a UN des facteurs déclencheurs (ex: tabac)
                const hasFactor = rule.trigger.some(t => state.demo[t]);
                // Et que la maladie fait partie des cibles (ex: Cardio)
                if (hasFactor && rule.targets.includes(pGroup)) {
                    matchPoints += rule.bonus;
                    // On augmente un peu le max possible pour lisser le % mais garder l'avantage relatif
                    maxPossiblePoints += (rule.bonus * 0.5); 
                }
            });
        }

        // --- 4. NORMALISATION ---
        // Sécurité division par zéro
        if (maxPossiblePoints === 0) maxPossiblePoints = 1;

        let finalProb = (matchPoints / maxPossiblePoints) * 100;
        if (finalProb < 0) finalProb = 0;
        if (finalProb > 100) finalProb = 100;

        return { patho: p, score: matchPoints, prob: finalProb.toFixed(1) };
    });

    // Tri décroissant
    state.ranked = scores
        .filter(s => s.score >= -100) // On garde tout sauf les vetos violents
        .sort((a, b) => b.prob - a.prob);
}
         
         function getNextSmartSign(ranked, remainingSigns) {
    if (!ranked || ranked.length === 0 || remainingSigns.length === 0) return null;

    const topProb = parseFloat(ranked[0].prob);
    const topPatho = ranked[0].patho;

    // ============================================================
    // 🚨 PHASE 0 : PRIORITÉ ABSOLUE AUX CHEFS DE FILE PERTINENTS
    // ============================================================
    // Règle : On pose TOUS les chefs de file qui concernent au moins UNE pathologie
    // du Top 10, AVANT de poser des questions détaillées.
    
    if (topProb < 65) {
        // 1. On isole le Top 10 (ou moins si pas assez de candidats)
        const scope = Math.min(ranked.length, 10); 
        const topCandidates = ranked.slice(0, scope);

        // 2. Construction d'un Set de tous les chefs de file présents dans le Top 10
        const relevantGeneralSymptoms = new Set();
        
        topCandidates.forEach(candidate => {
            GENERAL_SYMPTOMS.forEach(gen => {
                // Si cette pathologie possède ce chef de file
                if (candidate.patho.signes[gen]) {
                    relevantGeneralSymptoms.add(gen);
                }
            });
        });

        // 3. On cherche le MEILLEUR chef de file non posé parmi les pertinents
        let bestGen = null;
        let maxRelevance = 0;

        relevantGeneralSymptoms.forEach(gen => {
            // Condition : Pas déjà posé ET disponible
            if (!state.asked.includes(gen) && remainingSigns.includes(gen)) {
                
                let relevance = 0;
                
                // Calcul du score de pertinence
                topCandidates.forEach((candidate, index) => {
                    const signWeight = candidate.patho.signes[gen];
                    
                    if (signWeight) {
                        // Plus la pathologie est haute dans le classement, plus elle compte
                        // Plus le poids clinique est élevé, plus ça compte
                        relevance += (11 - index) * signWeight;
                    }
                });

                // On garde le meilleur
                if (relevance > maxRelevance) {
                    maxRelevance = relevance;
                    bestGen = gen;
                }
            }
        });

        // 4. SI on a trouvé un chef de file pertinent, ON LE POSE
        if (bestGen && maxRelevance > 0) {
            console.log(`🚨 Chef de File Pertinent : ${bestGen} (Score: ${maxRelevance.toFixed(1)})`);
            console.log(`   → Concerne ${Array.from(relevantGeneralSymptoms).length} symptômes du Top 10`);
            return bestGen;
        }
        
        // 5. Si TOUS les chefs de file pertinents ont été posés, on log
        console.log(`✅ Tous les chefs de file pertinents épuisés. Passage aux questions précises.`);
    }

    // ============================================================
    // 🛡️ SÉCURITÉ : VETO MANQUÉ (Kill Switch)
    // ============================================================
    const missedVeto = Object.keys(topPatho.signes).find(s => 
        (topPatho.veto && topPatho.veto.includes(s)) && 
        !state.asked.includes(s) && 
        remainingSigns.includes(s)
    );
    if (missedVeto) return missedVeto;

    // ============================================================
    // 🔍 PHASE 2 : DÉTAILS INTELLIGENTS (Filtrés sur le Top 5)
    // ============================================================
    // On n'arrive ici QUE si tous les chefs de file du Top 10 ont déjà été posés (ou non pertinents).
    
    // Si confiance élevée (>70%), on cherche les Boosts (Signes spécifiques)
    if (topProb >= 70) {
        const boostSigns = Object.keys(topPatho.signes).filter(s =>
            topPatho.boost && topPatho.boost.includes(s) && !state.asked.includes(s) && remainingSigns.includes(s)
        );
        if (boostSigns.length > 0) return boostSigns[0];
    }

    // 1. On identifie les survivants (Le Top 5 actuel)
    const survivors = ranked.slice(0, 5).map(r => r.patho);

    // 2. On construit un Pool de questions "propres"
    // On ne garde que les signes qui appartiennent aux survivants.
    // Cela empêche de poser une question sur une maladie éliminée.
    const relevantSignsPool = new Set();
    survivors.forEach(p => {
        Object.keys(p.signes).forEach(s => {
            if (!state.asked.includes(s)) {
                relevantSignsPool.add(s);
            }
        });
    });

    // Fallback si le pool est vide (très rare)
    const pool = relevantSignsPool.size > 0 ? Array.from(relevantSignsPool) : remainingSigns;

    // 3. Algorithme de Split sur le Top 3
    const top3 = ranked.slice(0, 3).map(r => r.patho);
    
    return selectBestSplitSign(pool, top3);
}

         // Fonction qui choisit le meilleur Chef de File en fonction des maladies probables
function getBestGeneralSign(pool, candidates) {
    let bestSign = null;
    let maxCount = -1;

    // Pour chaque Chef de File disponible...
    pool.forEach(sign => {
        let count = 0;
        // ... on compte combien de maladies du TOP 10 le possèdent
        candidates.forEach(p => {
            if (p.signes[sign]) count++;
        });

        // On cherche celui qui divise le mieux (proche de 50% des candidats idéalement, 
        // ou le plus fréquent si on veut valider une hypothèse)
        // Ici, on va privilégier la fréquence pour "grouper" (ex: si 8 maladies sur 10 ont de la fièvre, on demande la fièvre)
        if (count > maxCount) {
            maxCount = count;
            bestSign = sign;
        }
    });

    // Si aucun chef de file ne correspond aux maladies actuelles (cas rare ou début de partie),
    // on en prend un au hasard pour débloquer
    if (maxCount === 0 || !bestSign) {
        return pool[Math.floor(Math.random() * pool.length)];
    }

    return bestSign;
}

// ----------------------------------------
// 🎲 FONCTION DE SPLIT OPTIMAL (80/20)
// ----------------------------------------
function selectBestSplitSign(pool, topCandidates) {
    let bestSign = null;
    let bestScore = -1;

    for (const sign of pool) {
        let presenceCount = 0;
        let weightSum = 0;

        topCandidates.forEach(p => {
            if (p.signes[sign]) {
                presenceCount++;
                weightSum += p.signes[sign];
            }
        });

        const distanceToMid = Math.abs(presenceCount - (topCandidates.length / 2));
        const optimalityScore = (topCandidates.length - distanceToMid) * weightSum;

        if (optimalityScore > bestScore) {
            bestScore = optimalityScore;
            bestSign = sign;
        }
    }

    // 🎲 20% de chance de prendre un signe aléatoire (anti-pattern)
    if (Math.random() < 0.2 && pool.length > 3) {
        const randomSigns = pool.filter(s => s !== bestSign);
        return randomSigns[Math.floor(Math.random() * randomSigns.length)] || bestSign;
    }

    return bestSign || pool[0];
}
         
         function canShowDiagnostic() {
    if (state.ranked.length === 0) return false;
    if (state.confirmationMode) return false;

    const top1 = state.ranked[0];
    const top2 = state.ranked[1];
    const score1 = parseFloat(top1.prob);
    const score2 = top2 ? parseFloat(top2.prob) : 0;
    const qNum = state.asked.length;

    // ✅ DÉCLENCHEMENT : Confiance > 75% ET écart > 20% avec le 2ème
    const isConfident = score1 > 75 && (score1 - score2) > 20;

    // OU si on a posé 12+ questions et qu'on a un leader clair
    const isLongEnough = qNum >= 12 && score1 > 60;

    if (isConfident || isLongEnough) {
        console.log(`🎯 Déclenchement confirmation : ${top1.patho.name} (${score1}%)`);
        startConfirmationPhase(top1.patho);
        return true;
    }

    return false;
}
         
         function prepareConfirmationQuestions(topPatho) {
             const pSigns = Object.keys(topPatho.signes);
             const unaskedCorrect = pSigns.filter(s => !state.asked.includes(s));
         
             // 1. Identifier l'examen complémentaire (La "Preuve" / Boss Final)
             let proofSign = unaskedCorrect.find(s => topPatho.signes[s] >= 40);
         
             // 2. Préparer le pool de signes CORRECTS restants (sans la preuve)
             let poolCorrect = unaskedCorrect.filter(s => s !== proofSign);
             poolCorrect.sort(() => 0.5 - Math.random());
         
             // 3. Préparer le pool de signes PIÈGES (Diagnostic Différentiel)
             // On va chercher les signes des pathologies classées 2, 3, 4 et 5
             let differentialSigns = new Set();
             // On limite la recherche aux 5 premiers résultats max
             const maxRank = Math.min(state.ranked.length, 5); 
         
             for (let i = 1; i < maxRank; i++) {
                 if (state.ranked[i]) {
                     const competitorPatho = state.ranked[i].patho;
                     Object.keys(competitorPatho.signes).forEach(s => {
                         // On ajoute le signe SI :
                         // - Il n'appartient PAS à la maladie correcte (sinon ce n'est pas un piège)
                         // - Il n'a pas déjà été posé
                         if (!pSigns.includes(s) && !state.asked.includes(s)) {
                             differentialSigns.add(s);
                         }
                     });
                 }
             }
         
             let poolTraps = Array.from(differentialSigns);
             poolTraps.sort(() => 0.5 - Math.random()); // Mélanger les pièges pertinents
         
             // FALLBACK : Si pas assez de pièges pertinents (cas rare), on complète avec du hasard
             if (poolTraps.length < 3) {
                 const randomTraps = state.allSigns.filter(s => 
                     !pSigns.includes(s) && !state.asked.includes(s) && !poolTraps.includes(s)
                 );
                 randomTraps.sort(() => 0.5 - Math.random());
                 poolTraps = [...poolTraps, ...randomTraps];
             }
         
             // 4. Construction de la file d'attente avec RATIO ALÉATOIRE
             // On choisit une longueur de séquence entre 3 et 5 questions (hors preuve)
             const sequenceLength = Math.floor(Math.random() * 3) + 3; // 3, 4 ou 5
             let queue = [];
         
             // Remplissage aléatoire des slots
             for (let i = 0; i < sequenceLength; i++) {
                 // 50% de chance de vouloir un signe correct, 50% un piège
                 const wantCorrect = Math.random() > 0.5;
         
                 if (wantCorrect && poolCorrect.length > 0) {
                     queue.push(poolCorrect.shift());
                 } else if (poolTraps.length > 0) {
                     queue.push(poolTraps.shift());
                 } else if (poolCorrect.length > 0) {
                     // Si on voulait un piège mais qu'il n'y en a plus, on met un correct
                     queue.push(poolCorrect.shift());
                 } else {
                     // Plus de questions dispo
                     break;
                 }
             }
         
             // 5. Sécurité Anti-Pattern
             // On s'assure qu'il y a au moins 1 vrai et 1 faux dans le lot (si possible)
             // pour ne pas avoir une série de 5 "NON" ou 5 "OUI" trop évidente
             const hasCorrect = queue.some(s => pSigns.includes(s));
             const hasTrap = queue.some(s => !pSigns.includes(s));
         
             if (!hasCorrect && poolCorrect.length > 0 && queue.length > 0) {
                 queue[0] = poolCorrect.shift(); // On force un vrai
             }
             if (!hasTrap && poolTraps.length > 0 && queue.length > 0) {
                 queue[queue.length - 1] = poolTraps.shift(); // On force un faux
             }
         
             // 6. Mélanger la file d'attente finale
             queue.sort(() => 0.5 - Math.random());
         
             // 7. Ajouter la PREUVE à la toute fin
             if (proofSign) {
                 queue.push(proofSign);
             } else if (poolCorrect.length > 0) {
                 // Si pas de preuve absolue, on met un dernier signe correct pour valider
                 queue.push(poolCorrect.shift());
             }
         
             return queue;
         }
         
         // --- FONCTIONS "PLAISANTIN" (Easter Eggs) ---
         function checkPlaisantin() {
             // On ne vérifie qu'exactement à la 20ème question
             if (state.asked.length < 12) return false;
         
             // Vérifier si toutes les réponses sont NON
             const allNo = state.asked.every(sign => state.answers[sign] === false);
             if (allNo) {
                 renderPlaisantinEnd("healthy");
                 return true; // On stoppe le jeu
             }
         
             // Vérifier si toutes les réponses sont OUI
             const allYes = state.asked.every(sign => state.answers[sign] === true);
             if (allYes) {
                 renderPlaisantinEnd("hypochondriac");
                 return true; // On stoppe le jeu
             }
         
             return false; // On continue le jeu normalement
         }
         
         function renderPlaisantinEnd(type) {
             setDocTitle("Diagnostic Surprise");
             window.scrollTo(0,0);
             const app = q('#app'); app.innerHTML = '';
             const card = document.createElement('div'); card.className = 'card center';
             
             // On joue un petit son si possible
             playSound(type === "healthy" ? 'success' : 'error');
         
             if (type === "healthy") {
                 // Cas : 15 NON d'affilée
                 card.innerHTML = `
                     <div class="icon-lg color-success"><i class="ph-duotone ph-person-simple-walk"></i></div>
                     <h2 style="color:var(--success)">Diagnostic : Touriste !</h2>
                     <p style="margin-top:15px; font-weight:bold;">Ce patient n'a RIEN.</p>
                     <p class="small" style="margin-top:10px; line-height:1.6;">
                         Après 12 questions négatives, il semblerait que ce patient se soit juste perdu dans l'hôpital en cherchant la machine à café.<br>
                         Rentrez chez vous, vous êtes en parfaite santé !
                     </p>
                 `;
             } else {
                 // Cas : 15 OUI d'affilée
                 card.innerHTML = `
                     <div class="icon-lg color-ruby"><i class="ph-duotone ph-mask-happy"></i></div>
                     <h2 style="color:var(--ruby)">Diagnostic : Malade Imaginaire</h2>
                     <p style="margin-top:15px; font-weight:bold;">Syndrome de l'Hypocondriaque Massif</p>
                     <p class="small" style="margin-top:10px; line-height:1.6;">
                         Le patient a TOUS les symptômes. Statistiquement, il devrait avoir explosé il y a 10 minutes.<br>
                         Appelez Dr House, ou un psychiatre, c'est au choix.
                     </p>
                 `;
             }
         
             const btn = document.createElement('button');
             btn.className = 'btn'; 
             btn.innerHTML = '<i class="ph-duotone ph-arrow-counter-clockwise"></i> Recommencer sérieusement';
             btn.style.marginTop = "20px";
             btn.onclick = () => { 
                 state.dailyTarget = null; 
                 renderDemographics(); 
             };
             
             card.appendChild(btn);
             app.appendChild(card);
         }

// === NOUVELLE FONCTION : Sélection manuelle de pathologie ===
function showManualPathologySelection(reason) {
    setDocTitle("Quelle pathologie ?");
    window.scrollTo(0,0);
    const app = q('#app'); 
    app.innerHTML = '';
    
    const card = document.createElement('div'); 
    card.className='card center';
    
    if(reason === "incorrect_diagnosis") {
        card.innerHTML = `
            <h2 style="color:var(--error)">
                <i class="ph-duotone ph-magnifying-glass"></i> 
                L'IA s'est trompée ?
            </h2>
            <p class="small" style="margin-bottom:20px">
                Sélectionnez la pathologie à laquelle vous pensiez vraiment.
            </p>
        `;
    } else {
        card.innerHTML = `
            <h2><i class="ph-duotone ph-book-open"></i> Abandon du cas</h2>
            <p class="small" style="margin-bottom:20px">
                Vous arrêtez le cas clinique en cours.
            </p>
        `;
    }
    
    const btnHome = document.createElement('button'); 
    btnHome.className='btn'; 
    btnHome.innerHTML='<i class="ph-duotone ph-house"></i> Retour Accueil';
    btnHome.onclick = renderHome;
    card.appendChild(btnHome);
    
    const divSearch = document.createElement('div');
    divSearch.style.marginTop = '30px'; 
    divSearch.style.width = '100%';
    divSearch.style.borderTop = '1px solid var(--glass-border)';
    divSearch.style.paddingTop = '20px';
    
    divSearch.innerHTML = `
        <p style="margin-bottom:10px; color:var(--accent); font-weight:600;">
            <i class="ph-duotone ph-lightbulb"></i> 
            Je pensais à une pathologie précise :
        </p>
    `;
    
    const select = document.createElement('select'); 
    select.className = 'input';
    select.innerHTML = '<option value="">-- Choisir la pathologie --</option>';
    
    [...PATHOLOGIES].sort((a,b) => a.name.localeCompare(b.name)).forEach(p => {
        select.innerHTML += `<option value="${p.name}">${p.name}</option>`;
    });
    
    select.onchange = async () => {
    if(!select.value) return;
    const patho = PATHOLOGIES.find(p => p.name === select.value);
    
    state.progression.incorrect++;
    state.progression.streak = 0;
    
    // Historique quotidien
    const todayKey = getLocalDayKey();
    if(!state.progression.dailyHistory) state.progression.dailyHistory = {};
    if(!state.progression.dailyHistory[todayKey]) {
        state.progression.dailyHistory[todayKey] = { success: [], fail: [] };
    }
    state.progression.dailyHistory[todayKey].fail.push({ 
        name: patho.name, 
        time: Date.now() 
    });
    
    // Mise à jour mastery
    if(!state.progression.mastery) state.progression.mastery = {};
    let m = state.progression.mastery[patho.name];
    if(!m) m = { success: 0, failures: 0, missedSigns: {} };
    if(typeof m === 'number') m = { success: m, failures: 0, missedSigns: {} };
    m.failures++;
    state.progression.mastery[patho.name] = m;
    
    // Log des erreurs
    if(!state.progression.errorLog) state.progression.errorLog = {};
    state.progression.errorLog[patho.name] = { 
        date: Date.now(), 
        count: (state.progression.errorLog[patho.name]?.count || 0) + 1 
    };
    
    // ✅ SAUVEGARDE IMMÉDIATE
    await saveProgression();
    
    showDiagnosticDetails({patho: patho}, true); 
};
    
    divSearch.appendChild(select);
    card.appendChild(divSearch);
    app.appendChild(card);
}
         
         function renderCurrentQuestion() {
    setDocTitle(`Question ${state.asked.length}`);
    window.scrollTo(0,0);
    const app = q('#app'); 
    app.innerHTML='';
    const card = document.createElement('div'); 
    card.className='card center';
    const signe = state.currentSign;
    const questionTitle = state.confirmationMode ? `<span style="color:var(--gold)"><i class="ph-duotone ph-brain"></i> Je pense avoir une piste...</span>` : `QUESTION ${state.asked.length}`;
    
    let prob = 0;
    if(state.ranked.length > 0) prob = parseFloat(state.ranked[0].prob);

    const imgUrl = GLOBAL_IMG_MAP[signe];
    const imgHTML = imgUrl ? `
        <div style="width:100%; max-width:500px; margin:0 auto 20px auto;">
            <img src="${imgUrl}" alt="Image" style="width:100%; border-radius:12px; border:2px solid var(--glass-border);">
        </div>` : '';

    // --- DÉBUT MODIFICATION : On prépare le Timer ---
    let timerHTML = '';
    
    // Si le mode Chrono est activé, on prépare la boîte HTML (vide pour l'instant)
    if (state.isChrono && state.startTime) {
        // ON CALCULE LE TEMPS TOUT DE SUITE (pour ne pas afficher 00:00)
        const now = Date.now();
        const diff = Math.floor((now - state.startTime) / 1000);
        const m = Math.floor(diff / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');

        timerHTML = `<div id="liveTimerDisplay" class="timer-display"><i class="ph-bold ph-clock"></i> ${m}:${s}</div>`;
    }
    // -----------------------------------------------

    card.innerHTML = `
        ${timerHTML}  <div class="ai-progress-container">
            <div class="ai-progress-bar" style="width:${prob}%"></div>
        </div>
        
        <div class="ai-progress-label">Confiance IA : ${prob}%</div>
        <div class="small" style="margin-bottom:12px; color:var(--accent)">${questionTitle}</div>
        
        ${imgHTML}
        
        <div class="question-text">Le patient présente-t-il :<br><strong style="font-size:1.2em; color:var(--text-main);">${formatSigneName(signe)}</strong> ?</div>`;

    // --- IMPORTANT : On lance le chronomètre juste après l'affichage ---
    if (state.isChrono) {
        setTimeout(startLiveTimer, 100); 
    }    
    // ==========================================
// AFFICHAGE CONDITIONNEL SELON LE MODE
// ==========================================

if (state.useLLM) {
    // ========== MODE IA UNIQUEMENT ==========
    const chatContainer = document.createElement('div');
    chatContainer.style.cssText = "margin: 20px 0; padding: 20px; background: rgba(102,126,234,0.1); border-radius: 16px; border: 2px solid rgba(102,126,234,0.3);";
    
    chatContainer.innerHTML = `
        <div style="font-size: 0.9em; margin-bottom: 12px; color: var(--accent); font-weight:bold; text-transform:uppercase; letter-spacing:1.5px; text-align:center;">
            <i class="ph-duotone ph-brain"></i> Répondez librement à l'IA
        </div>
        <div style="display: flex; gap: 10px;">
            <input type="text" id="aiInput" class="input" placeholder="Ex: Oui, j'ai une douleur qui serre..." style="margin:0; flex:1; font-size:16px;">
            <button id="aiSendBtn" class="btn" style="width: auto; padding: 0 20px; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);"><i class="ph-bold ph-paper-plane-right"></i></button>
        </div>
        <div id="aiLoader" style="display:none; font-size: 0.85em; color: var(--text-muted); margin-top: 12px; text-align: center;">
            <i class="ph-bold ph-spinner ph-spin"></i> Analyse IA en cours...
        </div>
    `;

    setTimeout(() => {
        const inputField = document.getElementById('aiInput');
        const sendBtn = document.getElementById('aiSendBtn');
        const loader = document.getElementById('aiLoader');

        const handleAiSubmit = async () => {
            const text = inputField.value.trim();
            if (!text) return;

            inputField.disabled = true;
            sendBtn.disabled = true;
            loader.style.display = 'block';

            const result = await analyzeResponseWithLLM(text, state.currentSign);

            loader.style.display = 'none';
            inputField.disabled = false;
            sendBtn.disabled = false;
            inputField.value = '';
            inputField.focus();

            if (result === true) {
                state.history.push(JSON.stringify({
                    answers: state.answers, asked: state.asked, currentSign: state.currentSign,
                    confirmationMode: state.confirmationMode, confirmationQueue: state.confirmationQueue,
                    confirmedPatho: state.confirmedPatho, priorityQueue: state.priorityQueue,
                    isChrono: state.isChrono, startTime: state.startTime, dailyTarget: state.dailyTarget
                }));
                state.answers[state.currentSign] = true;
                
                if (REFINEMENTS[state.currentSign]) {
                    let shuffled = [...REFINEMENTS[state.currentSign]].sort(() => Math.random() - 0.5);
                    state.priorityQueue.push(...shuffled);
                }
                
                showAlert(`✅ L'IA a compris : OUI`, "success");
                askNextQuestion();
            } 
            else if (result === false) {
                state.history.push(JSON.stringify({
                    answers: state.answers, asked: state.asked, currentSign: state.currentSign,
                    confirmationMode: state.confirmationMode, confirmationQueue: state.confirmationQueue,
                    confirmedPatho: state.confirmedPatho, priorityQueue: state.priorityQueue,
                    isChrono: state.isChrono, startTime: state.startTime, dailyTarget: state.dailyTarget
                }));
                state.answers[state.currentSign] = false;
                
                showAlert(`❌ L'IA a compris : NON`, "error");
                askNextQuestion();
            } 
            else {
                showAlert(`🤔 Réponse ambiguë. Reformulez (ex: "Oui" ou "Non, pas du tout")`, "error");
            }
        };

        sendBtn.onclick = handleAiSubmit;
        inputField.onkeydown = (e) => { if(e.key === 'Enter') handleAiSubmit(); };
    }, 50);

    card.appendChild(chatContainer);

} else {
    // ========== MODE QUESTIONS CLASSIQUE ==========
    const btnGroup = document.createElement('div'); 
    btnGroup.className = 'button-group';

    const btnOui = document.createElement('button');
    btnOui.className = 'btn btn-success';
    btnOui.innerHTML = '<i class="ph-bold ph-check"></i> OUI';
    btnOui.onclick = () => {
        state.history.push(JSON.stringify({
            answers: state.answers, asked: state.asked, currentSign: state.currentSign,
            confirmationMode: state.confirmationMode, confirmationQueue: state.confirmationQueue,
            confirmedPatho: state.confirmedPatho, priorityQueue: state.priorityQueue,
            isChrono: state.isChrono, startTime: state.startTime, dailyTarget: state.dailyTarget
        }));
        state.answers[signe] = true;
        if (REFINEMENTS[signe]) {
            let shuffled = [...REFINEMENTS[signe]].sort(() => Math.random() - 0.5);
            state.priorityQueue.push(...shuffled);
        }
        askNextQuestion();
    };
    btnGroup.appendChild(btnOui);

    const addOtherBtn = (txt, cls, val) => {
        const b = document.createElement('button');
        b.className = cls; b.innerHTML = txt;
        b.onclick = () => {
            state.history.push(JSON.stringify({
                answers: state.answers, asked: state.asked, currentSign: state.currentSign,
                confirmationMode: state.confirmationMode, confirmationQueue: state.confirmationQueue,
                confirmedPatho: state.confirmedPatho, priorityQueue: state.priorityQueue,
                isChrono: state.isChrono, startTime: state.startTime, dailyTarget: state.dailyTarget
            }));
            state.answers[signe] = val;
            askNextQuestion();
        };
        btnGroup.appendChild(b);
    };

    addOtherBtn('<i class="ph-bold ph-x"></i> NON', 'btn btn-error', false);
    addOtherBtn('Je ne sais pas', 'link', null);
    
    card.appendChild(btnGroup);
}

    const navGroup = document.createElement('div'); 
    navGroup.style.display = 'flex'; navGroup.style.gap = '15px'; navGroup.style.marginTop = '20px';
    
    if(state.history.length > 0) {
        const btnBack = document.createElement('button'); 
        btnBack.className='btn-back'; btnBack.innerHTML='<i class="ph-duotone ph-caret-left"></i> Retour';
        btnBack.onclick = () => {
            const prevState = JSON.parse(state.history.pop());
            Object.assign(state, prevState);
            renderCurrentQuestion();
        };
        navGroup.appendChild(btnBack);
    }
    
    const btnAb = document.createElement('button'); 
    btnAb.className='link'; btnAb.innerHTML='Abandonner'; 
    btnAb.onclick = () => {
        if(state.isGuest) { showAlert("Action limitée en mode invité.", "error"); return; }
        renderAbandonMenu();
    };
    navGroup.appendChild(btnAb); 
    card.appendChild(navGroup);
    app.appendChild(card);
}

function startConfirmationPhase(targetPatho) {
    state.confirmationMode = true;
    state.confirmationQueue = [];

    const pSigns = Object.keys(targetPatho.signes);
    const unaskedSigns = pSigns.filter(s => !state.asked.includes(s));

    // --- 1. La Preuve Finale (Examens ou signes pathognomoniques) ---
    let potentialProofs = [];
    
    if (targetPatho.paraclinique) {
        const exams = unaskedSigns.filter(s => 
            targetPatho.paraclinique.includes(s) && targetPatho.signes[s] >= 40
        );
        potentialProofs.push(...exams);
    }
    
    if (potentialProofs.length === 0 && targetPatho.boost) {
        const boosts = unaskedSigns.filter(s => 
            targetPatho.boost.includes(s) && targetPatho.signes[s] >= 30
        );
        potentialProofs.push(...boosts);
    }

    let proofSign = null;
    if (potentialProofs.length > 0) {
        proofSign = potentialProofs.sort(() => 0.5 - Math.random())[0];
    }

    // --- 2. TOUS les Vrais Signes Cliniques restants (sauf la preuve finale) ---
    const realSigns = unaskedSigns
        .filter(s => s !== proofSign && targetPatho.signes[s] >= 10)
        .sort((a, b) => targetPatho.signes[b] - targetPatho.signes[a]); // Tri par poids décroissant
    
    const nbRealSigns = realSigns.length;

    // --- 3. Autant de Pièges que de Vrais Signes (Diagnostic Différentiel du Top 2-5) ---
    const competitors = state.ranked.slice(1, 5); // Top 2, 3, 4, 5
    let trapSigns = [];

    competitors.forEach(comp => {
        const compSigns = Object.keys(comp.patho.signes).filter(s =>
            !pSigns.includes(s) && // Pas un signe de la bonne maladie
            !state.asked.includes(s) &&
            comp.patho.signes[s] >= 15 // Signe significatif chez le concurrent
        );
        trapSigns.push(...compSigns);
    });

    // On mélange les pièges et on en prend exactement nbRealSigns
    trapSigns.sort(() => 0.5 - Math.random());
    const selectedTraps = trapSigns.slice(0, nbRealSigns);

    // --- 4. Construction de la file : TOUS les vrais + autant de faux, mélangés ---
    let confirmationSigns = [...realSigns, ...selectedTraps];
    
    // Mélange aléatoire TOTAL (pas de pattern prévisible)
    confirmationSigns.sort(() => 0.5 - Math.random());
    
    state.confirmationQueue = confirmationSigns;

    // --- 5. La PREUVE toujours à la toute fin (Boss Final) ---
    if (proofSign) {
        state.confirmationQueue.push(proofSign);
    }

    console.log("✅ Phase confirmation :", state.confirmationQueue);
    console.log(`   - Vrais signes (${nbRealSigns}) :`, realSigns);
    console.log(`   - Pièges (${selectedTraps.length}) :`, selectedTraps);
    console.log("   - Preuve finale :", proofSign);

    askNextQuestion();
}

         // ========================================
// NOUVELLES FONCTIONS POUR CHEFS DE FILE
// ========================================

// Choisir le premier chef de file selon le terrain du patient
function getBestLeaderFromTerrain() {
    // Terrain Cardio (Tabac, Diabète, HTA...)
    if (state.demo.tabac || state.demo.diabete || state.demo.hta || state.demo.homme_age || state.demo.metabolique) {
        return "douleur_thoracique";
    }
    // Terrain Infectieux (Fièvre, Voyage...)
    if (state.demo.fievre || state.demo.voyage || state.demo.hiver || state.demo.epidemie) {
        return "fievre";
    }
    // Terrain Gynéco (Femme + Grossesse)
    if (state.demo.femme && (state.demo.grossesse || state.demo.sterilet)) {
        return "douleur_abdominale";
    }
    // Terrain Digestif
    if (state.demo.alcool || state.demo.medicaments) {
        return "douleur_abdominale";
    }
    // Terrain Pulmonaire
    if (state.demo.tabac || state.demo.fumeur) {
        return "dyspnee";
    }
    // Terrain Urinaire
    if (state.demo.femme) {
        return "genes_urinaires";
    }
    // Terrain Neuro
    if (state.demo.senior || state.demo.trauma) {
        return "troubles_neuro";
    }
    
    // Par défaut : le plus fréquent
    return "douleur_thoracique";
}

// Trouver le prochain chef de file non posé
function getNextUnaskedLeader() {
    return GENERAL_SYMPTOMS.find(s => !state.asked.includes(s));
}

// Trouver les chefs de file qui peuvent coexister avec ceux déjà validés
function getCompatibleLeaders(validatedLeaders) {
    const compatible = new Set();
    
    // Pour chaque pathologie dans la base de données
    PATHOLOGIES.forEach(patho => {
        // Est-ce que cette pathologie contient TOUS les chefs de file validés ?
        const hasAll = validatedLeaders.every(leader => patho.signes[leader]);
        
        if (hasAll) {
            // Si oui, ajouter ses autres chefs de file à la liste des compatibles
            GENERAL_SYMPTOMS.forEach(gen => {
                if (patho.signes[gen] && !validatedLeaders.includes(gen)) {
                    compatible.add(gen);
                }
            });
        }
    });
    
    return Array.from(compatible);
}

// Trouver une question aléatoire qui n'est PAS un chef de file
function getRandomNonLeaderSign() {
    const nonLeaders = state.allSigns.filter(s => 
        !GENERAL_SYMPTOMS.includes(s) && !state.asked.includes(s)
    );
    
    if (nonLeaders.length === 0) return null;
    return nonLeaders[Math.floor(Math.random() * nonLeaders.length)];
}

// Logique principale pour poser les chefs de file intelligemment
function askNextSmartLeader() {
    // Récupérer les chefs de file déjà posés
    const askedLeaders = state.asked.filter(s => GENERAL_SYMPTOMS.includes(s));
    
    // Récupérer ceux qui ont été validés (réponse OUI)
    const validatedLeaders = askedLeaders.filter(s => state.answers[s] === true);
    
    // CAS 1 : Aucun chef de file validé ET on en a posé moins de 11
    if (validatedLeaders.length === 0 && askedLeaders.length < 11) {
        
        if (askedLeaders.length === 0) {
            // Toute première question → Basée sur le terrain
            const firstLeader = getBestLeaderFromTerrain();
            state.currentSign = firstLeader;
            state.asked.push(firstLeader);
            renderCurrentQuestion();
            return;
        } else {
            // On a déjà posé des chefs de file mais tous NON → poser le suivant
            const nextLeader = getNextUnaskedLeader();
            if (nextLeader) {
                state.currentSign = nextLeader;
                state.asked.push(nextLeader);
                renderCurrentQuestion();
                return;
            } else {
                // Tous les 11 chefs de file ont été posés et tous NON
                // → Dernière question aléatoire avant "Touriste"
                const randomSign = getRandomNonLeaderSign();
                if (randomSign) {
                    state.currentSign = randomSign;
                    state.asked.push(randomSign);
                    renderCurrentQuestion();
                    return;
                } else {
                    // Plus aucune question possible → Touriste
                    renderPlaisantinEnd("healthy");
                    return;
                }
            }
        }
    }
    
    // CAS 2 : Au moins 1 chef de file validé → Logique de compatibilité
    if (validatedLeaders.length > 0) {
        const compatibleLeaders = getCompatibleLeaders(validatedLeaders);
        const unaskedCompatible = compatibleLeaders.filter(l => !state.asked.includes(l));
        
        if (unaskedCompatible.length > 0) {
            // Poser un chef de file compatible
            state.currentSign = unaskedCompatible[0];
            state.asked.push(state.currentSign);
            renderCurrentQuestion();
            return;
        }
    }
    
    // CAS 3 : Plus de chefs de file à poser → Passer aux questions détaillées
    // ON NE RAPPELLE PAS askNextQuestion() pour éviter la boucle infinie
    rankPathologies(); 
    if(canShowDiagnostic()) return; 
    
    prepareSigns();
    const remaining = state.allSigns.filter(s => !state.asked.includes(s));
    const signe = getNextSmartSign(state.ranked, remaining);

    if (!signe) {
        const topProb = state.ranked.length > 0 ? parseFloat(state.ranked[0].prob) : 0;
        if (topProb < 5) {
            renderPlaisantinEnd("healthy");
        } else {
            showDiagnostic();
        }
        return;
    }

    state.currentSign = signe; 
    state.asked.push(signe); 
    renderCurrentQuestion();
}
         
         function askNextQuestion() {
    // 1. Vérification "Plaisantin" (Anti-Troll)
    if (checkPlaisantin()) return;

    // 2. Vérification Limite brute (30 questions)
    if (state.asked.length >= 30) { 
        showDiagnostic(); 
        return; 
    }

    // 3. GESTION DE LA CONFIRMATION (PRIORITAIRE)
    if (state.confirmationMode) {
        if (state.confirmationQueue.length > 0) {
            const nextConfSign = state.confirmationQueue.shift();
            
            if (state.asked.includes(nextConfSign)) {
                askNextQuestion();
                return;
            }

            state.currentSign = nextConfSign;
            state.asked.push(nextConfSign);
            renderCurrentQuestion();
            return;
        } else {
            // File de confirmation terminée → Diagnostic
            showDiagnostic();
            return;
        }
    }

    // ========================================
    // NOUVEAU : Gestion intelligente des chefs de file
    // ========================================
    const askedLeaders = state.asked.filter(s => GENERAL_SYMPTOMS.includes(s));
    const validatedLeaders = askedLeaders.filter(s => state.answers[s] === true);
    
    // Si on a posé moins de 11 chefs de file OU aucun n'est validé
    if (askedLeaders.length < 11 || (validatedLeaders.length === 0 && askedLeaders.length < 11)) {
        askNextSmartLeader();
        return;
    }
    // ========================================

    // 4. Moteur Standard (après chefs de file)
    rankPathologies(); 

    // Vérifier si on peut déclencher la confirmation
    if(canShowDiagnostic()) return; 

    prepareSigns();
    const remaining = state.allSigns.filter(s => !state.asked.includes(s));
    
    const signe = getNextSmartSign(state.ranked, remaining);

    if (!signe) {
        const topProb = state.ranked.length > 0 ? parseFloat(state.ranked[0].prob) : 0;
        if (topProb < 5) {
            renderPlaisantinEnd("healthy");
        } else {
            showDiagnostic();
        }
        return;
    }

    state.currentSign = signe; 
    state.asked.push(signe); 
    renderCurrentQuestion();
}
         
                 function showDiagnostic() {
                    if (chronoInterval) clearInterval(chronoInterval); // <--- AJOUTER ICI
    setDocTitle("Analyse...");
    window.scrollTo(0, 0);
    const app = q('#app');
    app.innerHTML = '';

    // Carte de chargement
    const loadingCard = document.createElement('div');
    loadingCard.className = 'card center';
    loadingCard.innerHTML = `<h3 style="color:var(--accent)"><i class="ph-duotone ph-magnifying-glass"></i> Analyse IA en cours...</h3><div style="margin: 30px 0; font-size: 50px; animation: spin 0.8s infinite linear;"><i class="ph-duotone ph-gear"></i></div><p class="small">Comparaison base de données...</p>`;
    app.appendChild(loadingCard);

    setTimeout(async () => {
        rankPathologies();
        // SÉCURITÉ : Vérifier si on a un résultat
        const top = state.ranked.length > 0 ? state.ranked[0] : null;

        if (!top) {
            // Si l'IA ne trouve rien du tout (cas rare), on force une sortie propre
            app.innerHTML = `<div class="card center"><h2 style="color:var(--error)">Aucun diagnostic trouvé</h2><p>L'IA n'a pas pu trancher. Essayez de donner plus de symptômes.</p><button class="btn" onclick="renderHome()">Retour Accueil</button></div>`;
            return;
        }

        state.diagnosticShown = true;
        state.previousDiagnostics.push(top.patho.name);
        setDocTitle(`Diagnostic : ${top.patho.name}`);

        app.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'card center';

        // --- GESTION DU TITRE ET DE L'AFFICHAGE DU DIAGNOSTIC ---
        const title = document.createElement('h2');
        title.innerHTML = '<i class="ph-duotone ph-lightbulb"></i> Diagnostic Proposé';
        card.appendChild(title);

        // Gestion du bouton PDF
        let pdfButton = '';
        if (top.patho.pdf && top.patho.pdf !== '#') {
            if (state.isGuest && !state.isPremiumCode) {
                pdfButton = `<button class="btn" style="background:rgba(125,125,125,0.1); border:1px dashed var(--text-muted); color:var(--text-muted); margin-top:10px; font-size:13px;" onclick="showAlert('Compte requis pour le PDF', 'error')"><i class="ph-duotone ph-lock-key"></i> Fiche PDF (Verrouillée)</button>`;
            } else {
                pdfButton = `<a class="link" style="color:var(--accent); border-color:var(--accent); display:inline-block; margin-top:10px;" href="${top.patho.pdf}" target="_blank" onclick="trackPdf()"><i class="ph-duotone ph-file-pdf"></i> Voir fiche PDF de révision</a>`;
            }
        } else {
            pdfButton = `<span class="small" style="opacity:0.5"><i class="ph-duotone ph-file-x"></i> Pas de fiche PDF</span>`;
        }

        const diagDiv = document.createElement('div');
        diagDiv.className = 'diagnostic-result';
        diagDiv.innerHTML = `
            <div class="diagnostic-name">${top.patho.name}</div>
            <div class="patho-desc" style="margin-top:8px">${top.patho.short}</div>
            <br>${pdfButton}
        `;
        card.appendChild(diagDiv);

        // ============================================================
        // 🚦 LOGIQUE DE VALIDATION
        // ============================================================
        const btnGroup = document.createElement('div');
        btnGroup.className = 'button-group';

        // --- CAS 1 : MODE EXAMEN (AUTOMATIQUE) ---
        // --- CAS 1 : MODE EXAMEN (AUTOMATIQUE) ---
if (state.exam && state.exam.active && state.dailyTarget) {
    const targetName = state.dailyTarget.name;
    const foundName = top.patho.name;
    const isSuccess = (targetName === foundName);

    // ✅ MISE À JOUR DE LA PROGRESSION AVANT D'ENREGISTRER
    if (isSuccess) {
        state.progression.correct++;
        state.progression.streak = (state.progression.streak || 0) + 1;
        
        // Mise à jour mastery
        if(!state.progression.mastery) state.progression.mastery = {};
        let m = state.progression.mastery[targetName];
        if(!m) m = { success: 0, failures: 0, missedSigns: {} };
        if(typeof m === 'number') m = { success: m, failures: 0, missedSigns: {} };
        m.success++;
        state.progression.mastery[targetName] = m;
        
        // Historique quotidien
        const todayKey = getLocalDayKey();
        if(!state.progression.dailyHistory) state.progression.dailyHistory = {};
        if(!state.progression.dailyHistory[todayKey]) {
            state.progression.dailyHistory[todayKey] = { success: [], fail: [] };
        }
        state.progression.dailyHistory[todayKey].success.push({ 
            name: targetName, 
            time: Date.now() 
        });
        
        // Gestion chrono
        if (state.isChrono && state.startTime) {
            const totalSeconds = (Date.now() - state.startTime) / 1000;
            if (totalSeconds < 30) {
                state.progression.speedWins = (state.progression.speedWins || 0) + 1;
            }
            const bestTime = state.progression.bestTimes || {};
            if (!bestTime[targetName] || totalSeconds < bestTime[targetName]) {
                bestTime[targetName] = totalSeconds;
                state.progression.bestTimes = bestTime;
            }
        }
        
    } else {
        state.progression.incorrect++;
        state.progression.streak = 0;
        
        // Mise à jour mastery (échec)
        if(!state.progression.mastery) state.progression.mastery = {};
        let m = state.progression.mastery[targetName];
        if(!m) m = { success: 0, failures: 0, missedSigns: {} };
        if(typeof m === 'number') m = { success: m, failures: 0, missedSigns: {} };
        m.failures++;
        state.progression.mastery[targetName] = m;
        
        // Historique quotidien
        const todayKey = getLocalDayKey();
        if(!state.progression.dailyHistory) state.progression.dailyHistory = {};
        if(!state.progression.dailyHistory[todayKey]) {
            state.progression.dailyHistory[todayKey] = { success: [], fail: [] };
        }
        state.progression.dailyHistory[todayKey].fail.push({ 
            name: targetName, 
            time: Date.now() 
        });
    }
    
    // ✅ SAUVEGARDE IMMÉDIATE
    await saveProgression();

    // Enregistrement dans state.exam.results (APRÈS la sauvegarde)
    const currentResultIndex = state.exam.results.length;
    if (currentResultIndex === state.exam.currentIndex) {
        state.exam.results.push({
            target: targetName,
            found: foundName,
            success: isSuccess,
            questions: state.asked.length
        });
    }

    // Affichage du résultat automatique
    const resultBanner = document.createElement('div');
    resultBanner.style.width = "100%";
    resultBanner.style.padding = "15px";
    resultBanner.style.borderRadius = "12px";
    resultBanner.style.marginTop = "20px";
    resultBanner.style.marginBottom = "20px";
    resultBanner.style.textAlign = "center";
    resultBanner.style.fontWeight = "bold";

    if (isSuccess) {
        playSound('success');
        triggerConfetti();
        resultBanner.style.background = "rgba(0, 255, 157, 0.15)";
        resultBanner.style.border = "1px solid var(--success)";
        resultBanner.style.color = "var(--success)";
        resultBanner.innerHTML = `
            <div style="font-size:2em; margin-bottom:10px;"><i class="ph-fill ph-check-circle"></i></div>
            <div>DIAGNOSTIC CORRECT</div>
            <div class="small" style="opacity:0.8; font-weight:normal;">L'IA a bien trouvé la pathologie cible.</div>
        `;
    } else {
        playSound('error');
        resultBanner.style.background = "rgba(255, 77, 77, 0.15)";
        resultBanner.style.border = "1px solid var(--error)";
        resultBanner.style.color = "var(--error)";
        resultBanner.innerHTML = `
            <div style="font-size:2em; margin-bottom:10px;"><i class="ph-fill ph-x-circle"></i></div>
            <div>DIAGNOSTIC INCORRECT</div>
            <div class="small" style="opacity:0.8; font-weight:normal; margin-top:5px;">
                L'IA a proposé : <strong>${foundName}</strong><br>
                Il fallait faire deviner : <strong>${targetName}</strong>
            </div>
        `;
    }
    
    card.appendChild(resultBanner);
            // ---------------------

            // Bouton "Suivant"
            const isLast = state.exam.currentIndex + 1 >= state.exam.queue.length;
            const btnNext = document.createElement('button');
            btnNext.className = 'btn';
            btnNext.innerHTML = isLast 
                ? '<i class="ph-bold ph-chart-line"></i> Voir les résultats finaux' 
                : '<i class="ph-bold ph-arrow-right"></i> Cas Suivant';
            
            btnNext.onclick = () => {
                state.exam.currentIndex++;
                playNextExamCase();
            };
            btnGroup.appendChild(btnNext);

        }
        // --- CAS 2 : MODE STANDARD / ENTRAÎNEMENT (MANUEL) ---
        else {
            // 1. On calcule le temps final ICI
            let finalTimeStr = "";
            if(state.isChrono && state.startTime) {
                if (chronoInterval) clearInterval(chronoInterval); // On stoppe le moteur
                const totalSeconds = Math.floor((Date.now() - state.startTime) / 1000);
                const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
                const s = (totalSeconds % 60).toString().padStart(2, '0');
                finalTimeStr = `<div style="font-size:1.1rem; color:var(--text-main); margin-top:5px; font-weight:bold;"><i class="ph-bold ph-timer"></i> Temps : ${m}:${s}</div>`;
            }

            const btnTrue = document.createElement('button');
            btnTrue.className = 'btn btn-success';
            btnTrue.innerHTML = '<i class="ph-bold ph-check"></i> Correct';
            btnTrue.onclick = async () => {
    if (state.isGuest) { 
        localStorage.setItem('medicome_guest_last_play', Date.now().toString()); 
    }
    
    triggerConfetti(); 
    playSound('success');
    state.progression.correct++; 
    state.progression.streak = (state.progression.streak || 0) + 1;
    
    // Mise à jour mastery
    if(!state.progression.mastery) state.progression.mastery = {};
    let m = state.progression.mastery[top.patho.name];
    if(!m) m = { success: 0, failures: 0, missedSigns: {} };
    if(typeof m === 'number') m = { success: m, failures: 0, missedSigns: {} };
    m.success++;
    state.progression.mastery[top.patho.name] = m;
    
    // Historique quotidien
    const todayKey = getLocalDayKey();
    if(!state.progression.dailyHistory) state.progression.dailyHistory = {};
    if(!state.progression.dailyHistory[todayKey]) {
        state.progression.dailyHistory[todayKey] = { success: [], fail: [] };
    }
    state.progression.dailyHistory[todayKey].success.push({ 
        name: top.patho.name, 
        time: Date.now() 
    });
    
    // Gestion chrono
    let finalTimeStr = "";
    if(state.isChrono && state.startTime) {
        if (chronoInterval) clearInterval(chronoInterval);
        const totalSeconds = (Date.now() - state.startTime) / 1000;
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
        finalTimeStr = `<div style="font-size:1.1rem; color:var(--text-main); margin-top:5px; font-weight:bold;"><i class="ph-bold ph-timer"></i> Temps : ${m}:${s}</div>`;
        
        if (totalSeconds < 30) {
            state.progression.speedWins = (state.progression.speedWins || 0) + 1;
        }
        const bestTime = state.progression.bestTimes || {};
        if (!bestTime[top.patho.name] || totalSeconds < bestTime[top.patho.name]) {
            bestTime[top.patho.name] = totalSeconds;
            state.progression.bestTimes = bestTime;
        }
    }
    
    // Défi du jour
    if (state.dailyTarget) {
        const todayStr = new Date().toDateString();
        state.progression.lastDaily = todayStr;
        state.progression.dailyStreak = (state.progression.dailyStreak || 0) + 1;
    }
    
    // ✅ SAUVEGARDE IMMÉDIATE
    await saveProgression();
    
    showAlert(`<i class="ph-duotone ph-check-circle"></i> Diagnostic validé !<br>${finalTimeStr}`, 'success');
    showDiagnosticDetails({ patho: top.patho });
};

            const btnFalse = document.createElement('button');
            btnFalse.className = 'btn btn-error';
            btnFalse.innerHTML = '<i class="ph-bold ph-x"></i> Incorrect';
            btnFalse.onclick = async () => {
                playSound('error');
                showManualPathologySelection("incorrect_diagnosis");
            };

            // === AJOUT VISUEL : AFFICHER LE TEMPS DANS LA CARTE AVANT DE CLIQUER ===
            if(finalTimeStr) {
                const timeDiv = document.createElement('div');
                timeDiv.innerHTML = finalTimeStr;
                timeDiv.style.marginBottom = "15px";
                timeDiv.style.textAlign = "center";
                timeDiv.style.background = "rgba(0, 210, 255, 0.1)";
                timeDiv.style.padding = "10px";
                timeDiv.style.borderRadius = "8px";
                timeDiv.style.border = "1px solid var(--accent)";
                card.appendChild(timeDiv);
            }
            // =======================================================================

            btnGroup.appendChild(btnTrue);
            btnGroup.appendChild(btnFalse);
        }

        card.appendChild(btnGroup);
        app.appendChild(card);

    }, 1500); 
}
         
         
         function showDiagnosticDetails(data, wasManualError = false) {
            if (chronoInterval) clearInterval(chronoInterval);
    // --- CORRECTIF SÉCURITÉ ---
    // Si pour une raison quelconque, la pathologie est introuvable, on arrête tout pour éviter le crash.
    if (!data || !data.patho) {
        console.error("Erreur : Aucune pathologie transmise à l'affichage des détails.");
        return;
    }
    // --------------------------

    window.scrollTo(0, 0);
    const top = data.patho;
    setDocTitle(top.name);
    const app = q('#app');
    app.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'card';

    // ... (Le reste de la fonction reste identique, je ne remets pas tout pour ne pas surcharger)
    // Mais assure-toi de garder tout le code qui est en dessous de "const card = ..." jusqu'à la fermeture de la fonction "}".
    
    if (wasManualError) {
        card.innerHTML = `
            <h2 style="color:var(--error)">
                <i class="ph-duotone ph-x-circle"></i> 
                C'était : ${top.name}
            </h2>
            <div class="alert alert-error" style="margin-top:15px;">
                <i class="ph-bold ph-warning"></i> 
                Analysons tes erreurs pour que tu progresses !
            </div>
        `;
        
        if(!state.progression.mastery) state.progression.mastery = {};
        let m = state.progression.mastery[top.name];
        if(!m) m = { success: 0, failures: 0, missedSigns: {} };
        if(typeof m === 'number') m = { success: m, failures: 0, missedSigns: {} };
        m.failures++;
        
        Object.keys(top.signes).forEach(s => {
             if(state.answers[s] === false || state.answers[s] === null) { 
                 if(!m.missedSigns[s]) m.missedSigns[s] = 0;
                 m.missedSigns[s]++;
             }
        });
        
        Object.keys(state.answers).forEach(s => {
             if (state.answers[s] === true && !top.signes[s]) {
                 if(!m.missedSigns[s]) m.missedSigns[s] = 0;
                 m.missedSigns[s]++;
             }
        });

        state.progression.mastery[top.name] = m;
        
        if(!state.progression.errorLog) state.progression.errorLog = {};
        state.progression.errorLog[top.name] = { date: Date.now(), count: (state.progression.errorLog[top.name]?.count || 0) + 1 };
        
        saveProgression();
    } else {
        card.innerHTML = `
            <h2>
                <i class="ph-duotone ph-check-circle color-success"></i> 
                Bravo ! C'est bien : ${top.name}
            </h2>
        `;
    }

    const desc = document.createElement('div');
    desc.className = 'patho-desc';
    desc.textContent = top.short;
    desc.style.marginBottom = '20px';
    desc.style.textAlign = 'center';
    card.appendChild(desc);

    if (top.signes) {
        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'result-list';

        const goodSigns = Object.keys(state.answers).filter(s => 
            state.answers[s] === true && top.signes[s]
        );

        const missedSigns = Object.keys(top.signes).filter(s => 
            top.signes[s] >= 10 && 
            state.answers[s] !== true
        );

        const wrongSigns = Object.keys(state.answers).filter(s => 
            state.answers[s] === true && !top.signes[s]
        );

        // SECTION VERTE
        if (goodSigns.length > 0) {
            resultsDiv.innerHTML += `
                <div class="result-section-title" style="color:var(--success)">
                    <i class="ph-bold ph-check"></i> 
                    ✅ Bien vu (${goodSigns.length})
                </div>
            `;
            goodSigns.forEach(s => {
                resultsDiv.innerHTML += `
                    <div class="result-item">
                        <div class="result-label">${formatSigneName(s)}</div>
                        <div class="status-badge badge-correct">+${top.signes[s]} pts</div>
                    </div>
                `;
            });
        }

        // SÉPARER les VRAIES erreurs
        const realMistakes = missedSigns.filter(s => 
            state.answers[s] === false || state.answers[s] === null
        );

        const notAsked = missedSigns.filter(s => 
            state.answers[s] === undefined
        );

        // SECTION ROUGE
        if (realMistakes.length > 0) {
            resultsDiv.innerHTML += `
                <div class="result-section-title" style="color:var(--error); margin-top:15px;">
                    <i class="ph-bold ph-x-circle"></i> 
                    ❌ Signes que tu as RATÉS (${realMistakes.length})
                </div>
                <div class="small" style="text-align:left; margin-bottom:5px; opacity:0.8; padding:0 15px;">
                    Ces signes existaient, mais tu as répondu <strong>NON</strong> ou <strong>JE NE SAIS PAS</strong> :
                </div>
            `;
            
            realMistakes.sort((a,b) => top.signes[b] - top.signes[a]).forEach(s => {
                const userMsg = state.answers[s] === false ? "❌ Tu as dit NON" : "❓ Tu as dit JE NE SAIS PAS";
                
                resultsDiv.innerHTML += `
                    <div class="result-item" style="background:rgba(255,77,77,0.05);">
                        <div class="result-label">
                            ${formatSigneName(s)}
                            <span style="font-size:0.85em; opacity:0.6; margin-left:8px;">
                                (Poids : ${top.signes[s]})
                            </span>
                        </div>
                        <div class="status-badge badge-missing">${userMsg}</div>
                    </div>
                `;
            });
        }

        // SECTION BLEUE
        if (notAsked.length > 0) {
            resultsDiv.innerHTML += `
                <div class="result-section-title" style="color:#6c9bd1; margin-top:15px;">
                    <i class="ph-bold ph-info"></i> 
                    ℹ️ Signes non explorés (${notAsked.length})
                </div>
                <div class="small" style="text-align:left; margin-bottom:5px; opacity:0.8; padding:0 15px;">
                    L'IA n'a pas eu le temps de poser ces questions :
                </div>
            `;
            
            notAsked.sort((a,b) => top.signes[b] - top.signes[a]).forEach(s => {
                resultsDiv.innerHTML += `
                    <div class="result-item" style="opacity:0.7;">
                        <div class="result-label">
                            ${formatSigneName(s)}
                            <span style="font-size:0.85em; opacity:0.6; margin-left:8px;">
                                (Poids : ${top.signes[s]})
                            </span>
                        </div>
                        <div class="status-badge badge-neutral">⏭️ Pas demandé</div>
                    </div>
                `;
            });
        }

        // SECTION ORANGE
        if (wrongSigns.length > 0) {
            resultsDiv.innerHTML += `
                <div class="result-section-title" style="color:orange; margin-top:15px;">
                    <i class="ph-bold ph-prohibit"></i> 
                    🚫 Signes cochés À TORT (${wrongSigns.length})
                </div>
                <div class="small" style="text-align:left; margin-bottom:5px; opacity:0.8; padding:0 15px;">
                    Ces signes n'existent PAS dans "${top.name}" :
                </div>
            `;
            
            wrongSigns.forEach(s => {
                resultsDiv.innerHTML += `
                    <div class="result-item">
                        <div class="result-label">${formatSigneName(s)}</div>
                        <div class="status-badge badge-neutral">❌ Inexistant</div>
                    </div>
                `;
            });
        }

        card.appendChild(resultsDiv);
    }

    let pdfButton = '';
    if (top.pdf && top.pdf !== '#') {
        if (state.isGuest && !state.isPremiumCode) {
            pdfButton = `<button class="btn" style="background:rgba(125,125,125,0.1); border:1px dashed var(--text-muted); color:var(--text-muted); margin-top:10px; font-size:13px;" onclick="showAlert('Compte requis pour le PDF', 'error')"><i class="ph-duotone ph-lock-key"></i> Fiche PDF (Verrouillée)</button>`;
        } else {
            pdfButton = `<a class="link" style="color:var(--accent); border-color:var(--accent); display:inline-block; margin-top:10px;" href="${top.pdf}" target="_blank" onclick="trackPdf()"><i class="ph-duotone ph-file-pdf"></i> Voir fiche PDF de révision</a>`;
        }
        
        const pdfContainer = document.createElement('div');
        pdfContainer.style.textAlign = 'center';
        pdfContainer.style.width = '100%';
        pdfContainer.innerHTML = pdfButton;
        card.appendChild(pdfContainer); 
    } else {
        card.innerHTML += `<div class="small" style="margin-top:10px; opacity:0.5; text-align:center;">Pas de fiche PDF disponible</div>`;
    }

    const btnGroup = document.createElement('div'); 
    btnGroup.className = 'button-group';

    // === MODE EXAMEN ===
    if (state.exam && state.exam.active) {
        const isSuccess = (top.name === state.dailyTarget.name);
        
        if (state.exam.results.length === state.exam.currentIndex) {
            state.exam.results.push({
                target: state.dailyTarget.name,
                found: top.name,
                success: isSuccess,
                questions: state.asked.length
            });
        }
        
        const isLast = state.exam.currentIndex + 1 >= state.exam.queue.length;
        const btnNext = document.createElement('button'); 
        btnNext.className = 'btn';
        btnNext.innerHTML = isLast 
            ? '<i class="ph-bold ph-chart-line"></i> Voir les résultats' 
            : '<i class="ph-bold ph-arrow-right"></i> Cas Suivant';
        
        btnNext.onclick = () => {
            state.exam.currentIndex++;
            playNextExamCase();
        };
        
        btnGroup.appendChild(btnNext);
    } else {
        // === MODE STANDARD ===
        const btnReplay = document.createElement('button'); 
        btnReplay.className = 'btn btn-success'; 
        btnReplay.innerHTML = '<i class="ph-duotone ph-arrow-clockwise"></i> Rejouer';
        btnReplay.onclick = () => { 
            const limit = checkGuestLimit();
            if (!limit.allowed) {
                showAlert(`Mode invité limité !`, "error"); 
                return;
            }
            state.dailyTarget = null; 
            renderDemographics(); 
        };
        
        const btnHome = document.createElement('button'); 
        btnHome.className = 'link'; 
        btnHome.innerHTML = '<i class="ph-duotone ph-house"></i> Accueil';
        btnHome.onclick = renderHome;

        btnGroup.append(btnReplay, btnHome);
    }

    card.appendChild(btnGroup);
    app.appendChild(card);
}
         
         function renderGlossary() {
    // On bloque l'accès seulement si l'utilisateur est un invité ET n'a pas de code Premium
    if (state.isGuest && !state.isPremiumCode) {
        showAlert("Le glossaire est réservé aux membres inscrits ou aux codes partenaires.", "error");
        return;
    }
             setDocTitle("Glossaire");
             window.scrollTo(0,0);
             const app = q('#app'); app.innerHTML='';
             const titleCard = document.createElement('div'); titleCard.className='card center'; titleCard.innerHTML='<h2><i class="ph-duotone ph-book-bookmark"></i> Glossaire</h2>'; 
             const btnBack = document.createElement('button'); btnBack.className='link'; btnBack.innerHTML='<i class="ph-duotone ph-house"></i> Retour';
             btnBack.style.marginBottom='20px'; btnBack.onclick=renderHome;
             titleCard.appendChild(btnBack); app.appendChild(titleCard);
         
             const searchContainer = document.createElement('div'); searchContainer.className = 'search-container';
             const searchInput = document.createElement('input'); searchInput.className = 'search-input'; searchInput.placeholder = 'Rechercher une pathologie (ex: Grippe...)'; searchInput.type = 'text';
             
             const searchIcon = document.createElement('div'); 
             searchIcon.innerHTML = `<svg class="search-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`;
             
             searchContainer.appendChild(searchIcon);
             searchContainer.appendChild(searchInput); 
             app.appendChild(searchContainer);
         
             const wrapper = document.createElement('div'); wrapper.className = 'glossary-wrapper';
             const sidebar = document.createElement('div'); sidebar.className = 'alphabet-sidebar';
             const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
             const sortedPathos = [...PATHOLOGIES].sort((a, b) => a.name.localeCompare(b.name));
             const existingLetters = new Set(sortedPathos.map(p => p.name.charAt(0).toUpperCase()));
             
             alphabet.forEach(letter => {
                 const link = document.createElement('a'); link.textContent = letter; link.className = 'alpha-link';
                 if (existingLetters.has(letter)) {
                     link.href = `#letter-${letter}`;
                     link.onclick = (e) => { e.preventDefault(); const target = document.getElementById(`letter-${letter}`); if(target) target.scrollIntoView({behavior: 'smooth', block: 'start'}); };
                 } else { link.classList.add('disabled'); }
                 sidebar.appendChild(link);
             });
             wrapper.appendChild(sidebar);
         
             const content = document.createElement('div'); content.className = 'glossary-content';
             function renderGrid(pathos, showHeaders = true) {
                 content.innerHTML = '';
                 if(pathos.length === 0) { content.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted)">Aucune pathologie trouvée.</div>'; return; }
                 if(!showHeaders) {
                     const grid = document.createElement('div'); grid.className = 'letter-grid';
                     pathos.forEach(p => { grid.appendChild(createPathoCard(p)); }); content.appendChild(grid);
                 } else {
                     alphabet.forEach(letter => {
                         const letterPathos = pathos.filter(p => p.name.charAt(0).toUpperCase() === letter);
                         if(letterPathos.length > 0) {
                             const letterHeader = document.createElement('div'); letterHeader.className = 'letter-header'; letterHeader.id = `letter-${letter}`; letterHeader.textContent = letter; content.appendChild(letterHeader);
                             const grid = document.createElement('div'); grid.className = 'letter-grid';
                             letterPathos.forEach(p => { grid.appendChild(createPathoCard(p)); }); content.appendChild(grid);
                         }
                     });
                 }
             }
             function createPathoCard(p) {
                 const card = document.createElement('div');
                 card.className = 'patho-card';
         
                 // J'ai supprimé tout le bloc "if (p.images...)" ici
         
                 // J'ai aussi retiré "${imageHTML}" du code ci-dessous
                 card.innerHTML = `
                     <div class="patho-name">${p.name}</div>
                     <div class="patho-desc">${p.short}</div>
                 `;
         
                 // Gestion du clic pour le PDF (inchangé)
                 card.onclick = () => {
                     if(p.pdf && p.pdf !== '#') {
                         trackPdf();
                         window.open(p.pdf,'_blank');
                     } else {
                         showAlert('Fiche PDF non disponible','error');
                     }
                 };
         
                 return card;
             }
             renderGrid(sortedPathos, true);
             searchInput.addEventListener('input', (e) => {
                 const term = e.target.value.toLowerCase();
                 if(term.length > 0) { sidebar.style.display = 'none'; const filtered = sortedPathos.filter(p => p.name.toLowerCase().includes(term)); renderGrid(filtered, false); } 
                 else { sidebar.style.display = 'flex'; renderGrid(sortedPathos, true); }
             });
             wrapper.appendChild(content); app.appendChild(wrapper);
         }
         window.closeLightbox = function() {
    const lb = document.getElementById('lightbox');
    if(lb) {
        lb.style.display = 'none';
        lb.innerHTML = '';
    }
}
         // ============================================================
// ZONE ADMIN : EXPORTATION CSV AVANCÉE
// ============================================================

// 1. COLLE TON UID ICI ENTRE LES GUILLEMETS !
const ADMIN_UID = "Kj5oyJpA4nXLDrjh3YqWCwlXEda2"; 

// Vérifie si c'est toi et affiche le bouton
function checkAdminAccess() {
    // Si l'utilisateur est connecté ET que son ID correspond à l'Admin
    if (state.currentUser && state.currentUser.uid === ADMIN_UID) {
        // On crée le bouton s'il n'existe pas encore
        if (!document.getElementById('btnAdminExport')) {
            const btn = document.createElement('button');
            btn.id = 'btnAdminExport';
            btn.innerHTML = '<i class="ph-duotone ph-file-csv"></i> ADMIN : Suivi Élèves';
            // Style : Bouton rouge flottant en bas à droite
            btn.style.cssText = "position:fixed; bottom:15px; right:15px; background:#e74c3c; color:white; border:none; padding:12px 20px; border-radius:30px; z-index:9999; cursor:pointer; font-weight:bold; box-shadow:0 4px 15px rgba(0,0,0,0.4); font-family:sans-serif; transition:transform 0.2s;";
            
            btn.onmouseover = () => btn.style.transform = "scale(1.05)";
            btn.onmouseout = () => btn.style.transform = "scale(1)";
            btn.onclick = exportUsersToCSV;
            
            document.body.appendChild(btn);
        }
    } else {
        // Si ce n'est pas toi (ou si tu te déconnectes), on enlève le bouton
        const btn = document.getElementById('btnAdminExport');
        if (btn) btn.remove();
    }
}

// La fonction qui génère le fichier Excel
async function exportUsersToCSV() {
    const btn = document.getElementById('btnAdminExport');
    if(btn) btn.innerHTML = '<i class="ph-duotone ph-spinner"></i> Analyse en cours...';

    try {
        // 1. Récupération des données depuis Firebase
        // Seul l'Admin a le droit grâce aux règles de sécurité
        const q = collection(db, "users"); 
        const snapshot = await getDocs(q);

        // 2. Création de l'entête du fichier CSV (Colonnes)
        let csvContent = "data:text/csv;charset=utf-8,";
        // On utilise le point-virgule (;) pour Excel
        csvContent += "Pseudo;Email;Total Cas Joués;Réussites;Échecs;Série (Fidélité);Dernière Connexion;Activité Aujourd'hui;Meilleure Pathologie;Nb Succès;Liste Succès\n";

        // Date du jour pour calculer l'activité quotidienne
        const dateNow = new Date();
        const localDate = new Date(dateNow.getTime() - (dateNow.getTimezoneOffset() * 60000));
        const todayKey = localDate.toISOString().split("T")[0];

        // 3. Analyse de chaque élève
        snapshot.forEach(doc => {
            const data = doc.data();
            const prog = data.progression || {};
            
            // Fonction pour nettoyer le texte (enlève les ; et sauts de ligne)
            const clean = (txt) => (txt || "").toString().replace(/;/g, " ").replace(/\n/g, " ");

            // --- A. Infos de base ---
            const pseudo = clean(data.pseudo || "Anonyme");
            const email = clean(data.email || "Masqué");
            const reussites = prog.correct || 0;
            const echecs = prog.incorrect || 0;
            const total = reussites + echecs;
            const streak = prog.streak || 0;

            let dateStr = "Jamais";
            if (data.lastUpdate && data.lastUpdate.seconds) {
                dateStr = new Date(data.lastUpdate.seconds * 1000).toLocaleDateString();
            }

            // --- B. Activité Aujourd'hui (Combien de cas joués ce jour ?) ---
            let activityToday = 0;
            if (prog.dailyHistory && prog.dailyHistory[todayKey]) {
                const dayData = prog.dailyHistory[todayKey];
                const daySuccess = dayData.success ? dayData.success.length : 0;
                const dayFail = dayData.fail ? dayData.fail.length : 0;
                activityToday = daySuccess + dayFail;
            }

            // --- C. Meilleure Pathologie (Spécialité) ---
            let bestPathoName = "Aucune";
            let bestPathoCount = 0;
            const mastery = prog.mastery || {};
            
            Object.keys(mastery).forEach(key => {
                const m = mastery[key];
                // Parfois c'est juste un nombre, parfois un objet {success: N}
                const count = (typeof m === 'number') ? m : (m.success || 0);
                
                if (count > bestPathoCount) {
                    bestPathoCount = count;
                    bestPathoName = key;
                }
            });
            const bestPathoStr = bestPathoCount > 0 ? `${clean(bestPathoName)} (${bestPathoCount})` : "Rien";

            // --- D. Succès / Trophées ---
            const achList = prog.achievements || [];
            const achCount = achList.length;
            const achDetails = clean(achList.join(" | "));

            // 4. Ajout de la ligne au fichier
            csvContent += `${pseudo};${email};${total};${reussites};${echecs};${streak};${dateStr};${activityToday};${bestPathoStr};${achCount};${achDetails}\n`;
        });

        // 5. Déclenchement du téléchargement
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const timeId = new Date().toLocaleTimeString().replace(/:/g, "h");
        link.setAttribute("download", `Suivi_Medicome_${timeId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if(btn) {
            btn.innerHTML = '<i class="ph-duotone ph-check"></i> Export Réussi !';
            setTimeout(() => btn.innerHTML = '<i class="ph-duotone ph-file-csv"></i> ADMIN : Suivi Élèves', 3000);
        }

    } catch (error) {
        console.error("Erreur Export:", error);
        alert("Erreur : Impossible de récupérer les données.\nVérifiez vos règles Firebase ou votre UID Admin.");
        if(btn) btn.innerHTML = 'Erreur';
    }
}
// ============================================================
// FIN ZONE ADMIN
// ============================================================

    // ============================================================
// PARTIE INTELLIGENCE ARTIFICIELLE (LLM) - INTEGRATION
// ============================================================

let cachedOpenAIKey = null; // Stocke la clé tant que la page est ouverte

async function analyzeResponseWithLLM(userText, symptomContext) {
    // 1. Demander la clé si elle n'est pas encore enregistrée
    if (!cachedOpenAIKey) {
        cachedOpenAIKey = prompt("🔐 Mode IA : Colle ta clé API OpenAI (sk-...) pour activer le chat :");
        if (!cachedOpenAIKey) return null; // Annulation
    }

    // 2. Préparer le prompt pour l'IA
    const promptSysteme = `
    Tu es un moteur de diagnostic médical pour une simulation étudiante.
    Le système vérifie la présence du signe : "${symptomContext}".
    L'étudiant répond : "${userText}".

    Analyse l'intention et réponds UNIQUEMENT via ce JSON :
    {"result": true} -> Si l'étudiant CONFIRME avoir ce symptôme.
    {"result": false} -> Si l'étudiant NIE avoir ce symptôme.
    {"result": null} -> Si la réponse est vague, "je ne sais pas", ou hors sujet.
    `;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${cachedOpenAIKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini", // Modèle rapide et économique
                messages: [{ role: "system", content: promptSysteme }],
                temperature: 0 // Zéro créativité, on veut de la logique pure
            })
        });

        if (!response.ok) {
            if(response.status === 401) alert("Clé API invalide. Recharge la page pour réessayer.");
            throw new Error("Erreur API");
        }

        const data = await response.json();
        // Nettoyage pour garantir le format JSON
        let cleanContent = data.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
        const jsonResponse = JSON.parse(cleanContent);
        
        return jsonResponse.result;

    } catch (error) {
        console.error("Erreur IA:", error);
        return null;
    }
}
         // --- NOUVELLE FONCTION : Analyse le motif de consultation ---
async function analyzeChiefComplaint(userText) {
    // On vérifie la clé API
    if (!cachedOpenAIKey) {
        cachedOpenAIKey = prompt("🔐 Clé OpenAI requise pour l'analyse du motif :");
        if (!cachedOpenAIKey) return null;
    }

    // On donne la liste des symptômes généraux à l'IA pour qu'elle choisisse
    const possibleSymptoms = GENERAL_SYMPTOMS.join(", ");

    const promptSysteme = `
    Tu es un assistant médical pédagogique.
    L'utilisateur (étudiant jouant le patient) décrit son problème principal.
    Ta mission : Associer sa phrase à L'UN des symptômes généraux suivants : [${possibleSymptoms}].
    
    Règles :
    1. Si la phrase correspond clairement à l'un d'eux, renvoie UNIQUEMENT le code du symptôme (ex: "douleur_thoracique").
    2. Si c'est trop vague ou hors sujet, renvoie "null".
    3. Ne renvoie rien d'autre (pas de phrase, juste le code).
    
    Phrase utilisateur : "${userText}"
    `;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${cachedOpenAIKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini", // Modèle rapide
                messages: [{ role: "system", content: promptSysteme }],
                temperature: 0
            })
        });

        const data = await response.json();
        // On nettoie la réponse (enlève les guillemets ou espaces)
        const result = data.choices[0].message.content.trim().replace(/['"]+/g, '');
        
        // Sécurité : est-ce que le résultat est bien dans notre liste connue ?
        if (GENERAL_SYMPTOMS.includes(result)) {
            return result;
        }
        return null;

    } catch (error) {
        console.error("Erreur IA Motif:", error);
        return null;
    }
}
         // --- NOUVELLE FONCTION : Affiche l'écran de départ ---
function renderChiefComplaintInput() {
    setDocTitle("Motif de consultation");
    window.scrollTo(0,0);
    const app = q('#app'); app.innerHTML='';
    
    const card = document.createElement('div'); 
    card.className='card center';
    
    card.innerHTML = `
        <h2><i class="ph-duotone ph-chats-teardrop color-accent"></i> Motif de consultation</h2>
        <p class="small" style="margin-bottom:20px;">Décrivez ce que ressent le patient pour orienter l'interrogatoire.</p>
        
        <div style="background:rgba(102,126,234,0.1); padding:15px; border-radius:12px; margin-bottom:20px; text-align:left;">
            <label style="display:block; margin-bottom:10px; font-weight:bold; color:var(--accent);">
                "Bonjour docteur, qu'est-ce qui vous amène ?"
            </label>
            <textarea id="motifInput" class="input" placeholder="Ex: J'ai une barre dans la poitrine qui serre fort..." style="min-height:80px;"></textarea>
        </div>

        <button id="btnValidateMotif" class="btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <i class="ph-bold ph-paper-plane-right"></i> Envoyer
        </button>
        
        <button id="btnSkipMotif" class="link" style="margin-top:15px; font-size:0.9em; opacity:0.7;">
            Passer (Mode aléatoire classique)
        </button>
    `;
    
    app.appendChild(card);

    // 1. Gestion du clic "Passer" (retour à l'ancien mode paramétrage)
    q('#btnSkipMotif').onclick = () => {
        renderDemographics(); 
    };

    // 2. Gestion de la validation IA
    q('#btnValidateMotif').onclick = async () => {
        const text = q('#motifInput').value;
        if(!text) return;

        const btn = q('#btnValidateMotif');
        btn.innerHTML = '<i class="ph-duotone ph-spinner ph-spin"></i> Analyse...';
        btn.disabled = true;

        // Appel à l'IA
        const detectedSymptom = await analyzeChiefComplaint(text);

        if (detectedSymptom) {
            // BINGO ! On a trouvé un point de départ (ex: douleur_thoracique)
            state.currentSign = detectedSymptom;
            
            // On considère que cette question a été posée et validée
            state.asked = [detectedSymptom]; 
            state.answers[detectedSymptom] = true; 
            
            // On initialise les données démo par défaut (Adulte) pour gagner du temps
            // (Ou tu peux rediriger vers renderDemographics() si tu veux préciser l'âge après)
            state.demo = { adulte: true, homme: true }; 
            
            // On lance directement la suite (les questions pièges)
            showAlert(`🔍 Orientation trouvée : ${formatSigneName(detectedSymptom)}`, "success");
            setTimeout(() => {
                askNextQuestion();
            }, 1000);
            
        } else {
            showAlert("Motif trop vague ou inconnu. On passe au profil classique.", "error");
            setTimeout(renderDemographics, 1500);
        }
    };
}
}
