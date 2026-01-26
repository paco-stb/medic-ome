// ============================================================
// 1. CONFIGURATION & IMPORTS
// ============================================================
// Redirection si lancé depuis GitHub (Sécurité)
if (window.location.hostname.includes("github.io")) { window.location.href = "https://medicome.fr"; }

// Importation des outils Firebase
import { getFirestore, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, collection, query, orderBy, limit, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCig9G4gYHU5h642YV1IZxthYm_IXp6vZU",
    authDomain: "medicome-paco.firebaseapp.com",
    projectId: "medicome-paco",
    storageBucket: "medicome-paco.firebasestorage.app",
    messagingSenderId: "332171806096",
    appId: "1:332171806096:web:36889325196a7a718b5f15",
    measurementId: "G-81HJ9DWBMX"
};

// Initialisation de l'application
let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (error) {
    console.error("Erreur Firebase:", error);
    document.querySelector('#app').innerHTML = `<div class="alert alert-error">Erreur de configuration : ${error.message}</div>`;
}

// ============================================================
// 2. VARIABLES GLOBALES (ÉTAT DU JEU)
// ============================================================

let PATHOLOGIES = [];
let GLOBAL_IMG_MAP = {};
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let chronoInterval = null;
let cachedOpenAIKey = null;

// L'État (State) : Mémoire vive de l'application
let state = {
    currentUser: null,
    pseudo: null,
    useLLM: false,          // Mode IA ou Boutons ?
    isGuest: false,         // Mode Invité ?
    isPremiumCode: false,   // Code VIP ?
    
    // Données de progression
    progression: { 
        correct: 0, incorrect: 0, streak: 0, mastery: {}, 
        dailyStreak: 0, lastDaily: null, achievements: [], 
        bestTimes: {}, errorLog: {}, pdfDownloads: 0, 
        speedWins: 0, socialDone: false, reviewDone: false,
        dailyHistory: {}
    },

    // Partie en cours
    demo: {},               // Profil patient
    currentSign: null,      // Question actuelle
    answers: {},            // Réponses données
    asked: [],              // Questions posées
    allSigns: [],           // Tous les signes possibles
    ranked: [],             // Classement probabilités
    diagnosticShown: false, 
    previousDiagnostics: [],
    history: [],            // Historique pour retour arrière

    // Logique avancée
    confirmationMode: false, 
    confirmationQueue: [], 
    confirmedPatho: null,
    priorityQueue: [],      // File d'attente prioritaire
    
    // Chrono & Examen
    isChrono: false, 
    startTime: null, 
    dailyTarget: null,      // Défi du jour
    exam: {
        active: false, queue: [], results: [], 
        currentIndex: 0, totalTime: 0, config: {}
    }
};

// ============================================================
// 3. DONNÉES MÉDICALES (CONSTANTES)
// ============================================================

const REFINEMENTS = {
    "douleur_thoracique": ["douleur_thoracique_constrictive", "douleur_thoracique_dechirante", "douleur_latero_thoracique_brutale", "douleur_thoracique_respiratoire", "douleur_thoracique_basithoracique", "irradiation_bras_gauche_machoire", "irradiation_dorsale_interscapulaire", "soulage_position_penche_avant", "douleur_thoracique_atypique"],
    "douleur_abdominale": ["douleur_migratrice_epigastre_fid", "douleur_point_mcburney", "douleur_hypocondre_droit", "douleur_epigastrique_transfixiante", "douleur_abdominale_dorsale_brutale", "douleur_fosse_lombaire_brutale", "douleur_fig", "douleur_pelvienne_lateralisee", "douleur_pelvienne_bilaterale", "defense_fid", "contracture_invincible_ventre_bois", "douleur_brutale_hcd", "crampes_abdominales"],
    "toux": ["toux_seche", "toux_grasse", "toux_chronique", "toux_aboyante_rauque", "toux_quinteuse_emetisante", "reprise_inspiratoire_chant_coq", "expectorations_mousseuses_roses", "expectorations_purulentes", "hemoptysie"],
    "dyspnee": ["dyspnee_effort", "dyspnee_brutale", "orthopnee", "dyspnee_expiratoire", "bradypnee_inspiratoire", "dyspnee_sifflante", "freinage_expiratoire", "polypnee"],
    "fievre": ["fievre_elevee", "fievre_moderee", "frissons_intenses", "sueurs_nocturnes", "triade_frissons_chaleur_sueurs", "fievre_retour_voyage"],
    "cephalees": ["cephalee_coup_tonnerre", "cephalees_progressives", "cephalee_unilaterale", "pulsatilite", "raideur_nuque", "photophobie_phonophobie", "cephalees_retro_orbitaires", "cephalees_matinales"],
    "troubles_visuels": ["diplopie", "vision_floue", "baisse_acuite_visuelle_unilaterale", "metamorphopsies", "scotome_central", "phosphenes_eclairs", "myodesopsies_pluie_suie", "vision_halos_colores", "amputation_champ_visuel_peripherique"],
    "troubles_neuro": ["hemiplegie", "aphasie", "perte_connaissance_brutale", "convulsions", "confusion", "tremblement_repos", "rigidite_plastique_roue_dentee", "paralysie_ascendante_symetrique", "paralysie_faciale_centrale"],
    "anomalie_peau": ["ictere", "ictere_cutaneo_muqueux", "purpura_fulminans", "eruption_vesiculeuse_metamerique", "plaques_erythemato_squameuses", "erytheme_migrant_pathognomonique", "tache_vasculaire_saignante", "melanodermie", "eruption_maculo_papuleuse_descendante", "prurit_nocturne"],
    "genes_urinaires": ["brulures_mictionnelles", "hematurie_macroscopique_totale", "urines_troubles_malodorantes", "pollakiurie", "dysurie", "anurie_oligurerie", "globe_vesical_palpable"],
    "douleur_membre_traumatisme": ["impotence_fonctionnelle_totale", "raccourcissement_membre", "rotation_externe_pied", "deformtion_dos_fourchette", "douleur_brutale_intense", "abolition_pouls_distaux", "articulation_rouge_chaude_gonflee", "monoarthrite_gros_orteil"],
    "douleur_dos": ["douleur_lombaire_brutale_effort", "douleur_trajet_membre_inf", "rachialgies_inflammatoires", "impulsivite_toux"],
    "trouble_psy": ["humeur_triste_constante", "idees_suicidaires", "syndrome_delirant_paranoide", "episode_maniaque", "peur_intense_brutale", "dysmorphophobie", "triade_3A"]
};

const GENERAL_SYMPTOMS = [
    "douleur_thoracique", "douleur_abdominale", "douleur_dos", "fievre", "dyspnee", 
    "cephalees", "troubles_neuro", "anomalie_peau", "douleur_membre_traumatisme", 
    "genes_urinaires", "trouble_psy"
];

const PATHO_GROUPS = {
    "Infarctus du myocarde": "Cardio", "Embolie pulmonaire": "Cardio", "OAP (Insuffisance Cardiaque)": "Cardio", "Dissection Aortique": "Cardio", "Péricardite Aiguë": "Cardio", "Fibrillation Atriale": "Cardio", "Endocardite Infectieuse": "Cardio", "Ischémie Aiguë Membre": "Cardio", "Rupture Anévrisme Aorte": "Cardio", "Choc Septique": "Cardio",
    "AVC Ischémique": "Neuro", "Méningite Aiguë": "Neuro", "Hémorragie Méningée": "Neuro", "Crise d'Épilepsie": "Neuro", "Parkinson": "Neuro", "Sclérose en Plaques": "Neuro", "Maladie d'Alzheimer": "Neuro", "Myasthénie": "Neuro", "Hématome Sous-Dural": "Neuro", "Hématome Extra-Dural": "Neuro", "Guillain-Barré": "Neuro",
    "Pneumopathie Franche": "Pneumo", "Pneumothorax": "Pneumo", "Crise d'Asthme": "Pneumo", "Bronchiolite": "Pneumo", "BPCO Exacerbation": "Pneumo", "Cancer Bronchique": "Pneumo", "Tuberculose Pulmonaire": "Pneumo", "Apnée du Sommeil": "Pneumo", "Pleurésie": "Pneumo",
    "Appendicite Aiguë": "Digestif", "Cholécystite Aiguë": "Digestif", "Gastro-entérite": "Digestif", "Occlusion Intestinale": "Digestif", "Pancreatite Aiguë": "Digestif", "Hémorragie Digestive Haute": "Digestif", "Sigmoïdite": "Digestif", "Hernie Inguinale Étranglée": "Digestif", "Reflux Gastro-Oesophagien": "Digestif", "Cirrhose Décompensée": "Digestif", "Cancer Colorectal": "Digestif", "Maladie de Crohn": "Digestif", "Rectocolite Hémorragique": "Digestif", "Ulcère Gastroduodénal": "Digestif", "Hépatite Aiguë": "Digestif", "Lithiase Biliaire": "Digestif", "Hernie Hiatale": "Digestif", "Péritonite": "Digestif", "Ischémie Mésentérique": "Digestif", "Sténose du Pylore": "Digestif", "Invagination Intestinale Aiguë": "Digestif",
    "Colique Néphrétique": "Uro/Nephro", "Pyélonéphrite Aiguë": "Uro/Nephro", "Torsion du Testicule": "Uro/Nephro", "Rétention Aiguë d'Urine": "Uro/Nephro", "Cancer Prostate": "Uro/Nephro", "Tumeur Vessie": "Uro/Nephro", "Insuffisance Rénale Aiguë": "Uro/Nephro", "Syndrome Néphrotique": "Uro/Nephro", "Cystite Aiguë": "Uro/Nephro", "Cancer du Testicule": "Uro/Nephro", "Insuffisance Rénale Chronique": "Uro/Nephro",
    "Grossesse Extra-Utérine": "Gynéco", "Salpingite Aiguë": "Gynéco", "Endométriose": "Gynéco", "Cancer du Sein": "Gynéco", "Pré-éclampsie": "Gynéco", "Fibrome Utérin": "Gynéco", "Kyste Ovarien": "Gynéco", "Mycose Vaginale": "Gynéco", "SOPK": "Gynéco",
    "Érysipèle": "Dermato", "Zona": "Dermato", "Purpura Rhumatoïde": "Dermato", "Varicelle": "Dermato", "Psoriasis": "Dermato", "Mélanome": "Dermato", "Carcinome Basocellulaire": "Dermato", "Gale": "Dermato", "Rougeole": "Dermato", "Syndrome de Kawasaki": "Dermato", "Scarlatine": "Dermato", "Impétigo": "Dermato", "Acné Sévère": "Dermato", "Eczéma Atopique": "Dermato", "Urticaire Aiguë": "Dermato",
    "Fracture Col Fémur": "Rhumato", "Arthrite Septique": "Rhumato", "Sciatique": "Rhumato", "Crise de Goutte": "Rhumato", "Fracture Pouteau-Colles": "Rhumato", "Polyarthrite Rhumatoïde": "Rhumato", "Spondylarthrite": "Rhumato", "Ostéoporose Fracturaire": "Rhumato", "Canal Carpien": "Rhumato", "Lumbago": "Rhumato", "Entorse de Cheville": "Rhumato", "Arthrose": "Rhumato", "Lupus Érythémateux": "Rhumato", "Hernie Discale": "Rhumato",
    "Anémie Ferriprive": "Endo/Hémato", "Hypothyroïdie": "Endo/Hémato", "Hyperthyroïdie": "Endo/Hémato", "Diabète Type 1": "Endo/Hémato", "Diabète Type 2": "Endo/Hémato", "Insuffisance Surrénalienne": "Endo/Hémato", "Syndrome de Cushing": "Endo/Hémato", "Leucémie Aiguë": "Endo/Hémato", "Lymphome de Hodgkin": "Endo/Hémato", "Myélome Multiple": "Endo/Hémato", "Drépanocytose": "Endo/Hémato", "Hyperparathyroïdie": "Endo/Hémato", "Acromégalie": "Endo/Hémato", "Hémophilie": "Endo/Hémato", "Anémie de Biermer": "Endo/Hémato", "Diabète Insipide": "Endo/Hémato",
    "Attaque de Panique": "Psy", "Dépression": "Psy", "Schizophrénie": "Psy", "Trouble Bipolaire": "Psy", "Anorexie Mentale": "Psy",
    "Glaucome Aigu": "ORL/Ophtalmo", "Otite Moyenne Aiguë": "ORL/Ophtalmo", "DMLA": "ORL/Ophtalmo", "Cataracte": "ORL/Ophtalmo", "Décollement de Rétine": "ORL/Ophtalmo", "VPPB": "ORL/Ophtalmo", "Angine Bactérienne": "ORL/Ophtalmo", "Epistaxis": "ORL/Ophtalmo", "Sinusite Aiguë": "ORL/Ophtalmo", "Laryngite Aiguë": "ORL/Ophtalmo", "Conjonctivite": "ORL/Ophtalmo", "Orgelet": "ORL/Ophtalmo",
    "Paludisme": "Infectio", "Coqueluche": "Infectio", "Grippe": "Infectio", "Mononucléose Infectieuse": "Infectio", "Primo-Infection VIH": "Infectio", "Maladie de Lyme": "Infectio", "Tétanos": "Infectio", "Botulisme": "Infectio", "Rubéole": "Infectio", "Syphilis": "Infectio", "Oreillons": "Infectio", "Muguet Buccal": "Infectio"
};

const CONTEXT_RULES = [
    { trigger: ['tabac', 'diabete', 'hta', 'cholesterol', 'surpoids', 'homme_age'], targets: ['Cardio', 'Neuro'], bonus: 15 },
    { trigger: ['tabac', 'fumeur'], targets: ['Pneumo'], bonus: 15 },
    { trigger: ['chirurgie', 'alitement', 'cancer', 'avion', 'voyage'], targets: ['Cardio'], bonus: 20 },
    { trigger: ['fievre', 'voyage', 'immuno', 'hiv'], targets: ['Infectio', 'Pneumo'], bonus: 10 },
    { trigger: ['femme', 'grossesse', 'contraception'], targets: ['Gynéco'], bonus: 10 },
    { trigger: ['stress', 'jeune', 'etudiant'], targets: ['Psy'], bonus: 10 },
    { trigger: ['sport', 'trauma', 'chute'], targets: ['Rhumato'], bonus: 20 }
];

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

// ============================================================
// 4. FONCTIONS UTILITAIRES
// ============================================================

function getLocalDayKey() {
    const date = new Date();
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return localDate.toISOString().split("T")[0];
}

function setDocTitle(titre) {
    const baseName = "Medicome - Cas Cliniques Interactifs";
    if (titre) { document.title = `${titre} • Medicome`; } 
    else { document.title = baseName; }
}

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

// Chronomètre
function startLiveTimer() {
    if (chronoInterval) clearInterval(chronoInterval);
    const display = document.getElementById('liveTimerDisplay');
    if (!state.isChrono || !state.startTime || !display) return;

    chronoInterval = setInterval(() => {
        const now = Date.now();
        const diff = Math.floor((now - state.startTime) / 1000); 
        const m = Math.floor(diff / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        const el = document.getElementById('liveTimerDisplay');
        if (el) el.innerHTML = `<i class="ph-bold ph-clock"></i> ${m}:${s}`;
        else clearInterval(chronoInterval);
    }, 1000);
}

// Fonction du défi quotidien
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

// ============================================================
// 5. INITIALISATION
// ============================================================

async function initApp() {
    try {
        const response = await fetch('./pathologies.json');
        if (!response.ok) throw new Error("Impossible de lire le fichier de données pathologies.json");
        PATHOLOGIES = await response.json();
        
        PATHOLOGIES.forEach(p => {
            if(p.images) {
                for (const [signKey, imgUrl] of Object.entries(p.images)) {
                    GLOBAL_IMG_MAP[signKey] = imgUrl;
                }
            }
        });
        
        // Deep Linking
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

// ✅ CORRECTION : Détecter le mode IA APRÈS le chargement complet
const directMode = urlParams.get('direct');
if (directMode === 'ia') {
    // Mode IA direct pour l'essai clinique
    state.isGuest = true;
    state.pseudo = "Participant";
    state.progression = { 
        correct: 0, incorrect: 0, streak: 0, mastery: {}, 
        dailyStreak: 0, lastDaily: null, achievements: []
    };
    updateHeader();
    renderChiefComplaintInput(); // ✅ Maintenant PATHOLOGIES est chargé
    return;
}

loadTheme();
startAuthListener();
fetchNotifications();
        
        // Listeners boutons globaux
        const btnLegal = q('#legalLink'); if(btnLegal) btnLegal.onclick = renderLegalPage;
        const cLink = q('#contactLink'); if(cLink) cLink.onclick = renderContact;
        const rLink = q('#reviewsLink'); if(rLink) rLink.onclick = renderReviews;
        ['linkInsta', 'linkTiktok', 'linkX'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('click', trackSocial);
        });
        const notifBtn = q('#notifBtn');
        if(notifBtn) {
            notifBtn.onclick = (e) => {
                e.stopPropagation();
                const notifModal = q('#notifModal');
                const isVisible = notifModal.style.display === 'block';
                notifModal.style.display = isVisible ? 'none' : 'block';
                if(!isVisible) { 
                    const badge = q('#notifBadge'); if(badge) badge.style.display = 'none'; 
                    if(state.latestNotifId) localStorage.setItem('medicome_last_read_notif', state.latestNotifId);
                }
            };
        }
        window.onclick = () => { const m = q('#notifModal'); if(m) m.style.display = 'none'; };
        const brandLogo = document.getElementById('brandLogo');
        if(brandLogo) brandLogo.onclick = () => { if (state.currentUser || state.isGuest) { renderHome(); } };

        // Titre dynamique
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) document.title = "⚠️ Le patient attend !";
            else {
                if(q('.question-text')) setDocTitle(`Question ${state.asked.length}`);
                else if(state.diagnosticShown && state.ranked.length > 0) setDocTitle(`Diagnostic : ${state.ranked[0].patho.name}`);
                else document.title = "Medicome";
            }
        });

        // Gestion Clavier
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (q('.question-text')) {
                if (e.key === 'ArrowRight' || e.key === 'y' || e.key === 'o') { const btn = document.querySelector('.btn-success'); if(btn) btn.click(); } 
                else if (e.key === 'ArrowLeft' || e.key === 'n') { const btn = document.querySelector('.btn-error'); if(btn) btn.click(); } 
                else if (e.key === 'ArrowUp' || e.key === 'i' || e.key === ' ') { e.preventDefault(); const btns = document.querySelectorAll('.button-group .link'); if(btns.length > 0) btns[0].click(); } 
                else if (e.key === 'Enter') { const btn = document.querySelector('.btn-success'); if(btn) btn.click(); }
            } else {
                if (e.key === 'Enter') {
                    const active = document.activeElement;
                    const isInteractive = active && (active.tagName === 'BUTTON' || active.tagName === 'A' || active.classList.contains('link') || active.classList.contains('footer-link') || active.classList.contains('social-link'));
                    if (!isInteractive) { const primaryBtn = q('.btn'); if(primaryBtn && primaryBtn.offsetParent !== null) primaryBtn.click(); }
                }
            }
            if (e.key === 'Escape') {
                const notifModal = q('#notifModal');
                if(notifModal && notifModal.style.display === 'block') notifModal.style.display = 'none';
                else if (!q('.question-text') && state.currentUser) renderHome();
            }
        });

    } catch (err) {
        console.error(err);
        document.querySelector('#app').innerHTML = `<div class="card center"><h2 style="color:var(--error)">Erreur de chargement</h2><div class="small" style="color:orange">${err.message}</div></div>`;
    }
}

// ============================================================
// 6. LOGIQUE UTILISATEUR & GESTION
// ============================================================

function checkGuestAvailability() {
    const guestData = JSON.parse(sessionStorage.getItem('guestMode')) || { canPlay: true, timestamp: 0 };
    const now = Date.now();
    if (now - guestData.timestamp > 2 * 60 * 60 * 1000) { guestData.canPlay = true; guestData.timestamp = now; }
    return guestData;
}

function checkGuestLimit() {
    if (!state.isGuest) return { allowed: true }; 
    const lastPlayed = localStorage.getItem('medicome_guest_last_play');
    if (!lastPlayed) return { allowed: true };
    const now = Date.now();
    const twoHours = 2 * 60 * 60 * 1000; 
    const diff = now - parseInt(lastPlayed);
    if (diff < twoHours) {
        const remainingMinutes = Math.ceil((twoHours - diff) / (60000));
        let timeText = remainingMinutes + " min";
        if (remainingMinutes > 60) { const h = Math.floor(remainingMinutes / 60); const m = remainingMinutes % 60; timeText = `${h}h ${m}min`; }
        return { allowed: false, remaining: timeText };
    }
    return { allowed: true };
}

function startGuestMode() {
    state.isGuest = true; state.pseudo = "Invité";
    if (!state.progression) state.progression = { correct: 0, incorrect: 0, streak: 0, mastery: {}, dailyStreak: 0 };
    const guestData = { canPlay: true, timestamp: Date.now() }; 
    sessionStorage.setItem('guestMode', JSON.stringify(guestData));
    updateHeader(); renderHome(); return true;
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
                    if (data.lastUpdate && data.lastUpdate.seconds) {
                        const lastDate = new Date(data.lastUpdate.seconds * 1000);
                        const now = new Date();
                        const diffTime = Math.abs(now - lastDate);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                        if (diffDays >= 3) { setTimeout(() => { showAlert(`👋 Bon retour ${state.pseudo} ! Ça faisait ${diffDays} jours. Prêt à réviser ?`, "success"); triggerConfetti(); }, 1000); }
                    }
                    updateHeader(); updateStreakDisplay(); renderHome();
                } else { saveProgression(); updateHeader(); renderHome(); }
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
                state.progression = { correct: 0, incorrect: 0, streak: 0, mastery: {}, dailyStreak: 0, lastDaily: null, achievements: [], bestTimes: {}, errorLog: {}, pdfDownloads: 0, speedWins: 0, socialDone: false, reviewDone: false };
                renderLogin(); updateHeader();
            }
        }
    });
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
    const streakDisplay = currentStreak > 0 ? ` <span style="color:#ff9f43; margin-left:8px; display:inline-flex; align-items:center; gap:4px;"><i class="ph-duotone ph-fire"></i> ${currentStreak}</span>` : '';
    const guestLabel = state.isGuest ? " (Local)" : "";
    pseudoBox.innerHTML = state.pseudo + guestLabel + streakDisplay;
}

async function saveProgression() {
    checkAchievements();
    if (!state.isGuest && state.currentUser) {
        try {
            const userRef = doc(db, "users", state.currentUser.uid);
            await setDoc(userRef, { progression: state.progression, pseudo: state.pseudo, lastUpdate: new Date() }, { merge: true });
        } catch (e) { showAlert("Erreur de sauvegarde : " + e.message, "error"); }
    } else if (state.isGuest) {
        localStorage.setItem('medicome_guest_progression', JSON.stringify(state.progression));
        localStorage.setItem('medicome_guest_pseudo', state.pseudo);
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
    
    const masterCount = Object.keys(p.mastery || {}).filter(k => p.mastery[k].success >= 10).length;
    const unlockedCount = Object.keys(p.mastery || {}).filter(k => p.mastery[k].success > 0).length;
    if(masterCount >= 5) unlock('master_5');
    if(masterCount >= 30) unlock('master_30');
    if(masterCount >= 100) unlock('master_100');
    if(unlockedCount >= PATHOLOGIES.length && PATHOLOGIES.length > 0) unlock('encyclopedia');
    if(masterCount >= PATHOLOGIES.length && PATHOLOGIES.length > 0) unlock('god_mode');
}

function trackPdf() {
    if(state.isGuest) { showAlert("Les fiches PDF ne sont pas disponibles en mode invité.", "error"); return; }
    state.progression.pdfDownloads = (state.progression.pdfDownloads || 0) + 1;
    saveProgression();
}

function trackSocial() {
    if(!state.progression.socialDone) { state.progression.socialDone = true; saveProgression(); }
}

async function fetchNotifications() {
    try {
        const qRef = query(collection(db, "notifications"), orderBy("date", "desc"), limit(5));
        const snapshot = await getDocs(qRef);
        const container = q('#notifContent');
        if (snapshot.empty) { container.innerHTML = '<div class="small">Aucune nouveauté pour le moment.</div>'; return; }
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
        if(badge && latestNotifId !== lastReadId) { badge.style.display = 'block'; } 
        else if (badge) { badge.style.display = 'none'; }
    } catch (e) { console.log("Erreur notifs", e); }
}

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
    if(btn) { btn.innerHTML = theme === 'light' ? '<i class="ph-duotone ph-moon"></i>' : '<i class="ph-duotone ph-sun"></i>'; }
}

function loadTheme() {
    const saved = localStorage.getItem('medicome_theme');
    if(saved) { document.body.setAttribute('data-theme', saved); updateThemeIcon(saved); }
    const btn = document.getElementById('themeBtn');
    if(btn) btn.onclick = toggleTheme;
}

// ============================================================
// 7. MOTEUR DE JEU & DIAGNOSTIC
// ============================================================

function prepareSigns() {
    let allSignsSet = new Set();
    PATHOLOGIES.forEach(p => { Object.keys(p.signes).forEach(s => allSignsSet.add(s)); });
    state.allSigns = Array.from(allSignsSet);
}

function rankPathologies() {
    const scores = PATHOLOGIES.map(p => {
        if (p.veto && p.veto.some(v => state.answers[v] === false)) { return { patho: p, score: -1, prob: 0 }; }
        let matchPoints = 0;
        let maxPossiblePoints = 0;
        for (const [signe, poids] of Object.entries(p.signes)) {
            maxPossiblePoints += poids;
            if (state.answers[signe] === true) {
                matchPoints += poids;
                if (p.boost && p.boost.includes(signe)) matchPoints += 50;
            } else if (state.answers[signe] === false) {
                matchPoints -= (poids * 0.5);
            }
        }
        const pGroup = PATHO_GROUPS[p.name];
        if (pGroup && state.demo) {
            CONTEXT_RULES.forEach(rule => {
                const hasFactor = rule.trigger.some(t => state.demo[t]);
                if (hasFactor && rule.targets.includes(pGroup)) {
                    matchPoints += rule.bonus;
                    maxPossiblePoints += (rule.bonus * 0.5); 
                }
            });
        }
        if (maxPossiblePoints === 0) maxPossiblePoints = 1;
        let finalProb = (matchPoints / maxPossiblePoints) * 100;
        if (finalProb < 0) finalProb = 0;
        if (finalProb > 100) finalProb = 100;
        return { patho: p, score: matchPoints, prob: finalProb.toFixed(1) };
    });
    state.ranked = scores.filter(s => s.score >= -100).sort((a, b) => b.prob - a.prob);
}

function getNextSmartSign(ranked, remainingSigns) {
    if (!ranked || ranked.length === 0 || remainingSigns.length === 0) return null;
    const topProb = parseFloat(ranked[0].prob);
    const topPatho = ranked[0].patho;

    if (topProb < 65) {
        const scope = Math.min(ranked.length, 10); 
        const topCandidates = ranked.slice(0, scope);
        const relevantGeneralSymptoms = new Set();
        topCandidates.forEach(candidate => {
            GENERAL_SYMPTOMS.forEach(gen => { if (candidate.patho.signes[gen]) relevantGeneralSymptoms.add(gen); });
        });
        let bestGen = null;
        let maxRelevance = 0;
        relevantGeneralSymptoms.forEach(gen => {
            if (!state.asked.includes(gen) && remainingSigns.includes(gen)) {
                let relevance = 0;
                topCandidates.forEach((candidate, index) => {
                    const signWeight = candidate.patho.signes[gen];
                    if (signWeight) { relevance += (11 - index) * signWeight; }
                });
                if (relevance > maxRelevance) { maxRelevance = relevance; bestGen = gen; }
            }
        });
        if (bestGen && maxRelevance > 0) return bestGen;
    }

    const missedVeto = Object.keys(topPatho.signes).find(s => (topPatho.veto && topPatho.veto.includes(s)) && !state.asked.includes(s) && remainingSigns.includes(s));
    if (missedVeto) return missedVeto;

    if (topProb >= 70) {
        const boostSigns = Object.keys(topPatho.signes).filter(s => topPatho.boost && topPatho.boost.includes(s) && !state.asked.includes(s) && remainingSigns.includes(s));
        if (boostSigns.length > 0) return boostSigns[0];
    }

    const survivors = ranked.slice(0, 5).map(r => r.patho);
    const relevantSignsPool = new Set();
    survivors.forEach(p => { Object.keys(p.signes).forEach(s => { if (!state.asked.includes(s)) relevantSignsPool.add(s); }); });
    const pool = relevantSignsPool.size > 0 ? Array.from(relevantSignsPool) : remainingSigns;
    const top3 = ranked.slice(0, 3).map(r => r.patho);
    
    return selectBestSplitSign(pool, top3);
}

function selectBestSplitSign(pool, topCandidates) {
    let bestSign = null; let bestScore = -1;
    for (const sign of pool) {
        let presenceCount = 0; let weightSum = 0;
        topCandidates.forEach(p => { if (p.signes[sign]) { presenceCount++; weightSum += p.signes[sign]; } });
        const distanceToMid = Math.abs(presenceCount - (topCandidates.length / 2));
        const optimalityScore = (topCandidates.length - distanceToMid) * weightSum;
        if (optimalityScore > bestScore) { bestScore = optimalityScore; bestSign = sign; }
    }
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
    const isConfident = score1 > 75 && (score1 - score2) > 20;
    const isLongEnough = qNum >= 12 && score1 > 60;
    if (isConfident || isLongEnough) {
        startConfirmationPhase(top1.patho);
        return true;
    }
    return false;
}

function startConfirmationPhase(targetPatho) {
    state.confirmationMode = true;
    state.confirmationQueue = [];
    const pSigns = Object.keys(targetPatho.signes);
    const unaskedSigns = pSigns.filter(s => !state.asked.includes(s));
    let potentialProofs = [];
    if (targetPatho.paraclinique) {
        const exams = unaskedSigns.filter(s => targetPatho.paraclinique.includes(s) && targetPatho.signes[s] >= 40);
        potentialProofs.push(...exams);
    }
    if (potentialProofs.length === 0 && targetPatho.boost) {
        const boosts = unaskedSigns.filter(s => targetPatho.boost.includes(s) && targetPatho.signes[s] >= 30);
        potentialProofs.push(...boosts);
    }
    let proofSign = null;
    if (potentialProofs.length > 0) { proofSign = potentialProofs.sort(() => 0.5 - Math.random())[0]; }
    const realSigns = unaskedSigns.filter(s => s !== proofSign && targetPatho.signes[s] >= 10).sort((a, b) => targetPatho.signes[b] - targetPatho.signes[a]);
    const nbRealSigns = realSigns.length;
    const competitors = state.ranked.slice(1, 5); 
    let trapSigns = [];
    competitors.forEach(comp => {
        const compSigns = Object.keys(comp.patho.signes).filter(s => !pSigns.includes(s) && !state.asked.includes(s) && comp.patho.signes[s] >= 15);
        trapSigns.push(...compSigns);
    });
    trapSigns.sort(() => 0.5 - Math.random());
    const selectedTraps = trapSigns.slice(0, nbRealSigns);
    let confirmationSigns = [...realSigns, ...selectedTraps];
    confirmationSigns.sort(() => 0.5 - Math.random());
    state.confirmationQueue = confirmationSigns;
    if (proofSign) { state.confirmationQueue.push(proofSign); }
    askNextQuestion();
}

function checkPlaisantin() {
    if (state.asked.length < 12) return false;
    const allNo = state.asked.every(sign => state.answers[sign] === false);
    if (allNo) { renderPlaisantinEnd("healthy"); return true; }
    const allYes = state.asked.every(sign => state.answers[sign] === true);
    if (allYes) { renderPlaisantinEnd("hypochondriac"); return true; }
    return false; 
}

function askNextQuestion() {
    if (checkPlaisantin()) return;
    if (state.asked.length >= 30) { showDiagnostic(); return; }
    
    if (state.confirmationMode) {
        if (state.confirmationQueue.length > 0) {
            const nextConfSign = state.confirmationQueue.shift();
            if (state.asked.includes(nextConfSign)) { askNextQuestion(); return; }
            state.currentSign = nextConfSign;
            state.asked.push(nextConfSign);
            renderCurrentQuestion();
            return;
        } else { showDiagnostic(); return; }
    }

    const askedLeaders = state.asked.filter(s => GENERAL_SYMPTOMS.includes(s));
    const validatedLeaders = askedLeaders.filter(s => state.answers[s] === true);
    if (askedLeaders.length < 11 || (validatedLeaders.length === 0 && askedLeaders.length < 11)) {
        askNextSmartLeader();
        return;
    }

    rankPathologies(); 
    if(canShowDiagnostic()) return; 
    prepareSigns();
    const remaining = state.allSigns.filter(s => !state.asked.includes(s));
    const signe = getNextSmartSign(state.ranked, remaining);

    if (!signe) {
        const topProb = state.ranked.length > 0 ? parseFloat(state.ranked[0].prob) : 0;
        if (topProb < 5) renderPlaisantinEnd("healthy");
        else showDiagnostic();
        return;
    }
    state.currentSign = signe; state.asked.push(signe); renderCurrentQuestion();
}

function askNextSmartLeader() {
    const askedLeaders = state.asked.filter(s => GENERAL_SYMPTOMS.includes(s));
    const validatedLeaders = askedLeaders.filter(s => state.answers[s] === true);
    if (validatedLeaders.length === 0 && askedLeaders.length < 11) {
        if (askedLeaders.length === 0) {
            const firstLeader = getBestLeaderFromTerrain();
            state.currentSign = firstLeader; state.asked.push(firstLeader); renderCurrentQuestion(); return;
        } else {
            const nextLeader = getNextUnaskedLeader();
            if (nextLeader) { state.currentSign = nextLeader; state.asked.push(nextLeader); renderCurrentQuestion(); return; }
            else {
                const randomSign = getRandomNonLeaderSign();
                if (randomSign) { state.currentSign = randomSign; state.asked.push(randomSign); renderCurrentQuestion(); return; }
                else { renderPlaisantinEnd("healthy"); return; }
            }
        }
    }
    if (validatedLeaders.length > 0) {
        const compatibleLeaders = getCompatibleLeaders(validatedLeaders);
        const unaskedCompatible = compatibleLeaders.filter(l => !state.asked.includes(l));
        if (unaskedCompatible.length > 0) { state.currentSign = unaskedCompatible[0]; state.asked.push(state.currentSign); renderCurrentQuestion(); return; }
    }
    rankPathologies(); 
    if(canShowDiagnostic()) return; 
    prepareSigns();
    const remaining = state.allSigns.filter(s => !state.asked.includes(s));
    const signe = getNextSmartSign(state.ranked, remaining);
    if (!signe) { const topProb = state.ranked.length > 0 ? parseFloat(state.ranked[0].prob) : 0; if (topProb < 5) renderPlaisantinEnd("healthy"); else showDiagnostic(); return; }
    state.currentSign = signe; state.asked.push(signe); renderCurrentQuestion();
}

function getBestLeaderFromTerrain() {
    if (state.demo.tabac || state.demo.diabete || state.demo.hta || state.demo.homme_age || state.demo.metabolique) return "douleur_thoracique";
    if (state.demo.fievre || state.demo.voyage || state.demo.hiver || state.demo.epidemie) return "fievre";
    if (state.demo.femme && (state.demo.grossesse || state.demo.sterilet)) return "douleur_abdominale";
    if (state.demo.alcool || state.demo.medicaments) return "douleur_abdominale";
    if (state.demo.tabac || state.demo.fumeur) return "dyspnee";
    if (state.demo.femme) return "genes_urinaires";
    if (state.demo.senior || state.demo.trauma) return "troubles_neuro";
    return "douleur_thoracique";
}
function getNextUnaskedLeader() { return GENERAL_SYMPTOMS.find(s => !state.asked.includes(s)); }
function getCompatibleLeaders(validatedLeaders) {
    const compatible = new Set();
    PATHOLOGIES.forEach(patho => {
        const hasAll = validatedLeaders.every(leader => patho.signes[leader]);
        if (hasAll) { GENERAL_SYMPTOMS.forEach(gen => { if (patho.signes[gen] && !validatedLeaders.includes(gen)) compatible.add(gen); }); }
    });
    return Array.from(compatible);
}
function getRandomNonLeaderSign() {
    const nonLeaders = state.allSigns.filter(s => !GENERAL_SYMPTOMS.includes(s) && !state.asked.includes(s));
    if (nonLeaders.length === 0) return null;
    return nonLeaders[Math.floor(Math.random() * nonLeaders.length)];
}

// ============================================================
// 8. INTERFACE & AFFICHAGE (RENDERING)
// ============================================================

function renderLogin() {
    setDocTitle(null); window.scrollTo(0, 0); const app = q('#app'); app.innerHTML = '';
    const grid = document.createElement('div'); grid.className = 'landing-grid';
    const leftCol = document.createElement('div'); leftCol.className = 'landing-info';
    leftCol.innerHTML = `<h1>Maîtrisez le Diagnostic Médical</h1><p>Medicome est le simulateur interactif conçu pour les étudiants en médecine (ECNi, EDN, R2C). Confrontez-vous à une IA pédagogique.</p><div class="feature-list"><div class="feature-item"><i class="ph-duotone ph-brain feature-icon"></i><span>Pédagogie Inversée</span></div><div class="feature-item"><i class="ph-duotone ph-check-circle feature-icon"></i><span>+100 Pathologies</span></div><div class="feature-item"><i class="ph-duotone ph-images feature-icon"></i><span>Imagerie & ECG</span></div><div class="feature-item"><i class="ph-duotone ph-chart-line-up feature-icon"></i><span>Suivi de progression</span></div></div><div style="display:flex; flex-direction:column; align-items:flex-start; gap:8px;"><button id="heroGuestBtn" class="btn-guest-hero"><i class="ph-duotone ph-user-circle"></i> Tester sans connexion</button><div class="small" style="opacity:0.7; width:100%; text-align:center; max-width:280px;">Mode invité limité</div></div>`;
    grid.appendChild(leftCol);
    const rightCol = document.createElement('div'); rightCol.className = 'landing-auth-card';
    const tabsDiv = document.createElement('div'); tabsDiv.className = 'auth-tabs';
    const tabLogin = document.createElement('div'); tabLogin.className = 'auth-tab active'; tabLogin.innerText = 'Connexion';
    const tabReg = document.createElement('div'); tabReg.className = 'auth-tab'; tabReg.innerText = 'Inscription';
    tabsDiv.appendChild(tabLogin); tabsDiv.appendChild(tabReg); rightCol.appendChild(tabsDiv);
    const formContainer = document.createElement('div'); rightCol.appendChild(formContainer);
    const showLoginForm = () => {
        formContainer.innerHTML = ''; tabLogin.classList.add('active'); tabReg.classList.remove('active');
        const inputUser = document.createElement('input'); inputUser.placeholder = 'Email'; inputUser.className = 'input';
        const inputPass = document.createElement('input'); inputPass.placeholder = 'Mot de passe'; inputPass.className = 'input'; inputPass.type = 'password';
        const btnLogin = document.createElement('button'); btnLogin.className = 'btn'; btnLogin.textContent = 'Se connecter';
        btnLogin.onclick = async () => { try { await signInWithEmailAndPassword(auth, inputUser.value, inputPass.value); showAlert("Connexion réussie !", "success"); } catch (error) { showAlert("Erreur: " + error.message, "error"); } };
        const btnForgot = document.createElement('div'); btnForgot.className = 'small link'; btnForgot.style.border = 'none'; btnForgot.textContent = 'Mot de passe oublié ?';
        btnForgot.onclick = async () => { if (!inputUser.value) return showAlert("Veuillez entrer votre email d'abord", "error"); try { await sendPasswordResetEmail(auth, inputUser.value); showAlert("Email envoyé !", "success"); } catch (e) { showAlert(e.message, "error"); } };
        formContainer.append(inputUser, inputPass, btnLogin, btnForgot);
    };
    const showRegForm = () => {
        formContainer.innerHTML = ''; tabReg.classList.add('active'); tabLogin.classList.remove('active');
        const infoFree = document.createElement('div'); infoFree.className = 'alert alert-success'; infoFree.style.marginBottom = '15px'; infoFree.innerHTML = '<i class="ph-bold ph-gift"></i> L\'inscription est 100% Gratuite !';
        const inRegEmail = document.createElement('input'); inRegEmail.placeholder = 'Votre Email'; inRegEmail.className = 'input';
        const inRegPass = document.createElement('input'); inRegPass.placeholder = 'Créer un Mot de passe'; inRegPass.className = 'input'; inRegPass.type = 'password';
        const inPseudo = document.createElement('input'); inPseudo.placeholder = 'Votre Pseudo'; inPseudo.className = 'input';
        const btnReg = document.createElement('button'); btnReg.className = 'btn'; btnReg.textContent = "S'inscrire gratuitement";
        btnReg.onclick = async () => { if (!inRegEmail.value || !inRegPass.value || !inPseudo.value) return showAlert('Veuillez tout remplir', 'error'); try { const userCredential = await createUserWithEmailAndPassword(auth, inRegEmail.value, inRegPass.value); const user = userCredential.user; await updateProfile(user, { displayName: inPseudo.value }); await setDoc(doc(db, "users", user.uid), { pseudo: inPseudo.value, email: inRegEmail.value, progression: { correct: 0, incorrect: 0, streak: 0, mastery: {} }, createdAt: new Date() }, { merge: true }); state.pseudo = inPseudo.value; showAlert("Compte créé !", "success"); updateHeader(); renderHome(); } catch (error) { showAlert("Erreur création: " + error.message, "error"); } };
        formContainer.append(infoFree, inPseudo, inRegEmail, inRegPass, btnReg);
    };
    tabLogin.onclick = showLoginForm; tabReg.onclick = showRegForm; showLoginForm();
    const separator = document.createElement('div'); separator.style.margin = "20px 0"; separator.style.borderTop = "1px solid var(--glass-border)"; rightCol.appendChild(separator);
    const codeTitle = document.createElement('div'); codeTitle.className = "small"; codeTitle.style.marginBottom = "5px"; codeTitle.innerHTML = "<i class='ph-duotone ph-key'></i> Code d'accès (École / Fac)"; rightCol.appendChild(codeTitle);
    const codeGroup = document.createElement('div'); codeGroup.style.display = "flex"; codeGroup.style.gap = "10px";
    const inputCode = document.createElement('input'); inputCode.placeholder = 'Code...'; inputCode.className = 'input'; inputCode.style.margin = "0";
    const btnCode = document.createElement('button'); btnCode.className = 'btn'; btnCode.textContent = 'OK'; btnCode.style.width = "auto"; btnCode.style.margin = "0";
    btnCode.onclick = async () => { const codeSaisi = inputCode.value.trim(); if (!codeSaisi) return; try { const codeRef = doc(db, "access_codes", codeSaisi); const codeSnap = await getDoc(codeRef); if (codeSnap.exists() && codeSnap.data().active === true) { const data = codeSnap.data(); state.isGuest = true; state.isPremiumCode = true; state.pseudo = data.pseudo; state.progression = { correct: 0, incorrect: 0, streak: 0, mastery: {}, dailyHistory: {} }; updateHeader(); renderHome(); showAlert(`Accès Partenaire : ${data.pseudo}`, 'success'); } else { showAlert('Code invalide ou expiré', 'error'); } } catch (e) { console.error(e); showAlert("Erreur de connexion", "error"); } };
    codeGroup.append(inputCode, btnCode); rightCol.appendChild(codeGroup); grid.appendChild(rightCol); app.appendChild(grid);
    setTimeout(() => { const heroBtn = document.getElementById('heroGuestBtn'); if(heroBtn) heroBtn.onclick = startGuestMode; }, 100);
}

function renderHome() {
    setDocTitle("Accueil"); window.scrollTo(0,0); const app = q('#app'); app.innerHTML='';
    const prog = state.progression;
    const card = document.createElement('div'); card.className='card center';
    let cloudBadge = state.isGuest ? '<span style="color:orange; font-size:0.8em; margin-bottom:10px"><i class="ph-duotone ph-floppy-disk"></i> Mode Local</span>' : '<span style="color:var(--success); font-size:0.8em; margin-bottom:10px"><i class="ph-duotone ph-cloud-check"></i> Sauvegarde activée</span>';
    const displayName = state.pseudo || '...';
    const btnGuest = document.createElement('button'); btnGuest.className = 'btn'; btnGuest.innerHTML = '<i class="ph-duotone ph-user-circle"></i> Tester sans connexion'; btnGuest.style.marginTop = '10px'; btnGuest.onclick = startGuestMode;
    card.appendChild(btnGuest);
    const dailyPatho = getDailyPatho();
    const todayStr = new Date().toDateString();
    const isDailyDone = prog.lastDaily === todayStr;
    const dailyClass = isDailyDone ? "daily-title" : "daily-title"; 
    const dailyText = isDailyDone ? `<i class='ph-duotone ph-check-circle color-success'></i> Défi du jour validé !` : `<i class='ph-duotone ph-sun color-gold'></i> Défi du ${new Date().toLocaleDateString()}`;
    const dailyContent = isDailyDone ? "Revenez demain pour un nouveau défi du jour!" : `Faire identifier : <strong>${dailyPatho ? dailyPatho.name : 'Chargement...'}</strong>`;
    card.innerHTML = `<h2>Bonjour ${displayName}</h2>${cloudBadge}<div class="daily-card"><div class="${dailyClass}">${dailyText}</div><div style="font-size:0.9em; color:var(--text-main); margin-bottom:5px;">${dailyContent}</div>${!isDailyDone ? `<button id="btnDaily" class="btn" style="background:var(--gold); color:#000; font-size:12px; padding:8px 15px; margin-top:5px;">Relever le défi</button>` : ''}</div><div class="stat-box" style="width:100%"><div class="stat-number">${prog.correct + prog.incorrect}</div><div class="stat-label">Cas joués</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;margin-top:12px;"><div class="stat-box" style="text-align:center; background:rgba(0, 255, 157, 0.1); border-color:var(--success)"><div class="stat-number" style="color:var(--success);">${prog.correct}</div><div class="stat-label">Succès</div></div><div class="stat-box" style="text-align:center; background:rgba(255, 77, 77, 0.1); border-color:var(--error)"><div class="stat-number" style="color:var(--error);">${prog.incorrect}</div><div class="stat-label">Échecs</div></div></div>`;
    const howToCard = document.createElement('div'); howToCard.style.cssText = "background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); padding:15px; border-radius:12px; margin-top:20px; width:100%; text-align:left;"; howToCard.innerHTML = `<div style="font-weight:bold; color:var(--accent); margin-bottom:8px;"><i class="ph-duotone ph-info"></i> Comment ça marche ?</div><div style="font-size:0.9em; color:var(--text-muted); line-height:1.4;">1. Réfléchissez à une pathologie.<br>2. Faites deviner à l'IA.<br>3. Répondez correctement aux questions.</div>`;
    card.appendChild(howToCard);
    const btnDiagRow = document.createElement('div'); btnDiagRow.style.display = 'flex'; btnDiagRow.style.gap = '15px'; btnDiagRow.style.marginTop = '24px'; btnDiagRow.style.width = '100%';
    const btnQuestions = document.createElement('button'); btnQuestions.className = 'btn'; btnQuestions.style.flex = '1'; btnQuestions.innerHTML = '<i class="ph-duotone ph-stethoscope"></i> Diagnostic Questions';
    if (state.isGuest) { const limit = checkGuestLimit(); if (!limit.allowed) { btnQuestions.style.background = "linear-gradient(135deg, #555 0%, #333 100%)"; btnQuestions.style.opacity = "0.7"; btnQuestions.innerHTML = `<i class="ph-duotone ph-lock-key"></i> Bloqué (${limit.remaining})`; } }
    btnQuestions.onclick = () => { const limit = checkGuestLimit(); if (!limit.allowed) { showAlert(`Mode invité limité !`, "error"); return; } if(audioCtx.state === 'suspended') audioCtx.resume(); state.useLLM = false; state.dailyTarget = null; renderDemographics(); };
    const btnIA = document.createElement('button'); btnIA.className = 'btn'; btnIA.style.flex = '1'; btnIA.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; btnIA.innerHTML = '<i class="ph-duotone ph-brain"></i> Diagnostic IA';
    if (state.isGuest) { const limit = checkGuestLimit(); if (!limit.allowed) { btnIA.style.background = "linear-gradient(135deg, #555 0%, #333 100%)"; btnIA.style.opacity = "0.7"; btnIA.innerHTML = `<i class="ph-duotone ph-lock-key"></i> Bloqué (${limit.remaining})`; } }
    btnIA.onclick = () => { const limit = checkGuestLimit(); if (!limit.allowed) { showAlert(`Mode invité limité !`, "error"); return; } if(audioCtx.state === 'suspended') audioCtx.resume(); state.useLLM = true; state.dailyTarget = null; renderChiefComplaintInput(); };
    btnDiagRow.append(btnQuestions, btnIA); card.appendChild(btnDiagRow);
    const btnExam = document.createElement('button'); btnExam.className='btn'; btnExam.style.background = 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)'; btnExam.style.marginTop='15px'; btnExam.innerHTML='<i class="ph-duotone ph-exam"></i> Examen Blanc'; 
    btnExam.onclick = () => { if (state.isGuest && !state.isPremiumCode) { showAlert("Mode réservé aux inscrits.", "error"); return; } renderExamConfig(); };
    const btnGloss = document.createElement('button'); btnGloss.className='link'; btnGloss.innerHTML='<i class="ph-duotone ph-book-bookmark"></i> Glossaire'; btnGloss.style.marginTop='12px'; btnGloss.onclick=renderGlossary;
    const btnProf = document.createElement('button'); btnProf.className='link'; btnProf.innerHTML='<i class="ph-duotone ph-user-circle"></i> Profil & Succès'; btnProf.style.marginTop='6px'; btnProf.onclick=renderProfile;
    card.appendChild(btnExam); card.appendChild(btnGloss); card.appendChild(btnProf); app.appendChild(card);
    const btnDaily = q('#btnDaily'); if(btnDaily) { btnDaily.onclick = () => { const limit = checkGuestLimit(); if (!limit.allowed) { showAlert(`Mode invité limité !`, "error"); return; } if(audioCtx.state === 'suspended') audioCtx.resume(); state.dailyTarget = dailyPatho; state.isChrono = false; renderDemographics(); }; }
}

function renderDemographics() {
    setDocTitle("Paramètres Patient"); window.scrollTo(0, 0); const app = q('#app'); app.innerHTML = '';
    const card = document.createElement('div'); card.className = 'card center';
    if (state.exam && state.exam.active) { const currentCase = state.exam.currentIndex + 1; const totalCases = state.exam.queue.length; card.innerHTML = `<h3><i class="ph-duotone ph-student color-accent"></i> Examen Blanc</h3><p class="small" style="margin-bottom:20px; color:var(--accent);">Cas Clinique ${currentCase} / ${totalCases}</p>`; } 
    else if (state.dailyTarget) { card.innerHTML = `<h3><i class="ph-duotone ph-sun color-gold"></i> Défi du Jour</h3><p class="small" style="margin-bottom:20px; color:var(--gold);">Cible : ${state.dailyTarget.name}</p>`; } 
    else { card.innerHTML = `<h3 style="text-align:center; margin-bottom:15px;"><i class="ph-duotone ph-user-list"></i> Profil Patient</h3><p class="small" style="margin-bottom:20px">Définissez le terrain et le contexte clinique.</p>`; }
    const genderContainer = document.createElement('div'); genderContainer.className = 'gender-selector';
    genderContainer.innerHTML = `<button class="gender-btn" id="btn-femme" onclick="selectGender('femme')" title="Femme"><i class="ph-duotone ph-gender-female"></i></button><button class="gender-btn" id="btn-homme" onclick="selectGender('homme')" title="Homme"><i class="ph-duotone ph-gender-male"></i></button>`;
    card.appendChild(document.createElement('label')).textContent = "Identité"; card.appendChild(genderContainer);
    let selectedGender = null;
    window.selectGender = (g) => { selectedGender = g; document.getElementById('btn-femme').className = `gender-btn ${g === 'femme' ? 'active' : ''}`; document.getElementById('btn-homme').className = `gender-btn ${g === 'homme' ? 'active' : ''}`; toggleGenderSpecificTags(g); };
    const sAge = document.createElement('select'); sAge.id = 'demo-age'; sAge.className = 'input';
    const ages = [ { val: "nourrisson", txt: "Nourrisson (< 2 ans)" }, { val: "enfant", txt: "Enfant (2 - 12 ans)" }, { val: "adolescent", txt: "Adolescent (13 - 18 ans)" }, { val: "jeune", txt: "Jeune Adulte (19 - 35 ans)" }, { val: "adulte", txt: "Adulte (36 - 65 ans)" }, { val: "senior", txt: "Senior (> 65 ans)" } ];
    ages.forEach(a => { const op = document.createElement('option'); op.value = a.val; op.textContent = a.txt; if (a.val === 'adulte') op.selected = true; sAge.appendChild(op); });
    card.appendChild(sAge);
    const chipsDiv = document.createElement('div'); chipsDiv.className = 'chips-container';
    const groups = [ { title: "Habitudes & Métabolisme", items: [ { id: 'tabac', label: 'Tabac', icon: 'ph-cigarette' }, { id: 'alcool', label: 'Alcool', icon: 'ph-beer-bottle' }, { id: 'surpoids', label: 'Surpoids / Obésité', icon: 'ph-hamburger' }, { id: 'metabolique', label: 'Diabète / HTA', icon: 'ph-heart-break' } ] }, { title: "Contexte Aigu / Déclencheur", items: [ { id: 'trauma', label: 'Chute / Trauma / Effort', icon: 'ph-bone' }, { id: 'chirurgie', label: 'Chirurgie / Alité', icon: 'ph-bed' }, { id: 'voyage', label: 'Voyage / Plein Air', icon: 'ph-airplane' }, { id: 'medicaments', label: 'Médicaments / Allergie', icon: 'ph-pill' } ] }, { title: "Terrain Fragile", items: [ { id: 'immuno', label: 'Cancer / Immuno.', icon: 'ph-dna' }, { id: 'psy', label: 'Contexte Psy / Stress', icon: 'ph-brain' }, { id: 'hiver', label: 'Hiver / Épidémie', icon: 'ph-snowflake' } ] }, { title: "Gynécologie", genderSpecific: 'femme', items: [ { id: 'grossesse', label: 'Grossesse', icon: 'ph-baby' }, { id: 'sterilet', label: 'Stérilet', icon: 'ph-anchor' }, { id: 'menopause', label: 'Ménopause', icon: 'ph-hourglass' } ] } ];
    const selectedFactors = new Set();
    groups.forEach(group => { const label = document.createElement('div'); label.className = 'section-label'; label.textContent = group.title; if(group.genderSpecific) label.id = `label-${group.genderSpecific}`; chipsDiv.appendChild(label); group.items.forEach(f => { const chip = document.createElement('div'); chip.className = 'chip'; chip.id = `chip-${f.id}`; chip.innerHTML = `<i class="ph-duotone ${f.icon}"></i> ${f.label}`; if (group.genderSpecific) chip.dataset.gender = group.genderSpecific; chip.onclick = () => { if (selectedFactors.has(f.id)) { selectedFactors.delete(f.id); chip.classList.remove('selected'); } else { selectedFactors.add(f.id); chip.classList.add('selected'); } }; chipsDiv.appendChild(chip); }); });
    card.appendChild(chipsDiv);
    window.toggleGenderSpecificTags = (g) => { const labelFemme = document.getElementById('label-femme'); if(labelFemme) labelFemme.style.display = (g === 'femme') ? 'block' : 'none'; const chips = document.querySelectorAll('[data-gender="femme"]'); chips.forEach(c => { if (g === 'femme') c.style.display = 'flex'; else { c.style.display = 'none'; c.classList.remove('selected'); selectedFactors.delete(c.id.replace('chip-', '')); } }); };
    toggleGenderSpecificTags(null); 
    if (!state.dailyTarget) { const chronoDiv = document.createElement('div'); chronoDiv.style.margin = '10px 0 20px 0'; chronoDiv.style.textAlign = 'center'; chronoDiv.innerHTML = `<label style="cursor:pointer; color:var(--text-muted); font-size:13px;"><input type="checkbox" id="chronoToggle" style="margin-right:6px; vertical-align:middle;"> <i class="ph-duotone ph-lightning"></i> Mode Chrono</label>`; card.appendChild(chronoDiv); }
    const btnGroup = document.createElement('div'); btnGroup.className = 'button-group';
    const btnStart = document.createElement('button'); btnStart.className = 'btn'; btnStart.innerHTML = '<i class="ph-duotone ph-play"></i> Lancer le cas';
    btnStart.onclick = () => {
        if (!selectedGender && !state.dailyTarget) { if(Math.random() > 0.5) selectedGender = 'femme'; else selectedGender = 'homme'; }
        const ageVal = q('#demo-age').value;
        const demoData = {};
        if(selectedGender === 'homme') { demoData['homme'] = true; demoData['garcon'] = true; }
        if(selectedGender === 'femme') { demoData['femme'] = true; demoData['fille'] = true; }
        if(ageVal === 'nourrisson') { demoData['nourrisson'] = true; demoData['nourrisson_moins_2ans'] = true; demoData['nourrisson_3mois_3ans'] = true; demoData['nourrisson_non_vaccine'] = true; }
        if(ageVal === 'enfant') { demoData['enfant'] = true; demoData['enfant_3_15ans'] = true; demoData['enfant_scolarise'] = true; demoData['enfant_age_scolaire'] = true; demoData['enfant_9mois_5ans'] = true; }
        if(ageVal === 'adolescent') { demoData['adolescent'] = true; demoData['adolescente'] = true; demoData['sujet_jeune'] = true; }
        if(ageVal === 'jeune') { demoData['jeune'] = true; demoData['sujet_jeune'] = true; demoData['adulte_jeune'] = true; demoData['homme_jeune'] = (selectedGender === 'homme'); demoData['homme_jeune_20_35ans'] = (selectedGender === 'homme'); }
        if(ageVal === 'adulte') { demoData['adulte'] = true; demoData['adulte_moyen'] = true; demoData['quarantaine'] = true; demoData['age_>40ans'] = true; demoData['homme_mur'] = (selectedGender === 'homme'); demoData['femme_quarantaine'] = (selectedGender === 'femme'); }
        if(ageVal === 'senior') { demoData['senior'] = true; demoData['sujet_age'] = true; demoData['age_avance'] = true; demoData['plus_de_50ans'] = true; demoData['age_>50ans'] = true; demoData['age_>60ans'] = true; demoData['sujet_age_>60ans'] = true; demoData['plus_de_65ans'] = true; demoData['age_>65ans'] = true; demoData['age_>75ans'] = true; demoData['femme_menopausee'] = (selectedGender === 'femme'); demoData['femme_agee'] = (selectedGender === 'femme'); }
        if(selectedGender === 'homme' && (ageVal === 'jeune' || ageVal === 'adolescent')) { demoData['homme_jeune'] = true; demoData['homme_jeune_longiligne'] = true; }
        if(selectedGender === 'homme' && (ageVal === 'senior' || ageVal === 'adulte')) demoData['homme_age'] = true;
        if(selectedGender === 'femme' && (ageVal === 'jeune' || ageVal === 'adulte' || ageVal === 'adolescent')) { demoData['femme_jeune'] = true; demoData['femme_age_procreer'] = true; }
        if(selectedFactors.has('metabolique')) { demoData['diabete'] = true; demoData['diabete_insuline_sulfamides'] = true; demoData['hta'] = true; demoData['hta_ancienne'] = true; demoData['hta_mal_controlee'] = true; demoData['hta_resistante'] = true; demoData['syndrome_metabolique'] = true; demoData['dyslipidemie'] = true; demoData['hyperlipidemie'] = true; demoData['nephropathie_diabetique'] = true; demoData['nephroangiosclerose'] = true; demoData['fibrillation_atriale'] = true; demoData['insuffisance_cardiaque'] = true; demoData['arteriopathie'] = true; }
        if(selectedFactors.has('trauma')) { demoData['chute'] = true; demoData['chute_hauteur'] = true; demoData['chute_mains_avant'] = true; demoData['traumatisme_cranien'] = true; demoData['traumatisme_cranien_violent'] = true; demoData['traumatisme_cranien_ancien'] = true; demoData['traumatisme_oculaire'] = true; demoData['traumatisme_inversion'] = true; demoData['effort'] = true; demoData['effort_physique'] = true; demoData['effort_soulevement'] = true; demoData['effort_declenchant'] = true; demoData['sport'] = true; demoData['sport_pivot'] = true; demoData['atcd_traumatique'] = true; demoData['frottement_yeux'] = true; demoData['geste_intra_articulaire'] = true; }
        if(selectedFactors.has('chirurgie')) { demoData['chirurgie_recente'] = true; demoData['chirurgie_abdominale'] = true; demoData['alitement'] = true; demoData['alitement_prolonge'] = true; demoData['bride_chirurgicale'] = true; demoData['chirurgie_cataracte'] = true; demoData['post_neurochirurgie'] = true; demoData['splenectomie'] = true; }
        if(selectedFactors.has('voyage')) { demoData['voyage_recent'] = true; demoData['voyage_zone_endemique'] = true; demoData['voyage_recent_non_vaccine'] = true; demoData['activite_forestiere'] = true; demoData['foret'] = true; demoData['jardinage'] = true; demoData['blessure_jardinage'] = true; demoData['voyage_chaleur'] = true; }
        if(selectedFactors.has('medicaments')) { demoData['medicaments'] = true; demoData['prise_medicamenteuse'] = true; demoData['arret_traitement'] = true; demoData['allergies'] = true; demoData['atopie'] = true; demoData['allergie_connue'] = true; demoData['terrain_atopique_familial'] = true; demoData['introduction_allergene'] = true; demoData['prise_ains'] = true; demoData['ains'] = true; demoData['prise_aains'] = true; demoData['anticoagulants'] = true; demoData['prise_anticoagulants'] = true; demoData['corticoides'] = true; demoData['corticotherapie'] = true; demoData['corticotherapie_long_cours'] = true; demoData['prise_corticoides'] = true; demoData['corticoides_inhalés'] = true; demoData['nephrotoxiques'] = true; demoData['traitement_amiodarone'] = true; demoData['arret_traitement_lasilix'] = true; demoData['contraception_oestroprogestative'] = true; demoData['hormones'] = true; demoData['prise_antibiotiques'] = true; demoData['antibiotiques_recents'] = true; }
        if(selectedFactors.has('immuno')) { demoData['cancer'] = true; demoData['cancer_actif'] = true; demoData['cancer_digestif'] = true; demoData['cancer_prostate'] = true; demoData['immunodepression'] = true; demoData['auto_immun'] = true; demoData['auto_immunite_associee'] = true; demoData['atcd_autoimmun'] = true; demoData['chimio_anterieure'] = true; demoData['radiotherapie'] = true; }
        if(selectedFactors.has('psy')) { demoData['stress'] = true; demoData['stress_obscurite'] = true; demoData['terrain_anxieux'] = true; demoData['depression'] = true; demoData['antecedent_personnel'] = true; demoData['perfectionnisme'] = true; demoData['dette_sommeil'] = true; demoData['isolement_social'] = true; demoData['milieu_socio_eleve'] = true; }
        if(selectedFactors.has('hiver')) { demoData['hiver'] = true; demoData['saison_hivernale'] = true; demoData['saison_froide'] = true; demoData['hiver_printemps'] = true; demoData['epidemie'] = true; demoData['epidemie_hivernale'] = true; demoData['contage'] = true; demoData['contage_creche'] = true; demoData['collectivite'] = true; demoData['entourage_malade'] = true; demoData['rhume_recent'] = true; demoData['rhinopharyngite'] = true; demoData['rhinopharyngite_precedente'] = true; demoData['infection_orl_recente'] = true; demoData['episode_viral_precedent'] = true; demoData['viral'] = true; demoData['infection_virale_recente'] = true; }
        if(selectedFactors.has('tabac')) { demoData['tabac'] = true; demoData['tabagisme'] = true; demoData['tabagisme_actif'] = true; demoData['tabagisme_paquets_annee'] = true; demoData['alcool_tabac'] = true; }
        if(selectedFactors.has('alcool')) { demoData['alcool'] = true; demoData['alcoolisme'] = true; demoData['alcoolisme_chronique'] = true; demoData['ethylisme_chronique'] = true; demoData['toxiques_alcool'] = true; demoData['sevrage_alcool'] = true; demoData['exces_alimentaire_alcool'] = true; demoData['douleur_ganglionnaire_alcool'] = true; }
        if(selectedFactors.has('surpoids')) { demoData['surpoids'] = true; demoData['surpoids_obesite'] = true; demoData['obesite'] = true; demoData['obesite_abdominale'] = true; demoData['imc_bas'] = false; }
        if(selectedFactors.has('grossesse')) { demoData['grossesse'] = true; demoData['grossesse_>20SA'] = true; demoData['post_partum'] = true; demoData['femme_enceinte_risque'] = true; }
        if(selectedFactors.has('sterilet')) { demoData['dispositif_intra_uterin'] = true; demoData['sterilet'] = true; }
        if(selectedFactors.has('menopause')) { demoData['menopause'] = true; demoData['femme_menopausee'] = true; demoData['femme_post_menopause'] = true; }
        if(demoData['jeune'] || demoData['adolescent'] || demoData['adulte_jeune']) { demoData['rapport_risque'] = true; demoData['rapport_sexuel_non_protege'] = true; demoData['rapports_non_proteges'] = true; demoData['partenaires_multiples'] = true; demoData['ist_recente'] = true; demoData['comportement_sexuel_risque'] = true; demoData['jeune_imprudent'] = true; demoData['consommation_cannabis'] = true; demoData['toxicomanie_iv'] = true; }
        if(demoData['senior']) { demoData['valvulopathie_connue'] = true; demoData['atcd_aaa_connu'] = true; demoData['hbp'] = true; }
        if(demoData['femme']) { demoData['regles_abondantes'] = true; demoData['catamenial'] = true; }
        if(demoData['homme']) { demoData['garcon_premier_ne'] = true; }

        state.demo = demoData;
        state.answers = {}; state.asked = []; state.diagnosticShown = false; state.previousDiagnostics = []; state.history = [];
        state.confirmationMode = false; state.confirmationQueue = []; state.confirmedPatho = null;
        state.priorityQueue = [];
        if (state.dailyTarget) state.isChrono = false; else state.isChrono = q('#chronoToggle')?.checked || false;
        if (state.isChrono) state.startTime = Date.now(); else state.startTime = null;
        askNextQuestion();
    };
    const btnCancel = document.createElement('button'); btnCancel.className = 'link'; btnCancel.textContent = 'Annuler'; btnCancel.onclick = renderHome;
    btnGroup.appendChild(btnStart); btnGroup.appendChild(btnCancel); card.appendChild(btnGroup); app.appendChild(card);
}

function renderCurrentQuestion() {
    setDocTitle(`Question ${state.asked.length}`); window.scrollTo(0,0); const app = q('#app'); app.innerHTML='';
    const card = document.createElement('div'); card.className='card center';
    const signe = state.currentSign;
    const questionTitle = state.confirmationMode ? `<span style="color:var(--gold)"><i class="ph-duotone ph-brain"></i> Je pense avoir une piste...</span>` : `QUESTION ${state.asked.length}`;
    let prob = 0; if(state.ranked.length > 0) prob = parseFloat(state.ranked[0].prob);
    const imgUrl = GLOBAL_IMG_MAP[signe];
    const imgHTML = imgUrl ? `<div style="width:100%; max-width:500px; margin:0 auto 20px auto;"><img src="${imgUrl}" alt="Image" style="width:100%; border-radius:12px; border:2px solid var(--glass-border);"></div>` : '';
    let timerHTML = '';
    if (state.isChrono && state.startTime) {
        const now = Date.now(); const diff = Math.floor((now - state.startTime) / 1000);
        const m = Math.floor(diff / 60).toString().padStart(2, '0'); const s = (diff % 60).toString().padStart(2, '0');
        timerHTML = `<div id="liveTimerDisplay" class="timer-display"><i class="ph-bold ph-clock"></i> ${m}:${s}</div>`;
    }
    card.innerHTML = `${timerHTML} <div class="ai-progress-container"><div class="ai-progress-bar" style="width:${prob}%"></div></div><div class="ai-progress-label">Confiance IA : ${prob}%</div><div class="small" style="margin-bottom:12px; color:var(--accent)">${questionTitle}</div>${imgHTML}<div class="question-text">Le patient présente-t-il :<br><strong style="font-size:1.2em; color:var(--text-main);">${formatSigneName(signe)}</strong> ?</div>`;
    if (state.isChrono) { setTimeout(startLiveTimer, 100); }

    if (state.useLLM && !state.confirmationMode) {
        const chatContainer = document.createElement('div');
        chatContainer.style.cssText = "margin: 20px 0; padding: 20px; background: rgba(102,126,234,0.1); border-radius: 16px; border: 2px solid rgba(102,126,234,0.3);";
        chatContainer.innerHTML = `<div style="font-size: 0.9em; margin-bottom: 12px; color: var(--accent); font-weight:bold; text-transform:uppercase; letter-spacing:1.5px; text-align:center;"><i class="ph-duotone ph-brain"></i> Répondez librement à l'IA</div><div style="display: flex; gap: 10px;"><input type="text" id="aiInput" class="input" placeholder="Ex: Oui, j'ai une douleur qui serre..." style="margin:0; flex:1; font-size:16px;"><button id="aiSendBtn" class="btn" style="width: auto; padding: 0 20px; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);"><i class="ph-bold ph-paper-plane-right"></i></button></div><div id="aiLoader" style="display:none; font-size: 0.85em; color: var(--text-muted); margin-top: 12px; text-align: center;"><i class="ph-bold ph-spinner ph-spin"></i> Analyse IA en cours...</div>`;
        setTimeout(() => {
            const inputField = document.getElementById('aiInput'); const sendBtn = document.getElementById('aiSendBtn'); const loader = document.getElementById('aiLoader');
            const handleAiSubmit = async () => {
                const text = inputField.value.trim(); if (!text) return;
                inputField.disabled = true; sendBtn.disabled = true; loader.style.display = 'block';
                const result = await analyzeResponseWithLLM(text, state.currentSign);
                loader.style.display = 'none'; inputField.disabled = false; sendBtn.disabled = false; inputField.value = ''; inputField.focus();
                if (result === true) { state.history.push(JSON.stringify({ answers: state.answers, asked: state.asked, currentSign: state.currentSign, confirmationMode: state.confirmationMode, confirmationQueue: state.confirmationQueue, confirmedPatho: state.confirmedPatho, priorityQueue: state.priorityQueue, isChrono: state.isChrono, startTime: state.startTime, dailyTarget: state.dailyTarget })); state.answers[state.currentSign] = true; if (REFINEMENTS[state.currentSign]) { let shuffled = [...REFINEMENTS[state.currentSign]].sort(() => Math.random() - 0.5); state.priorityQueue.push(...shuffled); } showAlert(`✅ L'IA a compris : OUI`, "success"); askNextQuestion(); } 
                else if (result === false) { state.history.push(JSON.stringify({ answers: state.answers, asked: state.asked, currentSign: state.currentSign, confirmationMode: state.confirmationMode, confirmationQueue: state.confirmationQueue, confirmedPatho: state.confirmedPatho, priorityQueue: state.priorityQueue, isChrono: state.isChrono, startTime: state.startTime, dailyTarget: state.dailyTarget })); state.answers[state.currentSign] = false; showAlert(`❌ L'IA a compris : NON`, "error"); askNextQuestion(); } 
                else { showAlert(`🤔 Réponse ambiguë. Reformulez (ex: "Oui" ou "Non, pas du tout")`, "error"); }
            };
            sendBtn.onclick = handleAiSubmit; inputField.onkeydown = (e) => { if(e.key === 'Enter') handleAiSubmit(); };
        }, 50);
        card.appendChild(chatContainer);
    } else {
        const btnGroup = document.createElement('div'); btnGroup.className = 'button-group';
        const btnOui = document.createElement('button'); btnOui.className = 'btn btn-success'; btnOui.innerHTML = '<i class="ph-bold ph-check"></i> OUI';
        btnOui.onclick = () => { state.history.push(JSON.stringify({ answers: state.answers, asked: state.asked, currentSign: state.currentSign, confirmationMode: state.confirmationMode, confirmationQueue: state.confirmationQueue, confirmedPatho: state.confirmedPatho, priorityQueue: state.priorityQueue, isChrono: state.isChrono, startTime: state.startTime, dailyTarget: state.dailyTarget })); state.answers[signe] = true; if (REFINEMENTS[signe]) { let shuffled = [...REFINEMENTS[signe]].sort(() => Math.random() - 0.5); state.priorityQueue.push(...shuffled); } askNextQuestion(); };
        btnGroup.appendChild(btnOui);
        const addOtherBtn = (txt, cls, val) => { const b = document.createElement('button'); b.className = cls; b.innerHTML = txt; b.onclick = () => { state.history.push(JSON.stringify({ answers: state.answers, asked: state.asked, currentSign: state.currentSign, confirmationMode: state.confirmationMode, confirmationQueue: state.confirmationQueue, confirmedPatho: state.confirmedPatho, priorityQueue: state.priorityQueue, isChrono: state.isChrono, startTime: state.startTime, dailyTarget: state.dailyTarget })); state.answers[signe] = val; askNextQuestion(); }; btnGroup.appendChild(b); };
        addOtherBtn('<i class="ph-bold ph-x"></i> NON', 'btn btn-error', false); addOtherBtn('Je ne sais pas', 'link', null); card.appendChild(btnGroup);
    }
    const navGroup = document.createElement('div'); navGroup.style.display = 'flex'; navGroup.style.gap = '15px'; navGroup.style.marginTop = '20px';
    if(state.history.length > 0) { const btnBack = document.createElement('button'); btnBack.className='btn-back'; btnBack.innerHTML='<i class="ph-duotone ph-caret-left"></i> Retour'; btnBack.onclick = () => { const prevState = JSON.parse(state.history.pop()); Object.assign(state, prevState); renderCurrentQuestion(); }; navGroup.appendChild(btnBack); }
    const btnAb = document.createElement('button'); btnAb.className='link'; btnAb.innerHTML='Abandonner'; btnAb.onclick = () => { if(state.isGuest) { showAlert("Action limitée en mode invité.", "error"); return; } showManualPathologySelection("abandon"); };
    navGroup.appendChild(btnAb); card.appendChild(navGroup); app.appendChild(card);
}

function showDiagnostic() {
    if (chronoInterval) clearInterval(chronoInterval);
    setDocTitle("Analyse..."); window.scrollTo(0, 0); const app = q('#app'); app.innerHTML = '';
    const loadingCard = document.createElement('div'); loadingCard.className = 'card center'; loadingCard.innerHTML = `<h3 style="color:var(--accent)"><i class="ph-duotone ph-magnifying-glass"></i> Analyse IA en cours...</h3><div style="margin: 30px 0; font-size: 50px; animation: spin 0.8s infinite linear;"><i class="ph-duotone ph-gear"></i></div><p class="small">Comparaison base de données...</p>`; app.appendChild(loadingCard);
    setTimeout(async () => {
        rankPathologies();
        const top = state.ranked.length > 0 ? state.ranked[0] : null;
        if (!top) { app.innerHTML = `<div class="card center"><h2 style="color:var(--error)">Aucun diagnostic trouvé</h2><p>L'IA n'a pas pu trancher. Essayez de donner plus de symptômes.</p><button class="btn" onclick="renderHome()">Retour Accueil</button></div>`; return; }
        state.diagnosticShown = true; state.previousDiagnostics.push(top.patho.name); setDocTitle(`Diagnostic : ${top.patho.name}`); app.innerHTML = ''; const card = document.createElement('div'); card.className = 'card center';
        const title = document.createElement('h2'); title.innerHTML = '<i class="ph-duotone ph-lightbulb"></i> Diagnostic Proposé'; card.appendChild(title);
        let pdfButton = ''; if (top.patho.pdf && top.patho.pdf !== '#') { if (state.isGuest && !state.isPremiumCode) { pdfButton = `<button class="btn" style="background:rgba(125,125,125,0.1); border:1px dashed var(--text-muted); color:var(--text-muted); margin-top:10px; font-size:13px;" onclick="showAlert('Compte requis pour le PDF', 'error')"><i class="ph-duotone ph-lock-key"></i> Fiche PDF (Verrouillée)</button>`; } else { pdfButton = `<a class="link" style="color:var(--accent); border-color:var(--accent); display:inline-block; margin-top:10px;" href="${top.patho.pdf}" target="_blank" onclick="trackPdf()"><i class="ph-duotone ph-file-pdf"></i> Voir fiche PDF de révision</a>`; } } else { pdfButton = `<span class="small" style="opacity:0.5"><i class="ph-duotone ph-file-x"></i> Pas de fiche PDF</span>`; }
        const diagDiv = document.createElement('div'); diagDiv.className = 'diagnostic-result'; diagDiv.innerHTML = `<div class="diagnostic-name">${top.patho.name}</div><div class="patho-desc" style="margin-top:8px">${top.patho.short}</div><br>${pdfButton}`; card.appendChild(diagDiv);
        const btnGroup = document.createElement('div'); btnGroup.className = 'button-group';
        
        if (state.exam && state.exam.active && state.dailyTarget) {
            const targetName = state.dailyTarget.name; const foundName = top.patho.name; const isSuccess = (targetName === foundName);
            if (isSuccess) { state.progression.correct++; state.progression.streak = (state.progression.streak || 0) + 1; if(!state.progression.mastery) state.progression.mastery = {}; let m = state.progression.mastery[targetName]; if(!m) m = { success: 0, failures: 0, missedSigns: {} }; if(typeof m === 'number') m = { success: m, failures: 0, missedSigns: {} }; m.success++; state.progression.mastery[targetName] = m; const todayKey = getLocalDayKey(); if(!state.progression.dailyHistory) state.progression.dailyHistory = {}; if(!state.progression.dailyHistory[todayKey]) { state.progression.dailyHistory[todayKey] = { success: [], fail: [] }; } state.progression.dailyHistory[todayKey].success.push({ name: targetName, time: Date.now() }); if (state.isChrono && state.startTime) { const totalSeconds = (Date.now() - state.startTime) / 1000; if (totalSeconds < 30) { state.progression.speedWins = (state.progression.speedWins || 0) + 1; } const bestTime = state.progression.bestTimes || {}; if (!bestTime[targetName] || totalSeconds < bestTime[targetName]) { bestTime[targetName] = totalSeconds; state.progression.bestTimes = bestTime; } } } 
            else { state.progression.incorrect++; state.progression.streak = 0; if(!state.progression.mastery) state.progression.mastery = {}; let m = state.progression.mastery[targetName]; if(!m) m = { success: 0, failures: 0, missedSigns: {} }; if(typeof m === 'number') m = { success: m, failures: 0, missedSigns: {} }; m.failures++; state.progression.mastery[targetName] = m; const todayKey = getLocalDayKey(); if(!state.progression.dailyHistory) state.progression.dailyHistory = {}; if(!state.progression.dailyHistory[todayKey]) { state.progression.dailyHistory[todayKey] = { success: [], fail: [] }; } state.progression.dailyHistory[todayKey].fail.push({ name: targetName, time: Date.now() }); }
            await saveProgression();
            if (state.exam.results.length === state.exam.currentIndex) { state.exam.results.push({ target: targetName, found: foundName, success: isSuccess, questions: state.asked.length }); }
            const resultBanner = document.createElement('div'); resultBanner.style.cssText = "width:100%; padding:15px; border-radius:12px; margin-top:20px; margin-bottom:20px; text-align:center; font-weight:bold;";
            if (isSuccess) { playSound('success'); triggerConfetti(); resultBanner.style.background = "rgba(0, 255, 157, 0.15)"; resultBanner.style.border = "1px solid var(--success)"; resultBanner.style.color = "var(--success)"; resultBanner.innerHTML = `<div style="font-size:2em; margin-bottom:10px;"><i class="ph-fill ph-check-circle"></i></div><div>DIAGNOSTIC CORRECT</div><div class="small" style="opacity:0.8; font-weight:normal;">L'IA a bien trouvé la pathologie cible.</div>`; } 
            else { playSound('error'); resultBanner.style.background = "rgba(255, 77, 77, 0.15)"; resultBanner.style.border = "1px solid var(--error)"; resultBanner.style.color = "var(--error)"; resultBanner.innerHTML = `<div style="font-size:2em; margin-bottom:10px;"><i class="ph-fill ph-x-circle"></i></div><div>DIAGNOSTIC INCORRECT</div><div class="small" style="opacity:0.8; font-weight:normal; margin-top:5px;">L'IA a proposé : <strong>${foundName}</strong><br>Il fallait faire deviner : <strong>${targetName}</strong></div>`; }
            card.appendChild(resultBanner);
            const isLast = state.exam.currentIndex + 1 >= state.exam.queue.length;
            const btnNext = document.createElement('button'); btnNext.className = 'btn'; btnNext.innerHTML = isLast ? '<i class="ph-bold ph-chart-line"></i> Voir les résultats finaux' : '<i class="ph-bold ph-arrow-right"></i> Cas Suivant';
            btnNext.onclick = () => { state.exam.currentIndex++; playNextExamCase(); };
            btnGroup.appendChild(btnNext);
        } else {
            let finalTimeStr = ""; if(state.isChrono && state.startTime) { if (chronoInterval) clearInterval(chronoInterval); const totalSeconds = Math.floor((Date.now() - state.startTime) / 1000); const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0'); const s = (totalSeconds % 60).toString().padStart(2, '0'); finalTimeStr = `<div style="font-size:1.1rem; color:var(--text-main); margin-top:5px; font-weight:bold;"><i class="ph-bold ph-timer"></i> Temps : ${m}:${s}</div>`; }
            const btnTrue = document.createElement('button'); btnTrue.className = 'btn btn-success'; btnTrue.innerHTML = '<i class="ph-bold ph-check"></i> Correct';
            btnTrue.onclick = async () => { if (state.isGuest) { localStorage.setItem('medicome_guest_last_play', Date.now().toString()); } triggerConfetti(); playSound('success'); state.progression.correct++; state.progression.streak = (state.progression.streak || 0) + 1; if(!state.progression.mastery) state.progression.mastery = {}; let m = state.progression.mastery[top.patho.name]; if(!m) m = { success: 0, failures: 0, missedSigns: {} }; if(typeof m === 'number') m = { success: m, failures: 0, missedSigns: {} }; m.success++; state.progression.mastery[top.patho.name] = m; const todayKey = getLocalDayKey(); if(!state.progression.dailyHistory) state.progression.dailyHistory = {}; if(!state.progression.dailyHistory[todayKey]) { state.progression.dailyHistory[todayKey] = { success: [], fail: [] }; } state.progression.dailyHistory[todayKey].success.push({ name: top.patho.name, time: Date.now() }); let finalTimeStr = ""; if(state.isChrono && state.startTime) { if (chronoInterval) clearInterval(chronoInterval); const totalSeconds = (Date.now() - state.startTime) / 1000; const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0'); const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0'); finalTimeStr = `<div style="font-size:1.1rem; color:var(--text-main); margin-top:5px; font-weight:bold;"><i class="ph-bold ph-timer"></i> Temps : ${m}:${s}</div>`; if (totalSeconds < 30) { state.progression.speedWins = (state.progression.speedWins || 0) + 1; } const bestTime = state.progression.bestTimes || {}; if (!bestTime[top.patho.name] || totalSeconds < bestTime[top.patho.name]) { bestTime[top.patho.name] = totalSeconds; state.progression.bestTimes = bestTime; } } if (state.dailyTarget) { const todayStr = new Date().toDateString(); state.progression.lastDaily = todayStr; state.progression.dailyStreak = (state.progression.dailyStreak || 0) + 1; } await saveProgression(); showAlert(`<i class="ph-duotone ph-check-circle"></i> Diagnostic validé !<br>${finalTimeStr}`, 'success'); showDiagnosticDetails({ patho: top.patho }); };
            const btnFalse = document.createElement('button'); btnFalse.className = 'btn btn-error'; btnFalse.innerHTML = '<i class="ph-bold ph-x"></i> Incorrect'; btnFalse.onclick = async () => { playSound('error'); showManualPathologySelection("incorrect_diagnosis"); };
            if(finalTimeStr) { const timeDiv = document.createElement('div'); timeDiv.innerHTML = finalTimeStr; timeDiv.style.marginBottom = "15px"; timeDiv.style.textAlign = "center"; timeDiv.style.background = "rgba(0, 210, 255, 0.1)"; timeDiv.style.padding = "10px"; timeDiv.style.borderRadius = "8px"; timeDiv.style.border = "1px solid var(--accent)"; card.appendChild(timeDiv); }
            btnGroup.appendChild(btnTrue); btnGroup.appendChild(btnFalse);
        }
        card.appendChild(btnGroup); app.appendChild(card);
    }, 1500);
}

function renderPlaisantinEnd(type) {
    setDocTitle("Diagnostic Surprise"); window.scrollTo(0,0); const app = q('#app'); app.innerHTML = '';
    const card = document.createElement('div'); card.className = 'card center'; playSound(type === "healthy" ? 'success' : 'error');
    if (type === "healthy") { card.innerHTML = `<div class="icon-lg color-success"><i class="ph-duotone ph-person-simple-walk"></i></div><h2 style="color:var(--success)">Diagnostic : Touriste !</h2><p style="margin-top:15px; font-weight:bold;">Ce patient n'a RIEN.</p><p class="small" style="margin-top:10px; line-height:1.6;">Après 12 questions négatives, il semblerait que ce patient se soit juste perdu dans l'hôpital en cherchant la machine à café.<br>Rentrez chez vous, vous êtes en parfaite santé !</p>`; } 
    else { card.innerHTML = `<div class="icon-lg color-ruby"><i class="ph-duotone ph-mask-happy"></i></div><h2 style="color:var(--ruby)">Diagnostic : Malade Imaginaire</h2><p style="margin-top:15px; font-weight:bold;">Syndrome de l'Hypocondriaque Massif</p><p class="small" style="margin-top:10px; line-height:1.6;">Le patient a TOUS les symptômes. Statistiquement, il devrait avoir explosé il y a 10 minutes.<br>Appelez Dr House, ou un psychiatre, c'est au choix.</p>`; }
    const btn = document.createElement('button'); btn.className = 'btn'; btn.innerHTML = '<i class="ph-duotone ph-arrow-counter-clockwise"></i> Recommencer sérieusement'; btn.style.marginTop = "20px"; btn.onclick = () => { state.dailyTarget = null; renderDemographics(); };
    card.appendChild(btn); app.appendChild(card);
}

// ============================================================
// 9. INTÉGRATION OPENAI (CHATGPT) & AI FUNCTIONS
// ============================================================

async function analyzeResponseWithLLM(userText, symptomContext) {
    if (!cachedOpenAIKey) { cachedOpenAIKey = prompt("🔐 Mode IA : Colle ta clé API OpenAI (sk-...) pour activer le chat :"); if (!cachedOpenAIKey) return null; }
    const promptSysteme = `Tu es un moteur de diagnostic médical pour une simulation étudiante. Le système vérifie la présence du signe : "${symptomContext}". L'étudiant répond : "${userText}". Analyse l'intention et réponds UNIQUEMENT via ce JSON : {"result": true} (si OUI), {"result": false} (si NON), {"result": null} (si vague).`;
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cachedOpenAIKey}` }, body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: promptSysteme }], temperature: 0 }) });
        if (!response.ok) { if(response.status === 401) alert("Clé API invalide."); throw new Error("Erreur API"); }
        const data = await response.json();
        let cleanContent = data.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
        const jsonResponse = JSON.parse(cleanContent);
        return jsonResponse.result;
    } catch (error) { console.error("Erreur IA:", error); return null; }
}

async function analyzeChiefComplaint(userText) {
    if (!cachedOpenAIKey) { cachedOpenAIKey = prompt("🔐 Clé OpenAI requise pour l'analyse du motif :"); if (!cachedOpenAIKey) return null; }
    const possibleSymptoms = GENERAL_SYMPTOMS.join(", ");
    const promptSysteme = `Tu es un assistant médical pédagogique. L'utilisateur décrit son problème principal. Ta mission : Associer sa phrase à L'UN des symptômes généraux suivants : [${possibleSymptoms}]. 1. Si correspondance claire, renvoie UNIQUEMENT le code. 2. Si vague, renvoie "null". Phrase: "${userText}"`;
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cachedOpenAIKey}` }, body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: promptSysteme }], temperature: 0 }) });
        const data = await response.json();
        const result = data.choices[0].message.content.trim().replace(/['"]+/g, '');
        if (GENERAL_SYMPTOMS.includes(result)) return result;
        return null;
    } catch (error) { console.error("Erreur IA Motif:", error); return null; }
}

async function analyzeDetailedSymptoms(userText) {
    if (!cachedOpenAIKey) { cachedOpenAIKey = prompt("🔐 Clé OpenAI requise pour l'analyse :"); if (!cachedOpenAIKey) return []; }
    if(!state.allSigns || state.allSigns.length === 0) prepareSigns();
    const allSignsList = state.allSigns.join(", ");
    const promptSysteme = `Tu es un assistant médical. Analyse le récit et trouve les signes cliniques. Voici la liste EXACTE des codes autorisés : [${allSignsList}]. Règles: 1. Analyse "${userText}". 2. Renvoie un tableau JSON de chaînes (ex: ["fievre", "toux"]). 3. Uniquement le JSON brut.`;
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cachedOpenAIKey}` }, body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: promptSysteme }], temperature: 0 }) });
        const data = await response.json();
        let content = data.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
        const foundSigns = JSON.parse(content);
        return foundSigns.filter(s => state.allSigns.includes(s));
    } catch (error) { console.error("Erreur Extraction IA:", error); return []; }
}

async function analyzeAnamnesis(userText) {
    if (!cachedOpenAIKey) { cachedOpenAIKey = prompt("🔐 Clé OpenAI requise pour l'analyse :"); if (!cachedOpenAIKey) return null; }
    if (!state.allSigns || state.allSigns.length === 0) { let allSignsSet = new Set(); PATHOLOGIES.forEach(p => { Object.keys(p.signes).forEach(s => allSignsSet.add(s)); }); state.allSigns = Array.from(allSignsSet); }
    const signsList = state.allSigns.join(", ");
    const promptSysteme = `Tu es un assistant médical expert. Voici une liste de codes de symptômes possibles : [${signsList}]. L'utilisateur va décrire son histoire clinique. Ta mission : 1. Repère tous les symptômes de la liste PRÉSENTS. 2. Repère ceux ABSENTS. 3. Renvoie UNIQUEMENT un objet JSON valide : { "detected": ["code1"], "rejected": ["code2"] }.`;
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cachedOpenAIKey}` }, body: JSON.stringify({ model: "gpt-4o-mini", messages: [ { role: "system", content: promptSysteme }, { role: "user", content: userText } ], temperature: 0 }) });
        const data = await response.json();
        let cleanContent = data.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanContent);
    } catch (error) { console.error("Erreur Anamnèse IA:", error); return null; }
}

// ============================================================
// 10. PAGES & MODES (EXAMEN, PROFIL, ETC)
// ============================================================

function renderChiefComplaintInput() {
    setDocTitle("Motif de consultation"); window.scrollTo(0,0); const app = q('#app'); app.innerHTML='';
    const card = document.createElement('div'); card.className='card center';
    card.innerHTML = `<h2><i class="ph-duotone ph-chats-teardrop color-accent"></i> Motif de consultation</h2><p class="small" style="margin-bottom:20px;">Décrivez ce que ressent le patient pour orienter l'interrogatoire.</p><div style="background:rgba(102,126,234,0.1); padding:15px; border-radius:12px; margin-bottom:20px; text-align:left;"><label style="display:block; margin-bottom:10px; font-weight:bold; color:var(--accent);">"Bonjour ${state.pseudo}, qu'est-ce qui vous amène ?"</label><textarea id="motifInput" class="input" placeholder="Ex: J'ai une barre dans la poitrine qui serre fort..." style="min-height:80px;"></textarea></div><button id="btnValidateMotif" class="btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"><i class="ph-bold ph-paper-plane-right"></i> Envoyer</button><button id="btnSkipMotif" class="link" style="margin-top:15px; font-size:0.9em; opacity:0.7;">Passer (Mode aléatoire classique)</button>`;
    app.appendChild(card);
    q('#btnSkipMotif').onclick = () => { renderDemographics(); };
    q('#btnValidateMotif').onclick = async () => {
        const text = q('#motifInput').value; if(!text) return;
        const btn = q('#btnValidateMotif'); btn.innerHTML = '<i class="ph-duotone ph-spinner ph-spin"></i> Analyse...'; btn.disabled = true;
        const detectedSymptom = await analyzeChiefComplaint(text);
        if (detectedSymptom) {
            state.currentSign = detectedSymptom; state.asked = [detectedSymptom]; state.answers[detectedSymptom] = true; 
            state.demo = { adulte: true, homme: true }; 
            showAlert(`🔍 Orientation : ${formatSigneName(detectedSymptom)}`, "success");
            setTimeout(() => { renderAnamnesisInput(detectedSymptom); }, 1000);
        } else { showAlert("Motif trop vague ou inconnu. On passe au profil classique.", "error"); setTimeout(renderDemographics, 1500); }
    };
}

function renderAnamnesisInput(chiefComplaint) {
    setDocTitle("Anamnèse"); window.scrollTo(0,0); const app = q('#app'); app.innerHTML='';
    const card = document.createElement('div'); card.className='card center';
    const formattedComplaint = formatSigneName(chiefComplaint);
    card.innerHTML = `<h2><i class="ph-duotone ph-chat-text color-accent"></i> L'histoire de la maladie</h2><div style="margin-bottom:20px; background:rgba(0, 255, 157, 0.1); padding:10px; border-radius:8px; border:1px solid var(--success); color:var(--success);"><i class="ph-bold ph-check"></i> Motif identifié : <strong>${formattedComplaint}</strong></div><p class="small" style="margin-bottom:15px;">"Je vois. Pouvez-vous me raconter plus en détails ce qu'il s'est passé ? Depuis quand ? D'autres douleurs ? Des antécédents ?"</p><textarea id="anamnesisText" class="input" placeholder="Ex: C'est arrivé brutalement hier soir, j'ai aussi envie de vomir et j'ai des sueurs froides..." style="min-height:120px;"></textarea><button id="btnSendAnamnesis" class="btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"><i class="ph-bold ph-magic-wand"></i> Analyser & Commencer</button><button id="btnSkipAnamnesis" class="link" style="margin-top:15px;">Passer cette étape</button>`;
    app.appendChild(card);
    q('#btnSkipAnamnesis').onclick = () => { state.useLLM = false; askNextQuestion(); };
    q('#btnSendAnamnesis').onclick = async () => {
        const text = q('#anamnesisText').value; if(!text) return; 
        const btn = q('#btnSendAnamnesis'); btn.innerHTML = '<i class="ph-duotone ph-spinner ph-spin"></i> Analyse IA en cours...'; btn.disabled = true;
        const analysis = await analyzeAnamnesis(text);
        if (analysis) {
            let countNew = 0;
            if(analysis.detected && analysis.detected.length > 0) { analysis.detected.forEach(sign => { if(state.allSigns.includes(sign) && !state.asked.includes(sign)) { state.answers[sign] = true; state.asked.push(sign); countNew++; } }); }
            if(analysis.rejected && analysis.rejected.length > 0) { analysis.rejected.forEach(sign => { if(state.allSigns.includes(sign) && !state.asked.includes(sign)) { state.answers[sign] = false; state.asked.push(sign); countNew++; } }); }
            if (countNew > 0) { showAlert(`✅ L'IA a détecté ${countNew} informations !`, "success"); } else { showAlert(`L'IA n'a pas trouvé de nouveaux symptômes connus.`, "warning"); }
            setTimeout(() => { state.useLLM = false; askNextQuestion(); }, 1500);
        } else { showAlert("Erreur d'analyse. On passe aux questions.", "error"); setTimeout(() => { state.useLLM = false; askNextQuestion(); }, 1000); }
    };
}

function renderExamConfig() {
    setDocTitle("Configuration Examen"); window.scrollTo(0,0); const app = q('#app'); app.innerHTML='';
    const card = document.createElement('div'); card.className='card center';
    card.innerHTML = `<h2><i class="ph-duotone ph-exam"></i> Examen Blanc</h2><p class="small" style="margin-bottom:25px">Configurez votre épreuve de révision</p>`;
    const nbLabel = document.createElement('div'); nbLabel.className = 'section-label'; nbLabel.textContent = 'Nombre de cas'; card.appendChild(nbLabel);
    const chipsNb = document.createElement('div'); chipsNb.className = 'chips-container'; let selectedCount = 10; 
    [3, 5, 10, 20, 30].forEach(n => { const chip = document.createElement('div'); chip.className = n === 10 ? 'chip selected' : 'chip'; chip.innerHTML = `<i class="ph-duotone ph-clipboard-text"></i> ${n} cas`; chip.onclick = () => { selectedCount = n; chipsNb.querySelectorAll('.chip').forEach(c => c.classList.remove('selected')); chip.classList.add('selected'); }; chipsNb.appendChild(chip); }); card.appendChild(chipsNb);
    const specLabel = document.createElement('div'); specLabel.className = 'section-label'; specLabel.textContent = 'Spécialités'; card.appendChild(specLabel);
    const chipsSpec = document.createElement('div'); chipsSpec.className = 'chips-container'; const uniqueSpecs = [...new Set(Object.values(PATHO_GROUPS))].sort(); const selectedSpecs = new Set(uniqueSpecs);
    uniqueSpecs.forEach(spec => { const chip = document.createElement('div'); chip.className = 'chip selected'; chip.innerHTML = `<i class="ph-duotone ph-check-circle"></i> ${spec}`; chip.onclick = () => { if (selectedSpecs.has(spec)) { if(selectedSpecs.size === 1) return showAlert("Gardez au moins une spécialité", "error"); selectedSpecs.delete(spec); chip.classList.remove('selected'); chip.innerHTML = `<i class="ph-duotone ph-circle"></i> ${spec}`; } else { selectedSpecs.add(spec); chip.classList.add('selected'); chip.innerHTML = `<i class="ph-duotone ph-check-circle"></i> ${spec}`; } }; chipsSpec.appendChild(chip); }); card.appendChild(chipsSpec);
    const optLabel = document.createElement('div'); optLabel.className = 'section-label'; optLabel.textContent = 'Options'; card.appendChild(optLabel);
    const chipsOpt = document.createElement('div'); chipsOpt.className = 'chips-container'; let withTimer = true;
    const chipTimer = document.createElement('div'); chipTimer.className = 'chip selected'; chipTimer.innerHTML = '<i class="ph-duotone ph-timer"></i> Chronomètre'; chipTimer.onclick = () => { withTimer = !withTimer; chipTimer.classList.toggle('selected'); }; chipsOpt.appendChild(chipTimer); card.appendChild(chipsOpt);
    const btnStart = document.createElement('button'); btnStart.className='btn'; btnStart.innerHTML='<i class="ph-bold ph-play"></i> Démarrer l\'examen'; btnStart.style.marginTop='30px';
    btnStart.onclick = () => startExamSession({ count: selectedCount, specs: Array.from(selectedSpecs), timer: withTimer });
    const btnBack = document.createElement('button'); btnBack.className='link'; btnBack.textContent='Annuler'; btnBack.onclick=renderHome;
    card.append(btnStart, btnBack); app.appendChild(card);
}

function startExamSession(config) {
    const pool = PATHOLOGIES.filter(p => { const group = PATHO_GROUPS[p.name]; return config.specs.includes(group); });
    if (pool.length < config.count) return showAlert(`Pas assez de pathologies dans ces spécialités (${pool.length} disponibles)`, "error");
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const queue = shuffled.slice(0, config.count);
    state.exam = { active: true, queue: queue, results: [], currentIndex: 0, totalTime: 0, config: config, startTime: Date.now() };
    playNextExamCase();
}

function playNextExamCase() {
    const exam = state.exam;
    if (exam.currentIndex >= exam.queue.length) { renderExamSummary(); return; }
    const targetPatho = exam.queue[exam.currentIndex];
    state.dailyTarget = targetPatho; state.isChrono = exam.config.timer;
    renderExamCaseIntro(targetPatho, exam.currentIndex + 1, exam.queue.length);
}

function renderExamCaseIntro(patho, current, total) {
    window.scrollTo(0,0); const app = q('#app'); app.innerHTML=''; const card = document.createElement('div'); card.className='card center';
    const progress = Math.round((current / total) * 100);
    card.innerHTML = `<div style="width:100%; background:rgba(125,125,125,0.1); border-radius:10px; height:6px; margin-bottom:20px;"><div style="width:${progress}%; background:var(--accent); height:100%; border-radius:10px; transition:0.3s;"></div></div><div class="small" style="color:var(--accent); margin-bottom:10px;"><i class="ph-duotone ph-student"></i> EXAMEN BLANC • CAS ${current}/${total}</div><h2 style="margin:20px 0;">Faites deviner :</h2><div style="font-size:1.8rem; font-weight:bold; color:var(--text-main); margin:20px 0;">${patho.name}</div><div style="background:rgba(0,210,255,0.1); padding:15px; border-radius:12px; border-left:3px solid var(--accent); margin:20px 0;"><i class="ph-duotone ph-info"></i> Répondez aux questions en pensant à cette pathologie</div>`;
    const btnGo = document.createElement('button'); btnGo.className='btn btn-success'; btnGo.innerHTML='<i class="ph-bold ph-play"></i> Commencer le cas';
    btnGo.onclick = () => { state.answers = {}; state.asked = []; state.diagnosticShown = false; state.history = []; state.confirmationMode = false; renderDemographics(); };
    card.appendChild(btnGo); app.appendChild(card);
}

function renderExamSummary() {
    setDocTitle("Résultats Examen"); state.exam.active = false; state.dailyTarget = null;
    const totalTime = Math.round((Date.now() - state.exam.startTime) / 1000); state.exam.totalTime = totalTime;
    const app = q('#app'); app.innerHTML=''; const card = document.createElement('div'); card.className='card center';
    const correctCount = state.exam.results.filter(r => r.success).length; const total = state.exam.results.length; const percentage = Math.round((correctCount / total) * 100);
    let grade = percentage >= 90 ? "Excellent" : percentage >= 70 ? "Bien" : percentage >= 50 ? "Moyen" : "À revoir";
    let color = percentage >= 70 ? 'var(--success)' : percentage >= 50 ? 'var(--gold)' : 'var(--error)';
    const minutes = Math.floor(totalTime / 60); const seconds = totalTime % 60;
    card.innerHTML = `<h2><i class="ph-duotone ph-check-circle"></i> Examen Terminé</h2><div style="margin:30px 0;"><div style="font-size:4rem; font-weight:bold; color:${color};">${percentage}%</div><div style="font-size:1.2rem; color:var(--text-muted); margin-top:10px;">${grade}</div></div><div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; width:100%; margin-bottom:30px;"><div class="stat-box"><div class="stat-number" style="color:var(--success)">${correctCount}</div><div class="stat-label">Réussites</div></div><div class="stat-box"><div class="stat-number" style="color:var(--text-muted)">${minutes}:${seconds.toString().padStart(2,'0')}</div><div class="stat-label">Temps total</div></div></div><div class="result-section-title" style="width:100%; text-align:left;"><i class="ph-bold ph-list"></i> Détails des cas</div>`;
    const resultList = document.createElement('div'); resultList.className = 'result-list';
    state.exam.results.forEach((res, idx) => {
        const icon = res.success ? '<i class="ph-fill ph-check-circle" style="color:var(--success); font-size:1.3em;"></i>' : '<i class="ph-fill ph-x-circle" style="color:var(--error); font-size:1.3em;"></i>';
        const detail = res.success ? `${res.questions} questions` : `Confondu avec ${res.found}`;
        const row = document.createElement('div'); row.className = 'result-item';
        row.innerHTML = `<div style="display:flex; align-items:center; gap:10px;">${icon}<strong>${res.target}</strong></div><div style="font-size:0.85em; color:var(--text-muted);">${detail}</div>`;
        resultList.appendChild(row);
    });
    card.appendChild(resultList);
    const btnHome = document.createElement('button'); btnHome.className='btn'; btnHome.innerHTML='<i class="ph-duotone ph-house"></i> Retour Accueil'; btnHome.style.marginTop='30px'; btnHome.onclick=renderHome;
    card.appendChild(btnHome); app.appendChild(card);
}

function showManualPathologySelection(reason) {
    setDocTitle("Quelle pathologie ?"); window.scrollTo(0,0); const app = q('#app'); app.innerHTML = '';
    const card = document.createElement('div'); card.className='card center';
    if(reason === "incorrect_diagnosis") { card.innerHTML = `<h2 style="color:var(--error)"><i class="ph-duotone ph-magnifying-glass"></i> L'IA s'est trompée ?</h2><p class="small" style="margin-bottom:20px">Sélectionnez la pathologie à laquelle vous pensiez vraiment.</p>`; } 
    else { card.innerHTML = `<h2><i class="ph-duotone ph-book-open"></i> Abandon du cas</h2><p class="small" style="margin-bottom:20px">Vous arrêtez le cas clinique en cours.</p>`; }
    const btnHome = document.createElement('button'); btnHome.className='btn'; btnHome.innerHTML='<i class="ph-duotone ph-house"></i> Retour Accueil'; btnHome.onclick = renderHome;
    card.appendChild(btnHome);
    const divSearch = document.createElement('div'); divSearch.style.marginTop = '30px'; divSearch.style.width = '100%'; divSearch.style.borderTop = '1px solid var(--glass-border)'; divSearch.style.paddingTop = '20px';
    divSearch.innerHTML = `<p style="margin-bottom:10px; color:var(--accent); font-weight:600;"><i class="ph-duotone ph-lightbulb"></i> Je pensais à une pathologie précise :</p>`;
    const select = document.createElement('select'); select.className = 'input'; select.innerHTML = '<option value="">-- Choisir la pathologie --</option>';
    [...PATHOLOGIES].sort((a,b) => a.name.localeCompare(b.name)).forEach(p => { select.innerHTML += `<option value="${p.name}">${p.name}</option>`; });
    select.onchange = async () => {
        if(!select.value) return;
        const patho = PATHOLOGIES.find(p => p.name === select.value);
        state.progression.incorrect++; state.progression.streak = 0;
        const todayKey = getLocalDayKey();
        if(!state.progression.dailyHistory) state.progression.dailyHistory = {};
        if(!state.progression.dailyHistory[todayKey]) state.progression.dailyHistory[todayKey] = { success: [], fail: [] };
        state.progression.dailyHistory[todayKey].fail.push({ name: patho.name, time: Date.now() });
        if(!state.progression.mastery) state.progression.mastery = {};
        let m = state.progression.mastery[patho.name];
        if(!m) m = { success: 0, failures: 0, missedSigns: {} };
        if(typeof m === 'number') m = { success: m, failures: 0, missedSigns: {} };
        m.failures++;
        state.progression.mastery[patho.name] = m;
        if(!state.progression.errorLog) state.progression.errorLog = {};
        state.progression.errorLog[patho.name] = { date: Date.now(), count: (state.progression.errorLog[patho.name]?.count || 0) + 1 };
        await saveProgression();
        showDiagnosticDetails({patho: patho}, true);
    };
    divSearch.appendChild(select); card.appendChild(divSearch); app.appendChild(card);
}

function renderProfile() {
    if (state.isGuest) { showAlert("L'accès au profil est réservé aux utilisateurs connectés.", "error"); return; }
    setDocTitle("Profil"); window.scrollTo(0, 0); const app = q('#app'); app.innerHTML = ''; const prog = state.progression;
    const card = document.createElement('div'); card.className = 'card center'; card.style.maxWidth = '800px';
    let contentHTML = `<h2>Profil de ${state.pseudo}</h2>`;
    const groupScores = {}; let maxScore = 0; let bestGroup = null;
    Object.keys(prog.mastery || {}).forEach(pName => {
        const data = prog.mastery[pName]; const count = (typeof data === 'number') ? data : (data.success || 0);
        if (count > 0) { const group = PATHO_GROUPS[pName] || "Autre"; if (!groupScores[group]) groupScores[group] = 0; groupScores[group] += count; if (groupScores[group] > maxScore) { maxScore = groupScores[group]; bestGroup = group; } }
    });
    if (bestGroup && maxScore >= 3) { contentHTML += `<div class="specialty-badge"><i class="ph-duotone ph-medal"></i> Spécialiste ${bestGroup}</div>`; }
    const totalPathos = PATHOLOGIES.length;
    const unlockedPathos = Object.keys(prog.mastery || {}).filter(k => { const d = prog.mastery[k]; const s = (typeof d === 'number') ? d : d.success; return s > 0; }).length;
    const percentage = totalPathos > 0 ? Math.round((unlockedPathos / totalPathos) * 100) : 0;
    contentHTML += `<div style="width:100%; background:rgba(125,125,125,0.1); border-radius:10px; height:10px; margin-bottom:5px; overflow:hidden;"><div style="width:${percentage}%; background:var(--accent); height:100%;"></div></div><div class="small" style="margin-bottom:30px;">Progression globale : ${percentage}% (${unlockedPathos}/${totalPathos})</div>`;
    card.innerHTML = contentHTML;
    const btnAch = document.createElement('button'); btnAch.className='btn'; btnAch.style.background = 'var(--gold)'; btnAch.style.color = 'black'; btnAch.style.marginBottom = '20px'; btnAch.innerHTML = '<i class="ph-duotone ph-trophy"></i> Voir mes Succès'; btnAch.onclick = renderAchievementsPage;
    const btnCal = document.createElement('button'); btnCal.className='btn'; btnCal.style.background = 'var(--accent)'; btnCal.style.marginBottom = '10px'; btnCal.innerHTML = '<i class="ph-duotone ph-calendar-check"></i> Calendrier Intelligent'; btnCal.onclick = () => renderCalendar();
    card.appendChild(btnCal); card.appendChild(btnAch);
    const masteryTitle = document.createElement('h3'); masteryTitle.innerHTML = 'Maitrise Clinique'; masteryTitle.style.marginTop = "30px"; card.appendChild(masteryTitle);
    const masteryGrid = document.createElement('div'); masteryGrid.className = 'mastery-grid';
    const sortedPathos = [...PATHOLOGIES].sort((a, b) => a.name.localeCompare(b.name));
    const masteryData = prog.mastery || {};
    sortedPathos.forEach(p => {
        const m = masteryData[p.name]; const successCount = (typeof m === 'number') ? m : (m?.success || 0); const mItem = document.createElement('div');
        let sClass = 'm-locked', icon = '<i class="ph-duotone ph-lock-key"></i>';
        if (successCount >= 10) { sClass = 'm-master'; icon = '<i class="ph-duotone ph-diamond color-ruby"></i>'; } else if (successCount >= 5) { sClass = 'm-gold'; icon = '<i class="ph-duotone ph-trophy color-gold"></i>'; } else if (successCount >= 3) { sClass = 'm-silver'; icon = '<i class="ph-duotone ph-medal color-silver"></i>'; } else if (successCount >= 1) { sClass = 'm-bronze'; icon = '<i class="ph-duotone ph-medal color-bronze"></i>'; }
        mItem.className = `mastery-item ${sClass}`; mItem.innerHTML = `<div class="mastery-icon">${icon}</div><div class="mastery-name">${p.name}</div><div class="mastery-count">${successCount} réussite(s)</div>`; mItem.onclick = () => renderPathoStats(p); masteryGrid.appendChild(mItem);
    });
    card.appendChild(masteryGrid);
    const btnBack = document.createElement('button'); btnBack.className = 'btn'; btnBack.textContent = 'Retour'; btnBack.style.marginTop = '20px'; btnBack.onclick = renderHome; card.appendChild(btnBack); app.appendChild(card);
}

function showDiagnosticDetails(data, wasManualError = false) {
    if (chronoInterval) clearInterval(chronoInterval);
    if (!data || !data.patho) { console.error("Erreur : Aucune pathologie."); return; }
    window.scrollTo(0, 0); const top = data.patho; setDocTitle(top.name); const app = q('#app'); app.innerHTML = '';
    const card = document.createElement('div'); card.className = 'card';
    if (wasManualError) {
        card.innerHTML = `<h2 style="color:var(--error)"><i class="ph-duotone ph-x-circle"></i> C'était : ${top.name}</h2><div class="alert alert-error" style="margin-top:15px;"><i class="ph-bold ph-warning"></i> Analysons tes erreurs pour que tu progresses !</div>`;
        if(!state.progression.mastery) state.progression.mastery = {}; let m = state.progression.mastery[top.name];
        if(!m) m = { success: 0, failures: 0, missedSigns: {} }; if(typeof m === 'number') m = { success: m, failures: 0, missedSigns: {} }; m.failures++;
        Object.keys(top.signes).forEach(s => { if(state.answers[s] === false || state.answers[s] === null) { if(!m.missedSigns[s]) m.missedSigns[s] = 0; m.missedSigns[s]++; } });
        Object.keys(state.answers).forEach(s => { if (state.answers[s] === true && !top.signes[s]) { if(!m.missedSigns[s]) m.missedSigns[s] = 0; m.missedSigns[s]++; } });
        state.progression.mastery[top.name] = m;
        if(!state.progression.errorLog) state.progression.errorLog = {}; state.progression.errorLog[top.name] = { date: Date.now(), count: (state.progression.errorLog[top.name]?.count || 0) + 1 }; saveProgression();
    } else {
        card.innerHTML = `<h2><i class="ph-duotone ph-check-circle color-success"></i> Bravo ! C'est bien : ${top.name}</h2>`;
    }
    const desc = document.createElement('div'); desc.className = 'patho-desc'; desc.textContent = top.short; desc.style.marginBottom = '20px'; desc.style.textAlign = 'center'; card.appendChild(desc);
    if (top.signes) {
        const resultsDiv = document.createElement('div'); resultsDiv.className = 'result-list';
        const goodSigns = Object.keys(state.answers).filter(s => state.answers[s] === true && top.signes[s]);
        const missedSigns = Object.keys(top.signes).filter(s => top.signes[s] >= 10 && state.answers[s] !== true);
        const wrongSigns = Object.keys(state.answers).filter(s => state.answers[s] === true && !top.signes[s]);
        if (goodSigns.length > 0) {
            resultsDiv.innerHTML += `<div class="result-section-title" style="color:var(--success)"><i class="ph-bold ph-check"></i> ✅ Bien vu (${goodSigns.length})</div>`;
            goodSigns.forEach(s => { resultsDiv.innerHTML += `<div class="result-item"><div class="result-label">${formatSigneName(s)}</div><div class="status-badge badge-correct">+${top.signes[s]} pts</div></div>`; });
        }
        const realMistakes = missedSigns.filter(s => state.answers[s] === false || state.answers[s] === null);
        const notAsked = missedSigns.filter(s => state.answers[s] === undefined);
        if (realMistakes.length > 0) {
            resultsDiv.innerHTML += `<div class="result-section-title" style="color:var(--error); margin-top:15px;"><i class="ph-bold ph-x-circle"></i> ❌ Signes que tu as RATÉS (${realMistakes.length})</div><div class="small" style="text-align:left; margin-bottom:5px; opacity:0.8; padding:0 15px;">Ces signes existaient, mais tu as répondu <strong>NON</strong> ou <strong>JE NE SAIS PAS</strong> :</div>`;
            realMistakes.sort((a,b) => top.signes[b] - top.signes[a]).forEach(s => { const userMsg = state.answers[s] === false ? "❌ Tu as dit NON" : "❓ Tu as dit JE NE SAIS PAS"; resultsDiv.innerHTML += `<div class="result-item" style="background:rgba(255,77,77,0.05);"><div class="result-label">${formatSigneName(s)}<span style="font-size:0.85em; opacity:0.6; margin-left:8px;">(Poids : ${top.signes[s]})</span></div><div class="status-badge badge-missing">${userMsg}</div></div>`; });
        }
        if (notAsked.length > 0) {
            resultsDiv.innerHTML += `<div class="result-section-title" style="color:#6c9bd1; margin-top:15px;"><i class="ph-bold ph-info"></i> ℹ️ Signes non explorés (${notAsked.length})</div><div class="small" style="text-align:left; margin-bottom:5px; opacity:0.8; padding:0 15px;">L'IA n'a pas eu le temps de poser ces questions :</div>`;
            notAsked.sort((a,b) => top.signes[b] - top.signes[a]).forEach(s => { resultsDiv.innerHTML += `<div class="result-item" style="opacity:0.7;"><div class="result-label">${formatSigneName(s)}<span style="font-size:0.85em; opacity:0.6; margin-left:8px;">(Poids : ${top.signes[s]})</span></div><div class="status-badge badge-neutral">⏭️ Pas demandé</div></div>`; });
        }
        if (wrongSigns.length > 0) {
            resultsDiv.innerHTML += `<div class="result-section-title" style="color:orange; margin-top:15px;"><i class="ph-bold ph-prohibit"></i> 🚫 Signes cochés À TORT (${wrongSigns.length})</div><div class="small" style="text-align:left; margin-bottom:5px; opacity:0.8; padding:0 15px;">Ces signes n'existent PAS dans "${top.name}" :</div>`;
            wrongSigns.forEach(s => { resultsDiv.innerHTML += `<div class="result-item"><div class="result-label">${formatSigneName(s)}</div><div class="status-badge badge-neutral">❌ Inexistant</div></div>`; });
        }
        card.appendChild(resultsDiv);
    }
    let pdfButton = '';
    if (top.pdf && top.pdf !== '#') {
        if (state.isGuest && !state.isPremiumCode) { pdfButton = `<button class="btn" style="background:rgba(125,125,125,0.1); border:1px dashed var(--text-muted); color:var(--text-muted); margin-top:10px; font-size:13px;" onclick="showAlert('Compte requis pour le PDF', 'error')"><i class="ph-duotone ph-lock-key"></i> Fiche PDF (Verrouillée)</button>`; } 
        else { pdfButton = `<a class="link" style="color:var(--accent); border-color:var(--accent); display:inline-block; margin-top:10px;" href="${top.pdf}" target="_blank" onclick="trackPdf()"><i class="ph-duotone ph-file-pdf"></i> Voir fiche PDF de révision</a>`; }
        const pdfContainer = document.createElement('div'); pdfContainer.style.textAlign = 'center'; pdfContainer.style.width = '100%'; pdfContainer.innerHTML = pdfButton; card.appendChild(pdfContainer); 
    } else { card.innerHTML += `<div class="small" style="margin-top:10px; opacity:0.5; text-align:center;">Pas de fiche PDF disponible</div>`; }
    const btnGroup = document.createElement('div'); btnGroup.className = 'button-group';
    if (state.exam && state.exam.active) {
        const isSuccess = (top.name === state.dailyTarget.name);
        if (state.exam.results.length === state.exam.currentIndex) { state.exam.results.push({ target: state.dailyTarget.name, found: top.name, success: isSuccess, questions: state.asked.length }); }
        const isLast = state.exam.currentIndex + 1 >= state.exam.queue.length;
        const btnNext = document.createElement('button'); btnNext.className = 'btn'; btnNext.innerHTML = isLast ? '<i class="ph-bold ph-chart-line"></i> Voir les résultats' : '<i class="ph-bold ph-arrow-right"></i> Cas Suivant';
        btnNext.onclick = () => { state.exam.currentIndex++; playNextExamCase(); };
        btnGroup.appendChild(btnNext);
    } else {
        const btnReplay = document.createElement('button'); btnReplay.className = 'btn btn-success'; btnReplay.innerHTML = '<i class="ph-duotone ph-arrow-clockwise"></i> Rejouer';
        btnReplay.onclick = () => { const limit = checkGuestLimit(); if (!limit.allowed) { showAlert(`Mode invité limité !`, "error"); return; } state.dailyTarget = null; renderDemographics(); };
        const btnHome = document.createElement('button'); btnHome.className = 'link'; btnHome.innerHTML = '<i class="ph-duotone ph-house"></i> Accueil'; btnHome.onclick = renderHome;
        btnGroup.append(btnReplay, btnHome);
    }
    card.appendChild(btnGroup); app.appendChild(card);
}

function renderGlossary() {
    if (state.isGuest && !state.isPremiumCode) { showAlert("Le glossaire est réservé aux membres inscrits.", "error"); return; }
    setDocTitle("Glossaire"); window.scrollTo(0,0); const app = q('#app'); app.innerHTML='';
    const titleCard = document.createElement('div'); titleCard.className='card center'; titleCard.innerHTML='<h2><i class="ph-duotone ph-book-bookmark"></i> Glossaire</h2>'; 
    const btnBack = document.createElement('button'); btnBack.className='link'; btnBack.innerHTML='<i class="ph-duotone ph-house"></i> Retour'; btnBack.style.marginBottom='20px'; btnBack.onclick=renderHome; titleCard.appendChild(btnBack); app.appendChild(titleCard);
    const searchContainer = document.createElement('div'); searchContainer.className = 'search-container';
    const searchInput = document.createElement('input'); searchInput.className = 'search-input'; searchInput.placeholder = 'Rechercher une pathologie (ex: Grippe...)'; searchInput.type = 'text';
    const searchIcon = document.createElement('div'); searchIcon.innerHTML = `<svg class="search-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`;
    searchContainer.appendChild(searchIcon); searchContainer.appendChild(searchInput); app.appendChild(searchContainer);
    const wrapper = document.createElement('div'); wrapper.className = 'glossary-wrapper';
    const sidebar = document.createElement('div'); sidebar.className = 'alphabet-sidebar';
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const sortedPathos = [...PATHOLOGIES].sort((a, b) => a.name.localeCompare(b.name));
    const existingLetters = new Set(sortedPathos.map(p => p.name.charAt(0).toUpperCase()));
    alphabet.forEach(letter => { const link = document.createElement('a'); link.textContent = letter; link.className = 'alpha-link'; if (existingLetters.has(letter)) { link.href = `#letter-${letter}`; link.onclick = (e) => { e.preventDefault(); const target = document.getElementById(`letter-${letter}`); if(target) target.scrollIntoView({behavior: 'smooth', block: 'start'}); }; } else { link.classList.add('disabled'); } sidebar.appendChild(link); });
    wrapper.appendChild(sidebar);
    const content = document.createElement('div'); content.className = 'glossary-content';
    function renderGrid(pathos, showHeaders = true) {
        content.innerHTML = ''; if(pathos.length === 0) { content.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted)">Aucune pathologie trouvée.</div>'; return; }
        if(!showHeaders) { const grid = document.createElement('div'); grid.className = 'letter-grid'; pathos.forEach(p => { grid.appendChild(createPathoCard(p)); }); content.appendChild(grid); } 
        else { alphabet.forEach(letter => { const letterPathos = pathos.filter(p => p.name.charAt(0).toUpperCase() === letter); if(letterPathos.length > 0) { const letterHeader = document.createElement('div'); letterHeader.className = 'letter-header'; letterHeader.id = `letter-${letter}`; letterHeader.textContent = letter; content.appendChild(letterHeader); const grid = document.createElement('div'); grid.className = 'letter-grid'; letterPathos.forEach(p => { grid.appendChild(createPathoCard(p)); }); content.appendChild(grid); } }); }
    }
    function createPathoCard(p) {
        const card = document.createElement('div'); card.className = 'patho-card';
        card.innerHTML = `<div class="patho-name">${p.name}</div><div class="patho-desc">${p.short}</div>`;
        card.onclick = () => { if(p.pdf && p.pdf !== '#') { trackPdf(); window.open(p.pdf,'_blank'); } else { showAlert('Fiche PDF non disponible','error'); } };
        return card;
    }
    renderGrid(sortedPathos, true);
    searchInput.addEventListener('input', (e) => { const term = e.target.value.toLowerCase(); if(term.length > 0) { sidebar.style.display = 'none'; const filtered = sortedPathos.filter(p => p.name.toLowerCase().includes(term)); renderGrid(filtered, false); } else { sidebar.style.display = 'flex'; renderGrid(sortedPathos, true); } });
    wrapper.appendChild(content); app.appendChild(wrapper);
}

// Fonction auxiliaires (Avis, Contact, etc.)
async function renderReviews() {
    setDocTitle("Avis Utilisateurs"); window.scrollTo(0,0); const app = q('#app'); app.innerHTML=''; const card = document.createElement('div'); card.className='card center'; card.innerHTML = `<h2><i class="ph-duotone ph-star color-gold"></i> Avis Utilisateurs</h2><p class="small" style="margin-bottom:20px">Ce qu'ils pensent de Medicome.</p>`;
    const formDiv = document.createElement('div'); formDiv.style.background = 'rgba(125,125,125,0.1)'; formDiv.style.padding='15px'; formDiv.style.borderRadius='10px'; formDiv.style.width='100%'; formDiv.style.marginBottom='20px';
    formDiv.innerHTML = `<h4 style="margin-bottom:10px; color:var(--accent);">Laisser un avis</h4><div class="star-rating"><input type="radio" id="5-stars" name="rating" value="5" /><label for="5-stars"><i class="ph-fill ph-star"></i></label><input type="radio" id="4-stars" name="rating" value="4" /><label for="4-stars"><i class="ph-fill ph-star"></i></label><input type="radio" id="3-stars" name="rating" value="3" /><label for="3-stars"><i class="ph-fill ph-star"></i></label><input type="radio" id="2-stars" name="rating" value="2" /><label for="2-stars"><i class="ph-fill ph-star"></i></label><input type="radio" id="1-star" name="rating" value="1" /><label for="1-star"><i class="ph-fill ph-star"></i></label></div><textarea id="reviewText" class="input" placeholder="Votre commentaire..." style="min-height:60px;"></textarea><button id="submitReviewBtn" class="btn" style="width:100%; font-size:13px;">Envoyer</button>`;
    card.appendChild(formDiv); const reviewsContainer = document.createElement('div'); reviewsContainer.className = 'reviews-container';
    try { const qRev = query(collection(db, "reviews"), where("approved", "==", true), orderBy("date", "desc"), limit(10)); const snap = await getDocs(qRev); snap.forEach(doc => { const r = doc.data(); let stars = ""; for(let i=0; i<5; i++) { if(i < r.rating) stars += '<i class="ph-fill ph-star"></i>'; else stars += '<i class="ph-duotone ph-star"></i>'; } const div = document.createElement('div'); div.className = 'review-card'; div.innerHTML = `<div class="review-header"><div><div class="review-name">${r.pseudo}</div><div class="review-stars" style="color:var(--gold)">${stars}</div></div></div><div class="review-text">${r.text}</div>`; reviewsContainer.insertBefore(div, reviewsContainer.firstChild); }); } catch(e) { console.log("Erreur avis", e); }
    card.appendChild(reviewsContainer); const btnBack = document.createElement('button'); btnBack.className='btn'; btnBack.textContent='Retour'; btnBack.style.marginTop = '20px'; btnBack.onclick = () => { if(state.pseudo) renderHome(); else renderLogin(); }; card.appendChild(btnBack); app.appendChild(card);
    setTimeout(() => { const submitBtn = q('#submitReviewBtn'); if(submitBtn){ submitBtn.onclick = async () => { const text = q('#reviewText').value; const ratingEl = document.querySelector('input[name="rating"]:checked'); if(!text || !ratingEl) return showAlert("Note et message requis", "error"); try { await addDoc(collection(db, "reviews"), { pseudo: state.pseudo || "Anonyme", text, rating: parseInt(ratingEl.value), date: new Date(), approved: false }); showAlert("Avis envoyé ! Il sera visible après validation.", "success"); if(!state.progression.reviewDone) { state.progression.reviewDone = true; saveProgression(); } q('#reviewText').value = ''; } catch(e) { showAlert("Erreur d'envoi", "error"); } }; } }, 100);
}

function renderContact() {
    setDocTitle("Nous Contacter"); window.scrollTo(0,0); const app = q('#app'); app.innerHTML=''; const card = document.createElement('div'); card.className='card center';
    card.innerHTML = `<h2><i class="ph-duotone ph-envelope"></i> Nous Contacter</h2>`;
    const inputName = document.createElement('input'); inputName.className='input'; inputName.placeholder='Votre Nom'; if(state.pseudo) inputName.value = state.pseudo;
    const inputEmail = document.createElement('input'); inputEmail.className='input'; inputEmail.placeholder='Votre Email'; if(state.currentUser) inputEmail.value = state.currentUser.email;
    const inputText = document.createElement('textarea'); inputText.className='input'; inputText.placeholder='Votre message...';
    const btnSend = document.createElement('button'); btnSend.className='btn'; btnSend.textContent='Envoyer';
    btnSend.onclick = async () => { if(!inputText.value) return; try { await addDoc(collection(db, "messages"), { name: inputName.value, email: inputEmail.value, message: inputText.value, date: new Date(), uid: state.currentUser ? state.currentUser.uid : 'guest' }); showAlert("Envoyé !", "success"); setTimeout(() => { if(state.pseudo) renderHome(); else renderLogin(); }, 1500); } catch(e) { showAlert("Erreur", "error"); } };
    const btnCancel = document.createElement('button'); btnCancel.className='link'; btnCancel.textContent='Annuler'; btnCancel.onclick = () => { if(state.pseudo) renderHome(); else renderLogin(); };
    card.append(inputName, inputEmail, inputText, btnSend, btnCancel); app.appendChild(card);
}

function renderAchievementsPage() {
    setDocTitle("Succès"); window.scrollTo(0,0); const app = q('#app'); app.innerHTML = '';
    const card = document.createElement('div'); card.className='card center'; card.style.maxWidth = '800px';
    card.innerHTML = `<h2 style="color:var(--gold)"><i class="ph-duotone ph-trophy"></i> Mes Succès</h2>`;
    const prog = state.progression; const grid = document.createElement('div'); grid.className = 'achievements-grid';
    ACHIEVEMENTS.forEach(ach => {
        const unlocked = (prog.achievements || []).includes(ach.id);
        const row = document.createElement('div'); row.className = `achievement-row ${unlocked ? 'unlocked' : ''}`;
        const iconHtml = unlocked ? `<i class="${ach.iconClass} icon-md"></i>` : `<i class="ph-duotone ph-lock-key icon-md"></i>`;
        row.innerHTML = `<div class="ach-icon">${iconHtml}</div><div class="ach-info"><div class="ach-title" style="color:${unlocked ? 'var(--text-main)' : 'var(--text-muted)'}">${ach.title}</div><div class="ach-desc">${ach.desc}</div></div>`;
        grid.appendChild(row);
    });
    card.appendChild(grid); const btnBack = document.createElement('button'); btnBack.className='btn'; btnBack.textContent='Retour au Profil'; btnBack.style.marginTop = '20px'; btnBack.onclick = renderProfile; card.appendChild(btnBack); app.appendChild(card);
}

function renderPathoStats(patho) {
    setDocTitle(`Statistiques : ${patho.name}`); window.scrollTo(0,0); const app = q('#app'); app.innerHTML=''; const card = document.createElement('div'); card.className='card center';
    const m = (state.progression.mastery || {})[patho.name]; const wins = (typeof m === 'number') ? m : (m?.success || 0); const loss = (m?.failures || 0); const mistakes = (m?.missedSigns || {}); const bestTime = (state.progression.bestTimes || {})[patho.name];
    let rank = 'Verrouillé', icon=`<i class="ph-duotone ph-lock-key icon-lg"></i>`, color='var(--text-muted)';
    if(wins >= 10) { rank='Maître'; icon=`<i class="ph-duotone ph-diamond icon-lg color-ruby"></i>`; color='var(--ruby)'; } else if(wins >= 5) { rank='Or'; icon=`<i class="ph-duotone ph-trophy icon-lg color-gold"></i>`; color='var(--gold)'; } else if(wins >= 3) { rank='Argent'; icon=`<i class="ph-duotone ph-medal icon-lg color-silver"></i>`; color='var(--silver)'; } else if(wins >= 1) { rank='Bronze'; icon=`<i class="ph-duotone ph-medal icon-lg color-bronze"></i>`; color='var(--bronze)'; }
    card.innerHTML = `<div style="font-size:40px; margin-bottom:10px; color:${color};">${icon}</div><h3 style="color:${color}; margin-bottom:10px;">Rang : ${rank}</h3>${bestTime ? `<div class="small" style="color:var(--accent); margin-bottom:20px;"><i class="ph-duotone ph-lightning"></i> Record Chrono : ${bestTime.toFixed(1)}s</div>` : ''}<h2>${patho.name}</h2><div class="patho-desc" style="margin-bottom:20px;">${patho.short}</div><div style="display:flex; gap:15px; width:100%; margin-bottom:20px; justify-content:center;"><div class="stat-box" style="border-color:var(--success); max-width:150px;"><div class="stat-number" style="color:var(--success)">${wins}</div>Réussites</div><div class="stat-box" style="border-color:var(--error); max-width:150px;"><div class="stat-number" style="color:var(--error)">${loss}</div>Erreurs</div></div>`;
    if(Object.keys(mistakes).length > 0) {
        const missedRealSigns = []; const wronglySelectedSigns = [];
        Object.entries(mistakes).forEach(([sign, count]) => { if(patho.signes[sign] && patho.signes[sign] > 0) { missedRealSigns.push({sign, count, weight: patho.signes[sign]}); } else { wronglySelectedSigns.push({sign, count}); } });
        missedRealSigns.sort((a, b) => { if (b.count !== a.count) return b.count - a.count; return (b.weight || 0) - (a.weight || 0); }); wronglySelectedSigns.sort((a,b) => b.count - a.count);
        let html = '<div style="text-align:left; width:100%; margin-top:15px;">';
        if(missedRealSigns.length > 0) { html += `<h4 style="color:var(--error); margin-bottom:10px; border-bottom:1px solid rgba(255,77,77,0.3); padding-bottom:5px;"><i class="ph-duotone ph-warning-circle"></i> Symptômes manqués (Oublis)</h4><ul style="color:var(--text-muted); margin-bottom:20px;">`; missedRealSigns.forEach(item => { html += `<li style="margin-bottom:5px;"><strong>${formatSigneName(item.sign)}</strong> <span style="opacity:0.6; font-size:0.9em;">(Oublié ${item.count} fois)</span></li>`; }); html += '</ul>'; }
        if(wronglySelectedSigns.length > 0) { html += `<h4 style="color:#ff9f43; margin-bottom:10px; border-bottom:1px solid rgba(255,159,67,0.3); padding-bottom:5px;"><i class="ph-duotone ph-prohibit"></i> Confusions (Signes ajoutés à tort)</h4><ul style="color:var(--text-muted);">`; wronglySelectedSigns.forEach(item => { html += `<li style="margin-bottom:5px;"><strong>${formatSigneName(item.sign)}</strong> <span style="opacity:0.6; font-size:0.9em;">(Erreur ${item.count} fois)</span></li>`; }); html += '</ul>'; }
        html += '</div>'; card.innerHTML += html;
    }
    const btnBack = document.createElement('button'); btnBack.className='btn'; btnBack.textContent='Retour Profil'; btnBack.style.marginTop = '20px'; btnBack.onclick=renderProfile; card.appendChild(btnBack); app.appendChild(card);
}

function renderLegalPage() {
    setDocTitle("Mentions Légales"); window.scrollTo(0,0); const app = q('#app'); app.innerHTML = ''; const card = document.createElement('div'); card.className='card center';
    card.innerHTML = `<h2 style="color:var(--text-main); margin-bottom:15px;">Mentions Légales</h2><div style="text-align:left; line-height:1.6;"><h3>1. Éditeur du site</h3><p>Le site Medicome.fr est édité à titre personnel. <br>Contact : via le formulaire de contact du site.</p><br><h3>2. Hébergement</h3><p>Hébergé par GitHub Pages (USA). Données stockées sur Google Firebase (Irlande).</p><br><h3>3. Données Personnelles</h3><p>Email uniquement pour authentification et traitement de données dans un objectif de recherche. Aucune revente.</p></div>`;
    const btnBack = document.createElement('button'); btnBack.className='btn'; btnBack.textContent='Retour'; btnBack.style.marginTop = '20px'; btnBack.onclick = () => { if(state.pseudo) renderHome(); else renderLogin(); }; card.appendChild(btnBack); app.appendChild(card);
}

function renderCalendar(targetMonth = new Date()) {
    setDocTitle("Calendrier Intelligent"); window.scrollTo(0,0); const app = q('#app'); app.innerHTML=''; const card = document.createElement('div'); card.className='card center';
    card.innerHTML = `<h2><i class="ph-duotone ph-calendar-check color-accent"></i> Suivi & Mémoire</h2>`;
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const currentMonth = targetMonth.getMonth(); const currentYear = targetMonth.getFullYear();
    const navDiv = document.createElement('div'); navDiv.className = 'calendar-header';
    const btnPrev = document.createElement('button'); btnPrev.className = 'btn-back'; btnPrev.innerHTML = '<i class="ph-bold ph-caret-left"></i>'; btnPrev.onclick = () => renderCalendar(new Date(currentYear, currentMonth - 1, 1));
    const titleMonth = document.createElement('div'); titleMonth.style.fontWeight = 'bold'; titleMonth.style.fontSize = '1.1em'; titleMonth.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    const btnNext = document.createElement('button'); btnNext.className = 'btn-back'; btnNext.innerHTML = '<i class="ph-bold ph-caret-right"></i>'; btnNext.onclick = () => renderCalendar(new Date(currentYear, currentMonth + 1, 1));
    navDiv.append(btnPrev, titleMonth, btnNext); card.appendChild(navDiv);
    const grid = document.createElement('div'); grid.className = 'calendar-grid'; const daysShort = ['L', 'M', 'M', 'J', 'V', 'S', 'D']; daysShort.forEach(d => { const el = document.createElement('div'); el.className = 'cal-day-name'; el.textContent = d; grid.appendChild(el); });
    const firstDay = new Date(currentYear, currentMonth, 1); const lastDay = new Date(currentYear, currentMonth + 1, 0); const daysInMonth = lastDay.getDate(); let startDay = firstDay.getDay() - 1; if(startDay === -1) startDay = 6; 
    for(let i=0; i<startDay; i++) { const empty = document.createElement('div'); empty.className = 'cal-day empty'; grid.appendChild(empty); }
    const history = state.progression.dailyHistory || {}; const todayStr = new Date().toISOString().split('T')[0];
    for(let d=1; d<=daysInMonth; d++) { const dateObj = new Date(currentYear, currentMonth, d); const localDateStr = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0]; const dayCell = document.createElement('div'); dayCell.className = 'cal-day'; dayCell.textContent = d; if(localDateStr === todayStr) dayCell.classList.add('today'); const dayData = history[localDateStr]; if(dayData) { const dots = document.createElement('div'); dots.className = 'dots-container'; const sCount = dayData.success ? dayData.success.length : 0; const fCount = dayData.fail ? dayData.fail.length : 0; for(let i=0; i<Math.min(sCount, 3); i++) { const dot = document.createElement('div'); dot.className = 'dot dot-success'; dots.appendChild(dot); } if(fCount > 0) { const dot = document.createElement('div'); dot.className = 'dot dot-error'; dots.appendChild(dot); } dayCell.appendChild(dots); dayCell.onclick = () => showDayDetails(localDateStr, dayData); } grid.appendChild(dayCell); } card.appendChild(grid);
    const btnHome = document.createElement('button'); btnHome.className='btn'; btnHome.textContent='Retour'; btnHome.style.marginTop='20px'; btnHome.onclick=renderProfile; card.appendChild(btnHome); app.appendChild(card);
}

function showDayDetails(dateStr, data) {
    const dateObj = new Date(dateStr); const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }; const niceDate = dateObj.toLocaleDateString('fr-FR', options);
    let content = `<h3 style="color:var(--accent); margin-bottom:15px; text-transform:capitalize;">${niceDate}</h3>`;
    const getGroupedList = (arr) => { if (!arr || arr.length === 0) return []; const counts = {}; arr.forEach(item => { const name = (typeof item === 'string') ? item : item.name; counts[name] = (counts[name] || 0) + 1; }); return Object.entries(counts).sort((a, b) => b[1] - a[1]); };
    const successGroups = getGroupedList(data.success); if(successGroups.length > 0) { const total = data.success.length; content += `<h4 style="color:var(--success); margin-top:10px; border-bottom:1px solid rgba(0,255,157,0.2); padding-bottom:5px;"><i class="ph-bold ph-check"></i> Réussites (${total})</h4><ul style="text-align:left; font-size:14px; margin-bottom:15px; color:var(--text-main); list-style:none; padding-left:5px;">`; successGroups.forEach(([name, count]) => { const countBadge = count > 1 ? `<span style="background:rgba(0,255,157,0.2); color:var(--success); padding:2px 8px; border-radius:10px; font-size:11px; margin-left:8px; font-weight:bold;">x${count}</span>` : ''; content += `<li style="padding:4px 0; border-bottom:1px dashed rgba(255,255,255,0.05);">${name} ${countBadge}</li>`; }); content += `</ul>`; }
    const failGroups = getGroupedList(data.fail); if(failGroups.length > 0) { const total = data.fail.length; content += `<h4 style="color:var(--error); margin-top:10px; border-bottom:1px solid rgba(255,77,77,0.2); padding-bottom:5px;"><i class="ph-bold ph-x"></i> Erreurs (${total})</h4><ul style="text-align:left; font-size:14px; margin-bottom:15px; color:var(--text-main); list-style:none; padding-left:5px;">`; failGroups.forEach(([name, count]) => { const countBadge = count > 1 ? `<span style="background:rgba(255,77,77,0.2); color:var(--error); padding:2px 8px; border-radius:10px; font-size:11px; margin-left:8px; font-weight:bold;">x${count}</span>` : ''; content += `<li style="padding:4px 0; border-bottom:1px dashed rgba(255,255,255,0.05);">${name} ${countBadge}</li>`; }); content += `</ul>`; }
    const total = (data.success?.length || 0) + (data.fail?.length || 0); const ratio = total > 0 ? Math.round(((data.success?.length || 0) / total) * 100) : 0;
    content += `<div style="margin-top:20px; padding:12px; background:rgba(255,255,255,0.05); border-radius:12px; display:flex; justify-content:space-between; align-items:center;"><span>Efficacité du jour</span><strong style="color:${ratio >= 50 ? 'var(--success)' : 'var(--error)'}; font-size:1.2em;">${ratio}%</strong></div><button class="btn" style="margin-top:20px;" onclick="closeLightbox()">Fermer</button>`;
    const lb = document.getElementById('lightbox'); lb.innerHTML = `<div class="card center" style="max-width:400px; max-height:85vh; overflow-y:auto;" onclick="event.stopPropagation()">${content}</div>`; lb.style.display = "flex";
}
window.closeLightbox = function() { const lb = document.getElementById('lightbox'); if(lb) { lb.style.display = 'none'; lb.innerHTML = ''; } }

// ============================================================
// 11. ADMIN (EXPORT)
// ============================================================
const ADMIN_UID = "Kj5oyJpA4nXLDrjh3YqWCwlXEda2"; 
function checkAdminAccess() {
    if (state.currentUser && state.currentUser.uid === ADMIN_UID) {
        if (!document.getElementById('btnAdminExport')) {
            const btn = document.createElement('button'); btn.id = 'btnAdminExport'; btn.innerHTML = '<i class="ph-duotone ph-file-csv"></i> ADMIN : Suivi Élèves'; btn.style.cssText = "position:fixed; bottom:15px; right:15px; background:#e74c3c; color:white; border:none; padding:12px 20px; border-radius:30px; z-index:9999; cursor:pointer; font-weight:bold; box-shadow:0 4px 15px rgba(0,0,0,0.4); font-family:sans-serif; transition:transform 0.2s;";
            btn.onmouseover = () => btn.style.transform = "scale(1.05)"; btn.onmouseout = () => btn.style.transform = "scale(1)"; btn.onclick = exportUsersToCSV; document.body.appendChild(btn);
        }
    } else { const btn = document.getElementById('btnAdminExport'); if (btn) btn.remove(); }
}
async function exportUsersToCSV() {
    const btn = document.getElementById('btnAdminExport'); if(btn) btn.innerHTML = '<i class="ph-duotone ph-spinner"></i> Analyse en cours...';
    try {
        const q = collection(db, "users"); const snapshot = await getDocs(q); let csvContent = "data:text/csv;charset=utf-8,Pseudo;Email;Total Cas Joués;Réussites;Échecs;Série (Fidélité);Dernière Connexion;Activité Aujourd'hui;Meilleure Pathologie;Nb Succès;Liste Succès\n";
        const dateNow = new Date(); const localDate = new Date(dateNow.getTime() - (dateNow.getTimezoneOffset() * 60000)); const todayKey = localDate.toISOString().split("T")[0];
        snapshot.forEach(doc => {
            const data = doc.data(); const prog = data.progression || {}; const clean = (txt) => (txt || "").toString().replace(/;/g, " ").replace(/\n/g, " ");
            const pseudo = clean(data.pseudo || "Anonyme"); const email = clean(data.email || "Masqué"); const reussites = prog.correct || 0; const echecs = prog.incorrect || 0; const total = reussites + echecs; const streak = prog.streak || 0;
            let dateStr = "Jamais"; if (data.lastUpdate && data.lastUpdate.seconds) { dateStr = new Date(data.lastUpdate.seconds * 1000).toLocaleDateString(); }
            let activityToday = 0; if (prog.dailyHistory && prog.dailyHistory[todayKey]) { const dayData = prog.dailyHistory[todayKey]; activityToday = (dayData.success ? dayData.success.length : 0) + (dayData.fail ? dayData.fail.length : 0); }
            let bestPathoName = "Aucune"; let bestPathoCount = 0; const mastery = prog.mastery || {}; Object.keys(mastery).forEach(key => { const m = mastery[key]; const count = (typeof m === 'number') ? m : (m.success || 0); if (count > bestPathoCount) { bestPathoCount = count; bestPathoName = key; } });
            const bestPathoStr = bestPathoCount > 0 ? `${clean(bestPathoName)} (${bestPathoCount})` : "Rien"; const achList = prog.achievements || []; const achCount = achList.length; const achDetails = clean(achList.join(" | "));
            csvContent += `${pseudo};${email};${total};${reussites};${echecs};${streak};${dateStr};${activityToday};${bestPathoStr};${achCount};${achDetails}\n`;
        });
        const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); const timeId = new Date().toLocaleTimeString().replace(/:/g, "h"); link.setAttribute("download", `Suivi_Medicome_${timeId}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
        if(btn) { btn.innerHTML = '<i class="ph-duotone ph-check"></i> Export Réussi !'; setTimeout(() => btn.innerHTML = '<i class="ph-duotone ph-file-csv"></i> ADMIN : Suivi Élèves', 3000); }
    } catch (error) { console.error("Erreur Export:", error); alert("Erreur export."); if(btn) btn.innerHTML = 'Erreur'; }
}

// ============================================================
// LANCEMENT DE L'APPLICATION
// ============================================================
initApp();
