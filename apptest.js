// ============================================================
// APPTEST.JS - VERSION FUSIONNÉE (AUTONOME)
// Contient : Mode Classique + Mode Génératif dans un seul fichier
// ============================================================

// 1. IMPORTS
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCig9G4gYHU5h642YV1IZxthYm_IXp6vZU",
    authDomain: "medicome-paco.firebaseapp.com",
    projectId: "medicome-paco",
    storageBucket: "medicome-paco.firebasestorage.app",
    messagingSenderId: "332171806096",
    appId: "1:332171806096:web:36889325196a7a718b5f15"
};

// Initialisation sécurisée
let app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

// ============================================================
// 2. VARIABLES GLOBALES PARTAGÉES
// ============================================================

let PATHOLOGIES = [];
let cachedOpenAIKey = null;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let GLOBAL_IMG_MAP = {};

// --- ÉTAT MODE CLASSIQUE (TU DEVINES) ---
let experimentState = {
    mode: null, targetPathology: null, patientProfile: {},
    chiefComplaint: null, questionsAsked: [], wrongAnswers: 0,
    startTime: null, hintsGiven: 0, attempts: 0, sessionId: null
};

// --- ÉTAT MODE GÉNÉRATIF (IA DEVINE - JEU ORIGINAL) ---
let genState = {
    answers: {}, asked: [], ranked: [], currentSign: null, demo: {},
    history: [], startTime: null
};

// ============================================================
// 3. INITIALISATION & ROUTAGE
// ============================================================

async function initApp() {
    try {
        const response = await fetch('./pathologies.json');
        if (!response.ok) throw new Error("Fichier pathologies.json introuvable");
        PATHOLOGIES = await response.json();
        
        // Charger images
        PATHOLOGIES.forEach(p => {
            if(p.images) Object.entries(p.images).forEach(([k,v]) => GLOBAL_IMG_MAP[k] = v);
        });

        // Routeur simple basé sur l'URL
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');

        if (mode === 'generatif') {
            initGeneratifMode(); // Lance le moteur IA
        } else if (mode === 'classique') {
            startClassiqueMode(); // Lance le moteur Enquête
        } else {
            renderModeSelection(); // Affiche le menu
        }

    } catch (error) {
        document.getElementById('app').innerHTML = `<div class="card center"><h2 style="color:red">Erreur</h2><p>${error.message}</p></div>`;
    }
}

function renderModeSelection() {
    
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="card center" style="max-width: 700px;">
            <h2><i class="ph-duotone ph-flask"></i> Étude Scientifique</h2>
            <p class="small" style="margin-bottom: 30px;">Choisissez le protocole :</p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%; margin-bottom: 20px;">
                <div class="mode-card" onclick="selectMode('generatif')">
                    <div class="mode-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <i class="ph-duotone ph-brain" style="font-size: 3em; color: white;"></i>
                    </div>
                    <h3 style="margin: 15px 0 10px; color: var(--text-main);">Mode Inversé</h3>
                    <p class="small">L'IA vous pose des questions pour deviner votre pathologie.</p>
                </div>

                <div class="mode-card" onclick="selectMode('classique')">
                    <div class="mode-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                        <i class="ph-duotone ph-detective" style="font-size: 3em; color: white;"></i>
                    </div>
                    <h3 style="margin: 15px 0 10px; color: var(--text-main);">Mode Classique</h3>
                    <p class="small">Vous posez des questions à l'IA pour trouver le diagnostic.</p>
                </div>
            </div>
            <div class="small" style="opacity:0.6">Medicome Research</div>
        </div>
        <style>
            .mode-card { background: var(--glass-bg); border: 2px solid var(--glass-border); border-radius: 16px; padding: 25px; cursor: pointer; text-align: center; transition: 0.3s; }
            .mode-card:hover { transform: translateY(-5px); border-color: var(--accent); }
            .mode-icon { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
        </style>
    `;
}

window.selectMode = function(mode) {
    // Recharge la page avec le bon paramètre pour nettoyer la mémoire
    window.location.href = `?mode=${mode}`;
}

// ============================================================
// 4. API OPENAI (PARTAGÉE)
// ============================================================

async function callOpenAI(systemPrompt, userText = null) {
    if (!cachedOpenAIKey) {
        cachedOpenAIKey = prompt("🔐 Clé OpenAI requise (sk-...) :");
        if (!cachedOpenAIKey) return null;
    }
    try {
        const messages = [{ role: "system", content: systemPrompt }];
        if(userText) messages.push({ role: "user", content: userText });

        const req = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cachedOpenAIKey}` },
            body: JSON.stringify({ model: "gpt-4o-mini", messages: messages, temperature: 0 })
        });
        const data = await req.json();
        let clean = data.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(clean);
    } catch (e) { 
        console.error("Erreur IA", e); 
        alert("Erreur API OpenAI. Vérifiez la console.");
        return null; 
    }
}

function playSound(type) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    if(type === 'success') {
        osc.frequency.setValueAtTime(500, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime+0.2);
    } else {
        osc.type='sawtooth'; osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    }
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime+0.3);
    osc.start(); osc.stop(audioCtx.currentTime+0.3);
}

// ============================================================
// 5. MODE CLASSIQUE (L'IA EST LE PATIENT)
// ============================================================

function startClassiqueMode() {
    experimentState.mode = 'classique';
    experimentState.questionsAsked = [];
    experimentState.wrongAnswers = 0;
    experimentState.hintsGiven = 0;
    experimentState.startTime = Date.now();
    experimentState.targetPathology = PATHOLOGIES[Math.floor(Math.random() * PATHOLOGIES.length)];
    
    // Génération Profil Patient
    const f = experimentState.targetPathology.facteurs || {};
    const p = { age: "45 ans", gender: Math.random()>0.5?"Homme":"Femme", terrain: [] };
    if(f.enfant) p.age = "Enfant (8 ans)"; if(f.sujet_age) p.age = "Senior (75 ans)";
    if(f.femme) p.gender = "Femme"; if(f.homme) p.gender = "Homme";
    if(f.tabac) p.terrain.push("Tabagisme"); if(f.diabete) p.terrain.push("Diabète");
    if(p.terrain.length===0) p.terrain.push("RAS");
    experimentState.patientProfile = p;

    // Motif principal
    let motif = "Malaise"; let max=0;
    for(let s in experimentState.targetPathology.signes) {
        if(experimentState.targetPathology.signes[s] > max) { max = experimentState.targetPathology.signes[s]; motif = s; }
    }
    experimentState.chiefComplaint = motif;
    
    renderClassiqueInterface();
}

function renderClassiqueInterface() {
    const p = experimentState.patientProfile;
    document.getElementById('app').innerHTML = `
        <div class="card center" style="max-width:800px;">
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                <h2 style="color:white; margin:0;"><i class="ph-duotone ph-detective"></i> Mode Classique</h2>
            </div>
            
            <div style="text-align:left; background:rgba(255,255,255,0.05); padding:15px; border-radius:10px; margin-bottom:20px;">
                <div><strong>Patient :</strong> ${p.gender}, ${p.age}</div>
                <div><strong>ATCD :</strong> ${p.terrain.join(', ')}</div>
                <div style="margin-top:10px; color:var(--gold);"><strong>Motif :</strong> ${experimentState.chiefComplaint.replace(/_/g,' ')}</div>
            </div>

            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <input id="qInput" class="input" placeholder="Posez votre question..." style="margin:0;">
                <button id="btnAsk" class="btn" onclick="handleClassiqueQ()" style="width:auto;"><i class="ph-bold ph-paper-plane-right"></i></button>
            </div>
            
            <div id="history" style="height:200px; overflow-y:auto; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; text-align:left; margin-bottom:20px;">
                <div class="small" style="text-align:center; opacity:0.5;">Historique vide</div>
            </div>

            <div style="border-top:1px solid var(--glass-border); padding-top:20px;">
                <input id="diagInput" class="input" placeholder="Votre diagnostic...">
                <button class="btn" onclick="validateClassique()" style="background:var(--success);">Valider</button>
            </div>
            <button class="link" onclick="selectMode('menu')">Menu</button>
        </div>
    `;
    document.getElementById('qInput').onkeydown = (e) => { if(e.key === 'Enter') handleClassiqueQ(); };
}

async function handleClassiqueQ() {
    const input = document.getElementById('qInput');
    const txt = input.value.trim(); if(!txt) return;
    const btn = document.getElementById('btnAsk'); btn.disabled=true; btn.innerHTML='...';
    
    // Prompt optimisé pour simuler le patient
    const target = experimentState.targetPathology;
    const present = Object.keys(target.signes).join(", ");
    const prompt = `Simulation Médicale. Patient a: "${target.name}". 
    Signes présents: [${present}].
    Question étudiant: "${txt}".
    1. Si la question porte sur un signe PRÉSENT, return {"answer": true, "sign": "code_signe"}.
    2. Si signe ABSENT, return {"answer": false, "sign": "code_signe"}.
    3. Si hors sujet, null.`;
    
    const res = await callOpenAI(prompt);
    
    btn.disabled=false; btn.innerHTML='<i class="ph-bold ph-paper-plane-right"></i>';
    input.value=''; input.focus();

    if(res) {
        experimentState.questionsAsked.push(txt);
        const list = document.getElementById('history');
        if(experimentState.questionsAsked.length === 1) list.innerHTML = '';
        const div = document.createElement('div');
        div.style.marginBottom = "5px"; div.style.padding="5px"; div.style.borderBottom="1px solid rgba(255,255,255,0.05)";
        div.innerHTML = `<strong>Q:</strong> ${txt} <span style="float:right; font-weight:bold; color:${res.answer?'#2ecc71':'#e74c3c'}">${res.answer?'OUI':'NON'}</span>`;
        list.appendChild(div); list.scrollTop = list.scrollHeight;
        
        if(!res.answer) {
            experimentState.wrongAnswers++;
            if(experimentState.wrongAnswers >= 5) alert(`💡 Indice : ${target.short}`);
        } else { experimentState.wrongAnswers=0; }
    } else { alert("Je n'ai pas compris."); }
}

function validateClassique() {
    const guess = document.getElementById('diagInput').value.toLowerCase();
    const target = experimentState.targetPathology.name.toLowerCase();
    if(target.includes(guess) || guess.includes(target)) {
        playSound('success');
        if(window.confetti) window.confetti();
        document.getElementById('app').innerHTML = `<div class="card center"><h1 style="color:var(--success)">Gagné !</h1><h3>${experimentState.targetPathology.name}</h3><p>Trouvé en ${experimentState.questionsAsked.length} questions.</p><button class="btn" onclick="selectMode('menu')">Menu</button></div>`;
    } else {
        playSound('error');
        alert(`Non, ce n'est pas ça.`);
    }
}

// ============================================================
// 6. MODE GÉNÉRATIF (L'IA DEVINE - RESTAURÉ)
// ============================================================

function initGeneratifMode() {
    // Initialisation du jeu original
    genState.answers = {};
    genState.asked = [];
    genState.ranked = [];
    renderGenMotif();
}

function renderGenMotif() {
    document.getElementById('app').innerHTML = `
        <div class="card center">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 10px; border-radius: 12px; margin-bottom: 20px;">
                <h2 style="color:white; margin:0;"><i class="ph-duotone ph-brain"></i> Mode Inversé</h2>
            </div>
            <p class="small">Pensez à une pathologie. Je vais la deviner.</p>
            <div style="background:rgba(102,126,234,0.1); padding:15px; border-radius:12px; margin:20px 0; text-align:left;">
                <label style="color:var(--accent); font-weight:bold;">"Bonjour, qu'est-ce qui vous amène ?"</label>
                <textarea id="genMotif" class="input" placeholder="Ex: Douleur thoracique..." style="min-height:80px;"></textarea>
            </div>
            <button id="btnGenStart" class="btn">Commencer</button>
            <button class="link" onclick="selectMode('menu')">Menu</button>
        </div>
    `;
    
    document.getElementById('btnGenStart').onclick = async () => {
        const txt = document.getElementById('genMotif').value; if(!txt) return;
        const btn = document.getElementById('btnGenStart'); btn.innerHTML='...'; btn.disabled=true;
        
        // Analyse du motif par IA pour trouver le premier signe
        const allSigns = []; PATHOLOGIES.forEach(p=>Object.keys(p.signes).forEach(s=>allSigns.push(s)));
        const prompt = `Texte: "${txt}". Trouve le signe médical correspondant dans cette liste: [${allSigns.slice(0,50).join(',')}...]. Return {"sign": "code"}. Si rien, return {"sign": "douleur_abdominale"}.`;
        
        const res = await callOpenAI(prompt);
        const startSign = res ? res.sign : "douleur_abdominale";
        
        genState.currentSign = startSign;
        genState.asked = [startSign];
        genState.answers[startSign] = true;
        askNextGen();
    };
}

function askNextGen() {
    // 1. Calcul des scores (Moteur de jeu original)
    genState.ranked = PATHOLOGIES.map(p => {
        let score = 0; let max = 0;
        for(let s in p.signes) {
            max += p.signes[s];
            if(genState.answers[s] === true) score += p.signes[s];
            if(genState.answers[s] === false) score -= (p.signes[s] * 0.5);
        }
        return { patho: p, prob: max>0 ? (score/max)*100 : 0 };
    }).sort((a,b) => b.prob - a.prob);

    // 2. Vérification victoire
    const top = genState.ranked[0];
    if(top && top.prob > 85 && genState.asked.length > 5) {
        renderGenResult(top.patho);
        return;
    }

    // 3. Choix prochaine question
    let nextSign = null;
    if(top) {
        // Cherche un signe du Top 1 non encore posé
        for(let s in top.patho.signes) {
            if(!genState.asked.includes(s)) { nextSign = s; break; }
        }
    }
    // Fallback si tout est posé
    if(!nextSign) {
        const all = []; PATHOLOGIES.forEach(p=>Object.keys(p.signes).forEach(s=>all.push(s)));
        nextSign = all.find(s => !genState.asked.includes(s));
    }
    
    if(!nextSign) { renderGenResult(top.patho); return; }

    genState.currentSign = nextSign;
    genState.asked.push(nextSign);
    renderGenQuestion();
}

function renderGenQuestion() {
    const sign = genState.currentSign;
    const displaySign = sign.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    const imgUrl = GLOBAL_IMG_MAP[sign];
    
    document.getElementById('app').innerHTML = `
        <div class="card center">
            <div style="font-size:0.8em; color:var(--accent);">Confiance IA : ${genState.ranked[0]?.prob.toFixed(0)}%</div>
            ${imgUrl ? `<img src="${imgUrl}" style="max-width:100%; border-radius:8px; margin:10px 0;">` : ''}
            <h3>Le patient présente-t-il :</h3>
            <h2 style="color:var(--text-main); margin:20px 0;">${displaySign} ?</h2>
            
            <div style="display:flex; gap:10px; margin-bottom:15px;">
                <input id="iaChat" class="input" placeholder="Répondre à l'IA (ex: Oui, beaucoup...)" style="margin:0;">
                <button id="iaSend" class="btn" style="width:auto;"><i class="ph-bold ph-paper-plane-right"></i></button>
            </div>

            <div class="button-group">
                <button class="btn btn-success" onclick="handleGenAnswer(true)">OUI</button>
                <button class="btn btn-error" onclick="handleGenAnswer(false)">NON</button>
            </div>
        </div>
    `;
    
    document.getElementById('iaSend').onclick = async () => {
        const txt = document.getElementById('iaChat').value; if(!txt) return;
        const btn = document.getElementById('iaSend'); btn.innerHTML='...';
        const prompt = `Context: Diag. Signe: "${sign}". User: "${txt}". Si OUI return {"r":true}. Si NON return {"r":false}.`;
        const res = await callOpenAI(prompt);
        if(res) handleGenAnswer(res.r);
        else btn.innerHTML='<i class="ph-bold ph-paper-plane-right"></i>';
    };
}

window.handleGenAnswer = function(val) {
    genState.answers[genState.currentSign] = val;
    if(val) playSound('success'); else playSound('error');
    askNextGen();
}

function renderGenResult(patho) {
    if(window.confetti) window.confetti();
    document.getElementById('app').innerHTML = `
        <div class="card center">
            <h2>Diagnostic IA</h2>
            <h1 style="color:var(--accent);">${patho.name}</h1>
            <p>${patho.short || ''}</p>
            <div style="margin-top:20px;">
                <button class="btn btn-success" onclick="selectMode('generatif')">C'est ça (Rejouer)</button>
                <button class="btn btn-error" onclick="selectMode('generatif')">C'est faux</button>
            </div>
            <button class="link" onclick="selectMode('menu')">Menu</button>
        </div>
    `;
}

// LANCEMENT
initApp();
