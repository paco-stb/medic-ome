// =================== DONNÉES ENRICHIES (EDN) ===================
const PATHOLOGIES = [
  { name:"Infarctus du myocarde", short:"Nécrose ischémique du muscle cardiaque (SCA)", pdf:"#", signes:{douleur_thoracique_constrictive:20, irradiation_bras_gauche:15, sueurs:8, nausees:6, dyspnee:5}, facteurs:{homme:3, plus_de_65ans:5, tabac:4, atcd_famille:3, plus_de_30ans:2} },
  { name:"Embolie pulmonaire", short:"Obstruction d'une artère pulmonaire par un thrombus", pdf:"#", signes:{dyspnee_aigue:18, douleur_basithoracique:12, hemoptysie:10, tachycardie:8, signes_phlebite:15}, facteurs:{tabac:2, plus_de_65ans:4, atcd_famille:2, femme:1} },
  { name:"Pneumopathie franche lobaire", short:"Infection bactérienne du parenchyme pulmonaire", pdf:"#", signes:{fievre_elevee:16, frissons:12, toux_productive:10, douleur_thoracique:8, crepitants_auscultation:14}, facteurs:{plus_de_65ans:4, tabac:3} },
  { name:"Insuffisance Cardiaque Gauche", short:"Incapacité du cœur à assurer un débit sanguin suffisant", pdf:"#", signes:{dyspnee_effort:14, orthopnee:16, crepitants_bilateraux:15, toux_nocturne:8}, facteurs:{plus_de_65ans:6, atcd_famille:2} },
  { name:"AVC Ischémique", short:"Déficit neurologique focal soudain par occlusion artérielle", pdf:"#", signes:{hemiplegie_brutale:20, aphasie:18, asymetrie_faciale:15, troubles_visuels:10}, facteurs:{plus_de_65ans:6, tabac:3, atcd_famille:2, homme:1} },
  { name:"Méningite Aiguë", short:"Inflammation des méninges (urgence infectieuse)", pdf:"#", signes:{raideur_de_nuque:20, photophobie:15, cephalees_intenses:14, fievre:12, vomissements_en_jet:10}, facteurs:{plus_de_30ans:1} },
  { name:"Appendicite Aiguë", short:"Inflammation de l'appendice iléo-cæcal", pdf:"#", signes:{douleur_fosse_iliaque_droite:20, defense_abdominale:16, fievre_moderee:8, nausees:8}, facteurs:{homme:1, femme:1} },
  { name:"Cholécystite Aiguë", short:"Infection de la vésicule biliaire", pdf:"#", signes:{douleur_hypochondre_droit:18, signe_de_murphy:20, fievre:10, nausees:8}, facteurs:{femme:3, plus_de_30ans:3} },
  { name:"Gastro-entérite", short:"Infection virale fréquente du système digestif", pdf:"#", signes:{diarrhee_aigue:18, vomissements:15, douleurs_abdominales_diffuses:10, fievre_moderee:6}, facteurs:{plus_de_30ans:0} },
  { name:"Colique Néphrétique", short:"Obstruction de la voie excrétrice urinaire (calcul)", pdf:"#", signes:{douleur_lombaire_brutale:20, irradiation_organes_genitaux:15, agitation_anxiete:12, pas_de_fievre:5}, facteurs:{homme:2, plus_de_30ans:2} },
  { name:"Pyélonéphrite Aiguë", short:"Infection bactérienne du rein et du bassinet", pdf:"#", signes:{fievre_elevee:16, frissons:12, douleur_lombaire_unilaterale:18, brulures_mictionnelles:10}, facteurs:{femme:4} },
  { name:"Anémie Ferriprive", short:"Carence en fer entraînant une baisse de l'hémoglobine", pdf:"#", signes:{fatigue_chronique:14, paleur_cutaneo_muqueuse:16, dyspnee_effort:10, tachycardie:8}, facteurs:{femme:4} },
  { name:"Hypothyroïdie", short:"Déficit en hormones thyroïdiennes", pdf:"#", signes:{prise_de_poids:12, asthenie:10, frilosite:14, constipation:8, bradycardie:8}, facteurs:{femme:4, plus_de_30ans:3} }
];

const ACCESS_CODES = [ { code: "SuperCode1", pseudo:"Admin" } ];

// Gestion Persistance Données (LocalStorage)
let USERS = [];

function loadUsers() {
  const stored = localStorage.getItem('medicOmeUsers');
  if(stored) {
    USERS = JSON.parse(stored);
  } else {
    USERS = [ {email:"test@test.fr", password:"test1", pseudo:"Interne_Test", progression:{correct:0, incorrect:0}} ];
  }
}
function saveUsers() {
  localStorage.setItem('medicOmeUsers', JSON.stringify(USERS));
}

// STATE
let state = {
  pseudo:null, email:null, session_id:null, demo:{}, currentSign:null,
  answers:{}, asked:[], allSigns:[], ranked: [], diagnosticShown:false, previousDiagnostics:[]
};

// UTILS
function q(sel){ return document.querySelector(sel); }
function slugify(s){ return s.toLowerCase().replace(/\s+/g,'_').replace(/[^\w\-]+/g,''); }
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

// APP LOGIC
function updateHeader(){
  if(state.pseudo){ 
    q("#pseudoBox").textContent=state.pseudo; 
    q("#pseudoBox").style.display='inline-block';
    q("#pseudoBox").onclick=renderProfile;
    q("#homeBtn").style.display='inline-block';
    q("#logoutBtn").style.display='inline-block';
  } else { 
    q("#pseudoBox").style.display='none'; 
    q("#homeBtn").style.display='none';
    q("#logoutBtn").style.display='none';
  }
  q("#homeBtn").onclick=renderHome;
  q("#logoutBtn").onclick=function(){
    state.pseudo=null; state.email=null; state.ranked=[]; state.answers={}; state.asked=[]; state.diagnosticShown=false; state.previousDiagnostics=[];
    renderLogin(); updateHeader();
  };
}

function renderProfile() {
  const app = q('#app'); app.innerHTML='';
  const user = USERS.find(u=> (u.email && u.email===state.email) || u.pseudo===state.pseudo);
  if(!user){ showAlert('Utilisateur introuvable','error'); renderHome(); return; }
  
  const prog = user.progression;
  const total = prog.correct + prog.incorrect;
  const successRate = total > 0 ? Math.round((prog.correct / total) * 100) : 0;
  
  const card = document.createElement('div'); card.className='card center';
  const title = document.createElement('h2'); title.textContent=`👤 Profil de ${user.pseudo}`; card.appendChild(title);
  
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
  
  const btnBack = document.createElement('button'); btnBack.className='btn'; btnBack.textContent='🏠 Retour';
  btnBack.style.marginTop='20px'; btnBack.onclick=renderHome;
  card.appendChild(btnBack);
  app.appendChild(card);
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

function showDiagnostic() {
  rankPathologies();
  const top = state.ranked[0];
  state.diagnosticShown = true;
  state.previousDiagnostics.push(top.patho.name);
  const app = q('#app'); app.innerHTML = '';
  
  const card = document.createElement('div'); card.className='card center';
  const title = document.createElement('h2'); title.textContent='💡 Diagnostic proposé'; card.appendChild(title);
  
  const diagDiv = document.createElement('div'); diagDiv.className='diagnostic-result';
  diagDiv.innerHTML = `<div class="diagnostic-name">${top.patho.name}</div>
                       <div class="patho-desc" style="margin-top:8px">${top.patho.short}</div>
                       <div class="score-badge">Probabilité estimée : ${top.prob}%</div>
                       <a class="pdf-link" href="${top.patho.pdf}" target="_blank">📄 Voir fiche PDF</a>`;
  card.appendChild(diagDiv);
  
  const btnGroup = document.createElement('div'); btnGroup.className='button-group';
  const btnTrue = document.createElement('button'); btnTrue.className='btn btn-success'; btnTrue.textContent='✅ Diagnostic correct';
  btnTrue.onclick=()=>{ 
    const user = USERS.find(u=> (u.email && u.email===state.email) || u.pseudo===state.pseudo);
    if(user){ user.progression.correct++; saveUsers(); }
    showAlert('Excellent !','success'); showDiagnosticDetails(top);
  };
  
  const btnFalse = document.createElement('button'); btnFalse.className='btn btn-error'; btnFalse.textContent='❌ Diagnostic incorrect';
  btnFalse.onclick=()=>{ 
    const user = USERS.find(u=> (u.email && u.email===state.email) || u.pseudo===state.pseudo);
    if(user){ user.progression.incorrect++; saveUsers(); }
    showAlert('Continuons...','error'); state.diagnosticShown=false; setTimeout(()=>askNextQuestion(), 800);
  };
  btnGroup.appendChild(btnTrue); btnGroup.appendChild(btnFalse); card.appendChild(btnGroup); app.appendChild(card);
}

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

function renderGlossary() {
  const app = q('#app'); app.innerHTML='';
  const titleCard = document.createElement('div'); titleCard.className='card center'; titleCard.innerHTML='<h2>📚 Glossaire</h2>'; app.appendChild(titleCard);
  const grid = document.createElement('div'); grid.className='glossary-grid';
  PATHOLOGIES.forEach(p=>{
    const card = document.createElement('div'); card.className='patho-card clickable';
    card.innerHTML=`<div class="patho-name">${p.name}</div><div class="patho-desc">${p.short}</div>`;
    card.onclick=()=>{ if(p.pdf && p.pdf.startsWith('http')) window.open(p.pdf,'_blank'); else showAlert('PDF bientôt disponible','error'); };
    grid.appendChild(card);
  });
  app.appendChild(grid);
}

function renderHome() {
  const app = q('#app'); app.innerHTML='';
  const user = USERS.find(u=> (u.email && u.email===state.email) || u.pseudo===state.pseudo);
  const prog = user ? user.progression : {correct:0, incorrect:0};
  const card = document.createElement('div'); card.className='card center';
  card.innerHTML = `<h2>👋 Bonjour ${state.pseudo || 'Invité'}</h2>
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

function renderLogin() {
  const app = q('#app'); app.innerHTML='';
  const card = document.createElement('div'); card.className='card center'; card.innerHTML='<h2>🔑 Connexion</h2>';
  
  // --- 1. CONNEXION CLASSIQUE ---
  const inputUser = document.createElement('input'); inputUser.placeholder='Email ou Pseudo'; inputUser.className='input';
  const inputPass = document.createElement('input'); inputPass.placeholder='Mot de passe'; inputPass.className='input'; inputPass.type='password';
  const btnLogin = document.createElement('button'); btnLogin.className='btn'; btnLogin.textContent='Se connecter';
  btnLogin.onclick=()=>{
    const u = USERS.find(u=> (u.email && u.email===inputUser.value) || u.pseudo===inputUser.value);
    if(u && u.password === inputPass.value){ state.pseudo = u.pseudo; state.email = u.email; updateHeader(); renderHome(); }
    else showAlert('Erreur identifiants','error');
  };
  card.appendChild(inputUser); card.appendChild(inputPass); card.appendChild(btnLogin);

  // --- 2. CONNEXION PAR CODE D'ACCÈS (NOUVEAU) ---
  const sepCode = document.createElement('div'); sepCode.textContent='— ou Accès Rapide —'; sepCode.className='small'; sepCode.style.margin='16px 0'; card.appendChild(sepCode);
  
  const inputCode = document.createElement('input'); inputCode.placeholder='Entrer une clé d\'accès (ex: EDN-2025)'; inputCode.className='input';
  const btnCode = document.createElement('button'); btnCode.className='btn'; btnCode.style.backgroundColor = 'var(--navy)'; btnCode.style.border = '1px solid var(--accent)'; btnCode.style.color = 'var(--accent)'; btnCode.textContent='Utiliser une clé';
  
  btnCode.onclick = () => {
      const codeFound = ACCESS_CODES.find(ac => ac.code === inputCode.value);
      if(codeFound) {
          state.pseudo = codeFound.pseudo; 
          state.email = null; // Pas d'email pour les invités par code
          // On crée un faux profil utilisateur temporaire dans USERS s'il n'existe pas pour sauvegarder la progression de la session
          if(!USERS.find(u => u.pseudo === codeFound.pseudo)) {
              USERS.push({ email: null, password: null, pseudo: codeFound.pseudo, progression:{correct:0, incorrect:0} });
          }
          updateHeader(); 
          renderHome();
          showAlert(`Bienvenue ${codeFound.pseudo}`, 'success');
      } else {
          showAlert('Clé d\'accès invalide', 'error');
      }
  };
  card.appendChild(inputCode); card.appendChild(btnCode);

  // --- 3. CRÉATION DE COMPTE ---
  const sep = document.createElement('div'); sep.textContent='— ou Nouveau Compte —'; sep.className='small'; sep.style.margin='16px 0'; card.appendChild(sep);
  
  const inRegEmail = document.createElement('input'); inRegEmail.placeholder='Email'; inRegEmail.className='input';
  const inRegPass = document.createElement('input'); inRegPass.placeholder='Mot de passe'; inRegPass.className='input'; inRegPass.type='password';
  const inPseudo = document.createElement('input'); inPseudo.placeholder='Pseudo'; inPseudo.className='input';
  const btnReg = document.createElement('button'); btnReg.className='link'; btnReg.textContent='Créer compte';
  btnReg.onclick=()=>{
    if(!inRegEmail.value || !inRegPass.value || !inPseudo.value) return showAlert('Champs manquants','error');
    if(USERS.find(u=> u.email===inRegEmail.value || u.pseudo===inPseudo.value)) return showAlert('Existe déjà','error');
    USERS.push({ email: inRegEmail.value, password: inRegPass.value, pseudo: inPseudo.value, progression:{correct:0, incorrect:0} });
    saveUsers(); showAlert('Compte créé !','success'); inputUser.value=inRegEmail.value; inputPass.value='';
  };
  card.appendChild(inRegEmail); card.appendChild(inRegPass); card.appendChild(inPseudo); card.appendChild(btnReg);
  app.appendChild(card);
}

// INIT
loadUsers();
renderLogin();
updateHeader();
