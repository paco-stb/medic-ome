// =================== 1. IMPORTS ===================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =================== 2. CONFIGURATION ===================
const firebaseConfig = {
    apiKey: "AIzaSyCig9G4gYHU5h642YV1IZxthYm_IXp6vZU",
    authDomain: "medicome-paco.firebaseapp.com",
    projectId: "medicome-paco",
    storageBucket: "medicome-paco.firebasestorage.app",
    messagingSenderId: "332171806096",
    appId: "1:332171806096:web:36889325196a7a718b5f15",
    measurementId: "G-81HJ9DWBMX"
};

// Initialisation
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =================== 3. DONNÉES MÉDICALES ===================
const PATHOLOGIES = [
    { name:"Infarctus du myocarde", short:"Nécrose ischémique du muscle cardiaque (SCA)", pdf:"fiches/infarctus_du_myocarde.pdf", signes:{douleur_thoracique_constrictive:20, irradiation_bras_gauche:15, sueurs:8, nausees:6, dyspnee:5}, facteurs:{homme:3, plus_de_65ans:5, tabac:4, atcd_famille:3, plus_de_30ans:2} },
    { name:"Embolie pulmonaire", short:"Obstruction d'une artère pulmonaire par un thrombus", pdf:"fiches/embolie_pulmonaire.pdf", signes:{dyspnee_aigue:18, douleur_basithoracique:12, hemoptysie:10, tachycardie:8, signes_phlebite:15}, facteurs:{tabac:2, plus_de_65ans:4, atcd_famille:2, femme:1} },
    { name:"Pneumopathie franche lobaire", short:"Infection bactérienne du parenchyme pulmonaire", pdf:"fiches/pneumopathie_franche_lobaire.pdf", signes:{fievre_elevee:16, frissons:12, toux_productive:10, douleur_thoracique:8, crepitants_auscultation:14}, facteurs:{plus_de_65ans:4, tabac:3} },
    { name:"Insuffisance Cardiaque Gauche", short:"Incapacité du cœur à assurer un débit sanguin suffisant", pdf:"fiches/insuffisance_cardiaque_gauche.pdf", signes:{dyspnee_effort:14, orthopnee:16, crepitants_bilateraux:15, toux_nocturne:8}, facteurs:{plus_de_65ans:6, atcd_famille:2} },
    { name:"AVC Ischémique", short:"Déficit neurologique focal soudain par occlusion artérielle", pdf:"fiches/avc_ischemique.pdf", signes:{hemiplegie_brutale:20, aphasie:18, asymetrie_faciale:15, troubles_visuels:10}, facteurs:{plus_de_65ans:6, tabac:3, atcd_famille:2, homme:1} },
    { name:"Méningite Aiguë", short:"Inflammation des méninges (urgence infectieuse)", pdf:"fiches/meningite_aigue.pdf", signes:{raideur_de_nuque:20, photophobie:15, cephalees_intenses:14, fievre:12, vomissements_en_jet:10}, facteurs:{plus_de_30ans:1} },
    { name:"Appendicite Aiguë", short:"Inflammation de l'appendice iléo-cæcal", pdf:"fiches/appendicite.pdf", signes:{douleur_fosse_iliaque_droite:20, defense_abdominale:16, fievre_moderee:8, nausees:8}, facteurs:{homme:1, femme:1} },
    { name:"Cholécystite Aiguë", short:"Infection de la vésicule biliaire", pdf:"fiches/cholecystite_aigue.pdf", signes:{douleur_hypochondre_droit:18, signe_de_murphy:20, fievre:10, nausees:8}, facteurs:{femme:3, plus_de_30ans:3} },
    { name:"Gastro-entérite", short:"Infection virale fréquente du système digestif", pdf:"fiches/gastro_enterite.pdf", signes:{diarrhee_aigue:18, vomissements:15, douleurs_abdominales_diffuses:10, fievre_moderee:6}, facteurs:{plus_de_30ans:0} },
    { name:"Colique Néphrétique", short:"Obstruction de la voie excrétrice urinaire (calcul)", pdf:"fiches/colique_nephretique.pdf", signes:{douleur_lombaire_brutale:20, irradiation_organes_genitaux:15, agitation_anxiete:12, pas_de_fievre:5}, facteurs:{homme:2, plus_de_30ans:2} },
    { name:"Pyélonéphrite Aiguë", short:"Infection bactérienne du rein et du bassinet", pdf:"fiches/pyelonephrite_aigue.pdf", signes:{fievre_elevee:16, frissons:12, douleur_lombaire_unilaterale:18, brulures_mictionnelles:10}, facteurs:{femme:4} },
    { name:"Anémie Ferriprive", short:"Carence en fer entraînant une baisse de l'hémoglobine", pdf:"fiches/anemie_ferriprive.pdf", signes:{fatigue_chronique:14, paleur_cutaneo_muqueuse:16, dyspnee_effort:10, tachycardie:8}, facteurs:{femme:4} },
    { name:"Hypothyroïdie", short:"Déficit en hormones thyroïdiennes", pdf:"fiches/hypothyroidie.pdf", signes:{prise_de_poids:12, asthenie:10, frilosite:14, constipation:8, bradycardie:8}, facteurs:{femme:4, plus_de_30ans:3} }
];

const ACCESS_CODES = [ { code: "SuperCode1", pseudo:"Admin" } ];

// =================== 4. STATE & LOGIC ===================
let state = {
    currentUser: null, 
    pseudo: null, 
    progression: { correct: 0, incorrect: 0 },
    isGuest: false,
    demo:{}, currentSign:null, answers:{}, asked:[], allSigns:[], ranked: [], diagnosticShown:false, previousDiagnostics:[]
};

// Utilitaires
function q(sel){ return document.querySelector(sel); }
function formatSigneName(sign){ return sign.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }
function showAlert(message,type){
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-' + type;
    alertDiv.textContent = message;
    const app = q('#app');
    if(app){ 
        app.insertBefore(alertDiv,app.firstChild);
        setTimeout(()=>{ if(alertDiv.parentNode) alertDiv.parentNode.removeChild(alertDiv); },3000);
    }
}

// =================== 5. GESTION UTILISATEUR ===================

onAuthStateChanged(auth, async (user) => {
    if (user) {
        state.currentUser = user;
        state.isGuest = false;
        const docRef = doc(db, "users", user.uid);
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                state.pseudo = data.pseudo;
                state.progression = data.progression || { correct: 0, incorrect: 0 };
            } else {
                state.pseudo = user.email.split('@')[0];
            }
        } catch(e) { console.error("Erreur lecture DB:", e); }
        updateHeader(); renderHome();
    } else {
        // Pas de user connecté, vérifions si c'est un invité avec sauvegarde
        const savedGuest = localStorage.getItem('medicome_guest_progression');
        const savedPseudo = localStorage.getItem('medicome_guest_pseudo');
        
        if(!state.isGuest && savedGuest && savedPseudo) {
            state.isGuest = true;
            state.pseudo = savedPseudo;
            state.progression = JSON.parse(savedGuest);
            updateHeader(); renderHome();
            // Petit délai pour ne pas superposer avec le chargement
            setTimeout(() => showAlert(`Bon retour, ${state.pseudo} !`, 'success'), 500);
        } else if(!state.isGuest) {
            state.currentUser = null; state.pseudo = null;
            state.progression = { correct: 0, incorrect: 0 };
            renderLogin(); updateHeader();
        }
    }
});

async function saveProgression() {
    // 1. Sauvegarde Cloud (Utilisateur connecté)
    if (!state.isGuest && state.currentUser) {
        try {
            const userRef = doc(db, "users", state.currentUser.uid);
            await updateDoc(userRef, { progression: state.progression });
        } catch (e) { console.error("Erreur sauvegarde Cloud", e); }
    } 
    // 2. Sauvegarde Locale (Invité)
    else if (state.isGuest) {
        localStorage.setItem('medicome_guest_progression', JSON.stringify(state.progression));
        localStorage.setItem('medicome_guest_pseudo', state.pseudo);
    }
}

// =================== 6. INTERFACE & NAV ===================

function updateHeader(){
    const pseudoBox = q("#pseudoBox");
    const homeBtn = q("#homeBtn");
    const logoutBtn = q("#logoutBtn");

    if(state.pseudo){ 
        pseudoBox.textContent = state.pseudo + (state.isGuest ? " (Invité)" : ""); 
        pseudoBox.style.display='inline-block';
        pseudoBox.onclick=renderProfile;
        homeBtn.style.display='inline-block';
        logoutBtn.style.display='inline-block';
    } else { 
        pseudoBox.style.display='none'; 
        homeBtn.style.display='none';
        logoutBtn.style.display='none';
    }
    homeBtn.onclick=renderHome;
    logoutBtn.onclick = () => {
        if(state.isGuest) {
            state.isGuest = false; state.pseudo = null;
            // On ne supprime PAS le localStorage ici pour permettre le retour, 
            // sauf si on voulait forcer un logout complet.
            // Pour l'instant on réinitialise juste l'état mémoire.
            renderLogin(); updateHeader();
        } else {
            signOut(auth).then(() => showAlert("Déconnecté", "success"));
        }
    };
}

function renderLogin() {
    const app = q('#app'); app.innerHTML='';
    const card = document.createElement('div'); card.className='card center'; card.innerHTML='<h2>☁️ Connexion Cloud</h2>';
    
    const inputUser = document.createElement('input'); inputUser.placeholder='Email'; inputUser.className='input';
    const inputPass = document.createElement('input'); inputPass.placeholder='Mot de passe'; inputPass.className='input'; inputPass.type='password';
    
    const btnLogin = document.createElement('button'); btnLogin.className='btn'; btnLogin.textContent='Se connecter';
    btnLogin.onclick = async () => {
        try {
            await signInWithEmailAndPassword(auth, inputUser.value, inputPass.value);
            showAlert("Connexion réussie !", "success");
        } catch (error) { showAlert("Erreur: " + error.message, "error"); }
    };
    card.appendChild(inputUser); card.appendChild(inputPass); card.appendChild(btnLogin);

    const sep = document.createElement('div'); sep.textContent='— Pas encore de compte ? —'; sep.className='small'; sep.style.margin='16px 0'; card.appendChild(sep);
    const inRegEmail = document.createElement('input'); inRegEmail.placeholder='Nouvel Email'; inRegEmail.className='input';
    const inRegPass = document.createElement('input'); inRegPass.placeholder='Nouveau Mot de passe'; inRegPass.className='input'; inRegPass.type='password';
    const inPseudo = document.createElement('input'); inPseudo.placeholder='Votre Pseudo'; inPseudo.className='input';
    
    const btnReg = document.createElement('button'); btnReg.className='link'; btnReg.textContent='Créer un compte Cloud';
    btnReg.onclick = async () => {
        if(!inRegEmail.value || !inRegPass.value || !inPseudo.value) return showAlert('Remplissez tout','error');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, inRegEmail.value, inRegPass.value);
            const user = userCredential.user;
            await setDoc(doc(db, "users", user.uid), {
                pseudo: inPseudo.value, email: inRegEmail.value,
                progression: { correct: 0, incorrect: 0 }, createdAt: new Date()
            });
            showAlert("Compte créé et connecté !", "success");
        } catch (error) { showAlert("Erreur création: " + error.message, "error"); }
    };
    card.appendChild(inRegEmail); card.appendChild(inRegPass); card.appendChild(inPseudo); card.appendChild(btnReg);

    const sepCode = document.createElement('div'); sepCode.textContent='— ou Accès Rapide (Local) —'; sepCode.className='small'; sepCode.style.margin='16px 0'; card.appendChild(sepCode);
    const inputCode = document.createElement('input'); inputCode.placeholder='Clé d\'accès'; inputCode.className='input';
    const btnCode = document.createElement('button'); btnCode.className='btn'; btnCode.style.backgroundColor = 'var(--navy)'; btnCode.textContent='Utiliser une clé';
    btnCode.onclick = () => {
        const codeFound = ACCESS_CODES.find(ac => ac.code === inputCode.value);
        if(codeFound) {
            state.isGuest = true; state.pseudo = codeFound.pseudo;
            // On ne reset PAS la progression ici si elle existe déjà en local, 
            // mais ACCESS_CODES sert surtout à "créer" un invité.
            // Pour simplifier, on reset si c'est un nouveau login code.
            state.progression = {correct:0, incorrect:0};
            saveProgression(); // Init storage
            updateHeader(); renderHome(); showAlert(`Mode Invité: ${codeFound.pseudo}`, 'success');
        } else { showAlert('Clé invalide', 'error'); }
    };
    card.appendChild(inputCode); card.appendChild(btnCode);
    app.appendChild(card);
}

function renderHome() {
    const app = q('#app'); app.innerHTML='';
    const prog = state.progression;
    const card = document.createElement('div'); card.className='card center';
    let cloudBadge = state.isGuest ? 
        '<span style="color:orange; font-size:0.8em">💾 Mode Local (Navigateur)</span>' : 
        '<span style="color:green; font-size:0.8em">☁️ Sauvegarde Cloud Active</span>';
    card.innerHTML = `<h2>👋 Bonjour ${state.pseudo || 'Invité'}</h2>${cloudBadge}
                        <div class="stat-box"><div class="stat-number">${prog.correct + prog.incorrect}</div><div class="stat-label">Cas résolus</div></div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;margin-top:12px;">
                        <div class="stat-box" style="text-align:center"><div class="stat-number" style="color:var(--success);">${prog.correct}</div><div class="stat-label">Corrects</div></div>
                        <div class="stat-box" style="text-align:center"><div class="stat-number" style="color:var(--error);">${prog.incorrect}</div><div class="stat-label">Incorrects</div></div>
                        </div>`;
    const btnDiag = document.createElement('button'); btnDiag.className='btn'; btnDiag.textContent='🩺 Diagnostic'; btnDiag.style.marginTop='20px'; btnDiag.onclick=renderDemographics;
    const btnGloss = document.createElement('button'); btnGloss.className='link'; btnGloss.textContent='📚 Glossaire'; btnGloss.style.marginTop='12px'; btnGloss.onclick=renderGlossary;
    const btnProf = document.createElement('button'); btnProf.className='link'; btnProf.textContent='👤 Profil'; btnProf.style.marginTop='12px'; btnProf.onclick=renderProfile;
    card.appendChild(btnDiag); card.appendChild(btnGloss); card.appendChild(btnProf); app.appendChild(card);
}

function renderProfile() {
    const app = q('#app'); app.innerHTML='';
    const prog = state.progression;
    const total = prog.correct + prog.incorrect;
    const successRate = total > 0 ? Math.round((prog.correct / total) * 100) : 0;
    const card = document.createElement('div'); card.className='card center';
    const title = document.createElement('h2'); title.textContent=`👤 Profil de ${state.pseudo}`; card.appendChild(title);
    const info = document.createElement('div');
    info.style.marginBottom='15px'; info.style.fontSize='0.9em'; info.style.color='#666';
    if(state.isGuest) info.textContent = "Compte invité : Données sauvegardées dans ce navigateur.";
    else info.textContent = `Compte Cloud : ${state.currentUser.email}`;
    card.appendChild(info);
    const statTotal = document.createElement('div'); statTotal.className='stat-box';
    statTotal.innerHTML=`<div class="stat-number">${total}</div><div class="stat-label">Cas cliniques traités</div>`;
    card.appendChild(statTotal);
    const gridDiv = document.createElement('div');
    gridDiv.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;margin-top:12px;';
    gridDiv.innerHTML=`<div class="stat-box" style="text-align:center"><div class="stat-number" style="color:var(--success);">${prog.correct}</div><div class="stat-label">✓ Corrects</div></div>
                        <div class="stat-box" style="text-align:center"><div class="stat-number" style="color:var(--error);">${prog.incorrect}</div><div class="stat-label">✗ Incorrects</div></div>`;
    card.appendChild(gridDiv);
    const statRate = document.createElement('div');
    statRate.className='stat-box';
    statRate.style.cssText='margin-top:12px;background:rgba(16,185,129,0.1);border-color:var(--success);';
    statRate.innerHTML=`<div class="stat-number" style="color:var(--success);">${successRate}%</div><div class="stat-label">Taux de réussite</div>`;
    card.appendChild(statRate);

    // Bouton Reset
    const btnReset = document.createElement('button');
    btnReset.className = 'link'; 
    btnReset.style.color = 'var(--error)';
    btnReset.style.marginTop = '12px';
    btnReset.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    btnReset.textContent = '🗑️ Réinitialiser ma progression';
    btnReset.onclick = async () => {
        if(confirm("Voulez-vous vraiment effacer toutes vos statistiques ?")) {
            state.progression = { correct: 0, incorrect: 0 };
            await saveProgression();
            renderProfile(); // Rafraichir la page
            showAlert("Statistiques remises à zéro", "success");
        }
    };
    card.appendChild(btnReset);

    const btnBack = document.createElement('button'); btnBack.className='btn'; btnBack.textContent='🏠 Retour';
    btnBack.style.marginTop='20px'; btnBack.onclick=renderHome;
    card.appendChild(btnBack); app.appendChild(card);
}

// =================== 7. JEU (DIAGNOSTIC) ===================

function renderDemographics() {
    const app = q('#app'); app.innerHTML='';
    const card = document.createElement('div'); card.className='card';
    card.innerHTML=`<h3>📋 Données démographiques</h3><p class="small" style="margin-bottom:16px">Cochez les facteurs de risque.</p>`;
    const createSel = (lbl, id, opts) => {
    const l = document.createElement('label'); l.textContent=lbl;
    const s = document.createElement('select'); s.id=id; s.className='input';
    opts.forEach(o=> { const op=document.createElement('option'); op.value=o[0]; op.textContent=o[1]; s.appendChild(op); });
    card.appendChild(l); card.appendChild(s);
    };
    createSel("Sexe", "demo-sexe", [["rien","Non précisé"],["femme","Femme"],["homme","Homme"]]);
    createSel("Plus de 30 ans ?", "demo-30", [["rien","Je ne sais pas"],["oui","Oui"],["non","Non"]]);
    createSel("Plus de 65 ans ?", "demo-65", [["rien","Je ne sais pas"],["oui","Oui"],["non","Non"]]);
    createSel("Antécédents familiaux ?", "demo-atcd", [["rien","Je ne sais pas"],["oui","Oui"],["non","Non"]]);
    createSel("Fumeur ?", "demo-tabac", [["rien","Je ne sais pas"],["oui","Oui"],["non","Non"]]);
    
    const btnGroup = document.createElement('div'); btnGroup.className='button-group';
    const btnStart = document.createElement('button'); btnStart.className='btn'; btnStart.textContent='▶️ Démarrer';
    btnStart.onclick=()=>{ 
    state.demo = {
        femme: q('#demo-sexe').value === 'femme', homme: q('#demo-sexe').value === 'homme',
        plus_de_30ans: q('#demo-30').value === 'oui', plus_de_65ans: q('#demo-65').value === 'oui',
        atcd_famille: q('#demo-atcd').value === 'oui', tabac: q('#demo-tabac').value === 'oui'
    };
    state.answers={}; state.asked=[]; state.diagnosticShown=false; state.previousDiagnostics=[];
    askNextQuestion();
    };
    const btnCancel = document.createElement('button'); btnCancel.className='link'; btnCancel.textContent='Annuler'; btnCancel.onclick=renderHome;
    btnGroup.appendChild(btnStart); btnGroup.appendChild(btnCancel); card.appendChild(btnGroup); app.appendChild(card);
}

function prepareSigns() {
    let allSignsSet = new Set();
    PATHOLOGIES.forEach(p => { Object.keys(p.signes).forEach(s => allSignsSet.add(s)); });
    state.allSigns = Array.from(allSignsSet);
}

function rankPathologies() {
    const scores = PATHOLOGIES.map(p => {
    let score = 0;
    for(const facteur in p.facteurs){ if(state.demo[facteur] === true) score += p.facteurs[facteur]; }
    for(const signe in p.signes){
        const ans = state.answers[signe];
        if(ans === true) score += p.signes[signe];
        else if(ans === false) score -= (p.signes[signe] * 0.5);
    }
    return {patho:p, score: Math.max(0, score)};
    });
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    state.ranked = scores.map(s => ({
    ...s, prob: totalScore > 0 ? ((s.score / totalScore) * 100).toFixed(1) : 0
    })).sort((a,b)=>b.prob - a.prob);
}

function getNextSmartSign(rankedPathos, remainingSigns) {
    if (rankedPathos.length < 2) return remainingSigns[Math.floor(Math.random() * remainingSigns.length)];
    const top1 = rankedPathos[0].patho, top2 = rankedPathos[1].patho;
    let best=null, maxD=-1;
    remainingSigns.forEach(s => {
    const w1 = top1.signes[s] || 0, w2 = top2.signes[s] || 0;
    const d = Math.abs(w1 - w2);
    if (d > maxD) { maxD = d; best = s; }
    });
    return (best && maxD > 0) ? best : remainingSigns[Math.floor(Math.random() * remainingSigns.length)];
}

function canShowDiagnostic() {
    const qNum = state.asked.length;
    if(state.ranked.length===0) return false;
    const topProb = parseFloat(state.ranked[0].prob);
    const topName = state.ranked[0].patho.name;
    if(state.previousDiagnostics.includes(topName)) return false;
    if(qNum >= 8 && topProb >= 90) return true;
    if(qNum >= 14 && topProb >= 85) return true;
    if(qNum >= 17 && topProb >= 75) return true;
    return false;
}

function askNextQuestion() {
    prepareSigns(); rankPathologies();
    if(canShowDiagnostic()){ showDiagnostic(); return; }
    const remaining = state.allSigns.filter(s => !state.asked.includes(s));
    if(remaining.length===0){ showDiagnostic(); return; }
    const signe = getNextSmartSign(state.ranked, remaining);
    state.currentSign = signe; state.asked.push(signe);
    const app = q('#app'); app.innerHTML='';
    const card = document.createElement('div'); card.className='card center';
    card.innerHTML=`<div class="small" style="margin-bottom:12px">Question ${state.asked.length}</div>
                    <div class="question-text">Le patient présente-t-il : ${formatSigneName(signe)} ?</div>`;
    const btnGroup = document.createElement('div'); btnGroup.className='button-group';
    const mkBtn = (txt, cls, val) => {
    const b = document.createElement('button'); b.className=cls; b.textContent=txt;
    b.onclick=()=>{ state.answers[signe]=val; askNextQuestion(); };
    btnGroup.appendChild(b);
    };
    mkBtn('✓ Oui', 'btn btn-success', true);
    mkBtn('✗ Non', 'btn btn-error', false);
    mkBtn('🤷 Je sais pas', 'link', null);
    card.appendChild(btnGroup);
    const btnAb = document.createElement('button'); btnAb.className='link'; btnAb.textContent='Abandonner'; btnAb.style.marginTop='12px'; btnAb.onclick=renderHome;
    card.appendChild(btnAb); app.appendChild(card);
}

function showDiagnostic() {
    // Étape 1 : Afficher l'animation de recherche
    const app = q('#app');
    app.innerHTML = '';
    const loadingCard = document.createElement('div');
    loadingCard.className = 'card center';
    loadingCard.innerHTML = `
        <h3>🔎 Analyse des symptômes...</h3>
        <div style="margin: 20px 0; font-size: 40px; animation: spin 1s infinite linear;">⚙️</div>
        <p class="small">Comparaison avec la base de données...</p>
    `;
    app.appendChild(loadingCard);

    // Étape 2 : Calculer et afficher le résultat après 1.5 seconde
    setTimeout(() => {
        rankPathologies();
        const top = state.ranked[0];
        state.diagnosticShown = true;
        state.previousDiagnostics.push(top.patho.name);

        app.innerHTML = ''; // On vide le loader
        const card = document.createElement('div'); card.className='card center';
        const title = document.createElement('h2'); title.textContent='💡 Diagnostic proposé'; card.appendChild(title);
        let pdfButton = '';
        if(top.patho.pdf && top.patho.pdf !== '#') {
            pdfButton = `<a class="pdf-link" href="${top.patho.pdf}" target="_blank">📄 Voir fiche PDF</a>`;
        } else {
            pdfButton = `<span class="pdf-link" style="opacity:0.5; cursor:not-allowed">📄 Pas de fiche PDF</span>`;
        }
        const diagDiv = document.createElement('div'); diagDiv.className='diagnostic-result';
        diagDiv.innerHTML = `<div class="diagnostic-name">${top.patho.name}</div>
                                <div class="patho-desc" style="margin-top:8px">${top.patho.short}</div>
                                <div class="score-badge">Probabilité estimée : ${top.prob}%</div>
                                ${pdfButton}`;
        card.appendChild(diagDiv);
        const btnGroup = document.createElement('div'); btnGroup.className='button-group';
        const btnTrue = document.createElement('button'); btnTrue.className='btn btn-success'; btnTrue.textContent='✅ Diagnostic correct';
        btnTrue.onclick = async () => { 
            state.progression.correct++;
            await saveProgression(); 
            showAlert('Excellent !','success'); showDiagnosticDetails(top);
        };
        const btnFalse = document.createElement('button'); btnFalse.className='btn btn-error'; btnFalse.textContent='❌ Diagnostic incorrect';
        btnFalse.onclick = async () => { 
            state.progression.incorrect++;
            await saveProgression(); 
            showAlert('Continuons...','error'); state.diagnosticShown=false; setTimeout(()=>askNextQuestion(), 800);
        };
        btnGroup.appendChild(btnTrue); btnGroup.appendChild(btnFalse); card.appendChild(btnGroup); app.appendChild(card);
    }, 1500); // Fin du timeout
}

function showDiagnosticDetails(top) {
    const app = q('#app'); app.innerHTML = '';
    const card = document.createElement('div'); card.className='card';
    const title = document.createElement('h2'); title.textContent = `✅ Diagnostic confirmé : ${top.patho.name}`; card.appendChild(title);
    const desc = document.createElement('div'); desc.className='patho-desc'; desc.textContent = top.patho.short; desc.style.marginBottom='12px'; card.appendChild(desc);
    const pathoSigns = Object.keys(top.patho.signes);
    const correctSigns = [], missingSigns = [], erroneousSigns = [], unknownSigns = [];
    pathoSigns.forEach(s => {
    const val = state.answers[s];
    if(val === true) correctSigns.push(s); else if(val === false) missingSigns.push(s); else unknownSigns.push(s);
    });
    state.allSigns.forEach(s => { if(state.answers[s] === true && !pathoSigns.includes(s)) erroneousSigns.push(s); });
    const resultsDiv = document.createElement('div'); resultsDiv.className='result-list';
    const createList = (title, items, type, typeLabel) => {
    const h = document.createElement('h4'); h.textContent = `${title} (${items.length})`; resultsDiv.appendChild(h);
    if(items.length===0) { const p = document.createElement('div'); p.className='result-item result-unknown'; p.textContent='Néant'; resultsDiv.appendChild(p); }
    items.forEach(s => {
        const r = document.createElement('div'); r.className='result-item result-'+type;
        r.innerHTML = `<div>${formatSigneName(s)}</div><div style="opacity:0.8">${typeLabel}</div>`;
        resultsDiv.appendChild(r);
    });
    };
    createList("Signes corrects", correctSigns, "correct", "OK");
    createList("Signes attendus manquants", missingSigns, "missing", "Manqué");
    createList("Signes cochés par erreur", erroneousSigns, "error", "Erreur");
    card.appendChild(resultsDiv);
    const btnGroup = document.createElement('div'); btnGroup.className='button-group';
    const btnHome = document.createElement('button'); btnHome.className='btn'; btnHome.textContent = '🏠 Accueil'; btnHome.onclick = renderHome;
    btnGroup.appendChild(btnHome); card.appendChild(btnGroup); app.appendChild(card);
}

function renderGlossary() {
    const app = q('#app'); app.innerHTML='';
    const titleCard = document.createElement('div'); titleCard.className='card center'; titleCard.innerHTML='<h2>📚 Glossaire</h2>'; app.appendChild(titleCard);
    const grid = document.createElement('div'); grid.className='glossary-grid';
    PATHOLOGIES.forEach(p=>{
    const card = document.createElement('div'); card.className='patho-card clickable';
    card.innerHTML=`<div class="patho-name">${p.name}</div><div class="patho-desc">${p.short}</div>`;
    card.onclick=()=>{ 
        if(p.pdf && p.pdf !== '#') window.open(p.pdf,'_blank'); 
        else showAlert('PDF bientôt disponible','error'); 
    };
    grid.appendChild(card);
    });
    app.appendChild(grid);
}
