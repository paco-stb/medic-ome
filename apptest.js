// ============================================================
// APPTEST.JS - MODE EXPÉRIMENTAL POUR ÉTUDE SCIENTIFIQUE
// Comparaison : Raisonnement Génératif Inversé vs Classique
// ============================================================

import { getFirestore, doc, getDoc, setDoc, addDoc, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// AJOUT DE getApps ICI :
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCig9G4gYHU5h642YV1IZxthYm_IXp6vZU",
    authDomain: "medicome-paco.firebaseapp.com",
    projectId: "medicome-paco",
    storageBucket: "medicome-paco.firebasestorage.app",
    messagingSenderId: "332171806096",
    appId: "1:332171806096:web:36889325196a7a718b5f15"
};

// CORRECTION : On vérifie si une app existe déjà pour éviter le crash
let app;
if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);

// ============================================================
// VARIABLES GLOBALES
// ============================================================

let PATHOLOGIES = [];
let experimentState = {
    mode: null, // 'generatif' ou 'classique'
    targetPathology: null,
    patientProfile: {},
    chiefComplaint: null,
    questionsAsked: [],
    wrongAnswers: 0,
    startTime: null,
    sessionId: null,
    hintsGiven: 0,
    attempts: 0
};

let cachedOpenAIKey = null;

// ============================================================
// INITIALISATION
// ============================================================

async function initExperiment() {
    try {
        const response = await fetch('./pathologies.json');
        PATHOLOGIES = await response.json();
        renderModeSelection();
    } catch (error) {
        console.error("Erreur chargement pathologies:", error);
        document.getElementById('app').innerHTML = `
            <div class="card center">
                <h2 style="color:var(--error)">Erreur de chargement</h2>
                <p class="small">${error.message}</p>
            </div>
        `;
    }
}

// ============================================================
// SÉLECTION DU MODE EXPÉRIMENTAL
// ============================================================

function renderModeSelection() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="card center" style="max-width: 1200px;">
            <h2><i class="ph-duotone ph-flask"></i> Étude Scientifique</h2>
            <p class="small" style="margin-bottom: 30px; line-height: 1.6;">
                Comparaison de deux paradigmes d'apprentissage médical :<br>
                <strong>Raisonnement Génératif Inversé</strong> vs <strong>Démarche Classique</strong>
            </p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; width: 100%; margin-bottom: 30px;">
                <!-- MODE GÉNÉRATIF INVERSÉ -->
                <div class="mode-card">
                    <div class="mode-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <i class="ph-duotone ph-brain" style="font-size: 3em; color: white;"></i>
                    </div>
                    <h3 style="margin: 15px 0 10px; color: var(--text-main);">Mode Génératif Inversé</h3>
                    <p class="small" style="line-height: 1.5; margin-bottom: 15px; min-height: 80px;">
                        Vous pensez à une pathologie, l'IA pose des questions pour la deviner.
                        <br><strong>(Mode actuel de Medicome)</strong>
                    </p>
                    <button class="btn" style="width: 100%; font-size: 14px;" onclick="startGeneratifMode()">
                        <i class="ph-bold ph-play"></i> Démarrer
                    </button>
                </div>

                <!-- MODE CLASSIQUE -->
                <div class="mode-card">
                    <div class="mode-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                        <i class="ph-duotone ph-detective" style="font-size: 3em; color: white;"></i>
                    </div>
                    <h3 style="margin: 15px 0 10px; color: var(--text-main);">Mode Classique</h3>
                    <p class="small" style="line-height: 1.5; margin-bottom: 15px; min-height: 80px;">
                        L'IA a une pathologie en tête, vous posez des questions pour la découvrir.
                        <br><strong>(Démarche diagnostique traditionnelle)</strong>
                    </p>
                    <button class="btn" style="width: 100%; font-size: 14px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);" onclick="startClassiqueMode()">
                        <i class="ph-bold ph-play"></i> Démarrer
                    </button>
                </div>
            </div>

            <div style="background: rgba(255,159,67,0.1); padding: 20px; border-radius: 12px; border-left: 3px solid var(--gold); text-align: left;">
                <div style="font-weight: bold; color: var(--gold); margin-bottom: 10px;">
                    <i class="ph-duotone ph-info"></i> À propos de cette étude
                </div>
                <div class="small" style="line-height: 1.6;">
                    Cette interface permet de comparer l'efficacité pédagogique de deux approches :
                    <br>• <strong>Génératif</strong> : Active la génération d'hypothèses (mode inversé)
                    <br>• <strong>Classique</strong> : Interrogatoire diagnostique standard
                    <br><br>
                    Les données anonymisées (temps, questions, succès) seront collectées pour analyse statistique.
                </div>
            </div>
        </div>

        <style>
            .mode-card {
                background: var(--glass-bg);
                border: 2px solid var(--glass-border);
                border-radius: 16px;
                padding: 20px; /* Réduit de 30 à 20 */
                transition: all 0.3s;
                text-align: center;
                cursor: pointer; /* Ajout pour l'UX */
            }
            .mode-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                border-color: var(--accent);
            }
            /* C'est ici qu'on gère la taille des "images" (les bulles) */
            .mode-icon {
                width: 60px;  /* Réduit de 100px à 60px */
                height: 60px; /* Réduit de 100px à 60px */
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 10px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            }
            /* On réduit aussi la taille de l'icône à l'intérieur */
            .mode-icon i {
                font-size: 1.8em !important; /* Réduit de 3em à 1.8em */
                color: white;
            }
        </style>
    `;
}

// ============================================================
// MODE GÉNÉRATIF INVERSÉ (MODE ACTUEL)
// ============================================================

window.startGeneratifMode = function() {
    experimentState.mode = 'generatif';
    experimentState.sessionId = Date.now().toString();
    experimentState.startTime = Date.now();
    
    // Redirection SANS le paramètre "direct=ia" qui cause le bug
    window.location.href = 'index.html';
}

// ============================================================
// MODE CLASSIQUE (NOUVEAU - EXPÉRIMENTAL)
// ============================================================

window.startClassiqueMode = function() {
    experimentState.mode = 'classique';
    experimentState.sessionId = Date.now().toString();
    experimentState.startTime = Date.now();
    experimentState.questionsAsked = [];
    experimentState.wrongAnswers = 0;
    experimentState.hintsGiven = 0;
    experimentState.attempts = 0;
    
    // Sélection aléatoire d'une pathologie
    experimentState.targetPathology = PATHOLOGIES[Math.floor(Math.random() * PATHOLOGIES.length)];
    
    // Génération du profil patient
    generatePatientProfile(experimentState.targetPathology);
    
    renderClassiqueInterface();
}

// ============================================================
// GÉNÉRATION DU PROFIL PATIENT
// ============================================================

function generatePatientProfile(pathology) {
    const profile = {
        age: "Adulte (45 ans)",  // ✅ Valeur par défaut
        gender: Math.random() > 0.5 ? "Homme" : "Femme",  // ✅ Valeur par défaut
        terrain: []
    };
    
    // ✅ Récupération sécurisée des facteurs
    const facteurs = pathology.facteurs || {};
    
    // Détermination de l'âge basée sur les facteurs (si disponibles)
    if (facteurs['nourrisson_moins_2ans'] || facteurs['nourrisson']) {
        profile.age = "Nourrisson (< 2 ans)";
    } else if (facteurs['enfant'] || facteurs['enfant_3_15ans']) {
        profile.age = "Enfant (8 ans)";
    } else if (facteurs['adolescent'] || facteurs['sujet_jeune']) {
        profile.age = "Adolescent (16 ans)";
    } else if (facteurs['adulte_jeune'] || facteurs['jeune']) {
        profile.age = "Jeune adulte (28 ans)";
    } else if (facteurs['plus_de_50ans'] || facteurs['adulte']) {
        profile.age = "Adulte (55 ans)";
    } else if (facteurs['sujet_age'] || facteurs['age_>65ans']) {
        profile.age = "Senior (72 ans)";
    }
    
    // Détermination du genre basée sur les facteurs (si disponibles)
    if (facteurs['homme'] || facteurs['homme_age'] || facteurs['homme_jeune']) {
        profile.gender = "Homme";
    } else if (facteurs['femme'] || facteurs['femme_jeune'] || facteurs['femme_age_procreer']) {
        profile.gender = "Femme";
    }
    
    // Terrain médical (basé sur les facteurs si disponibles)
    if (facteurs['tabac'] || facteurs['tabagisme']) {
        profile.terrain.push("Tabagisme actif");
    }
    if (facteurs['diabete']) {
        profile.terrain.push("Diabète de type 2");
    }
    if (facteurs['hta']) {
        profile.terrain.push("HTA");
    }
    if (facteurs['alcoolisme_chronique'] || facteurs['alcool']) {
        profile.terrain.push("Éthylisme chronique");
    }
    if (facteurs['surpoids'] || facteurs['obesite']) {
        profile.terrain.push("Obésité (IMC 32)");
    }
    if (facteurs['immunodepression']) {
        profile.terrain.push("Immunodépression");
    }
    if (facteurs['grossesse']) {
        profile.terrain.push("Grossesse (28 SA)");
    }
    
    // ✅ IMPORTANT : Sauvegarder AVANT d'accéder aux signes
    experimentState.patientProfile = profile;
    
    // Identification du chef de file
    const signes = pathology.signes || {};
    const generalSymptoms = [
        'douleur_thoracique', 'douleur_abdominale', 'fievre', 'dyspnee', 
        'cephalees', 'troubles_neuro', 'anomalie_peau', 'genes_urinaires',
        'douleur_membre_traumatisme', 'douleur_dos', 'trouble_psy', 'toux'
    ];
    
    let maxWeight = 0;
    let chiefComplaint = null;
    for (const symptom of generalSymptoms) {
        if (signes[symptom] && signes[symptom] > maxWeight) {
            maxWeight = signes[symptom];
            chiefComplaint = symptom;
        }
    }
    
    experimentState.chiefComplaint = chiefComplaint || 'douleur_abdominale';
}

// ============================================================
// INTERFACE MODE CLASSIQUE
// ============================================================

function renderClassiqueInterface() {
    const app = document.getElementById('app');
    const profile = experimentState.patientProfile;
    const chiefComplaint = formatSymptomName(experimentState.chiefComplaint);
    
    const terrainText = (profile && profile.terrain && profile.terrain.length > 0)
        ? profile.terrain.join(', ') 
        : "Aucun antécédent notable";
    
    app.innerHTML = `
        <div class="card center" style="max-width: 1000px; width: 95%; padding: 0; background: transparent; box-shadow: none;">
            
            <div class="header-banner">
                <h2><i class="ph-duotone ph-detective"></i> Enquête Diagnostique</h2>
                <div class="patient-summary">
                    <span><i class="ph-duotone ph-user"></i> ${profile.gender}, ${profile.age}</span>
                    <span class="sep">•</span>
                    <span><i class="ph-duotone ph-warning-circle"></i> Motif : <strong>${chiefComplaint}</strong></span>
                </div>
            </div>

            <div class="game-grid">
                
                <div class="left-col">
                    <div class="info-card terrain-card">
                        <div class="card-label"><i class="ph-duotone ph-clipboard-text"></i> Terrain & Antécédents</div>
                        <div class="card-value">${terrainText}</div>
                    </div>
                    
                    <div class="stats-row">
                        <div class="mini-stat">
                            <div class="val" id="questionsCount">0</div>
                            <div class="lbl">Questions</div>
                        </div>
                        <div class="mini-stat error-stat">
                            <div class="val" id="wrongCount">0</div>
                            <div class="lbl">Impasses</div>
                        </div>
                        <div class="mini-stat hint-stat">
                            <div class="val" id="hintsCount">0</div>
                            <div class="lbl">Indices</div>
                        </div>
                    </div>

                    <div class="history-container">
                        <div class="history-header"><i class="ph-duotone ph-chats-circle"></i> Historique</div>
                        <div id="historyList" class="history-content">
                            <div class="empty-state">
                                <i class="ph-duotone ph-chat-teardrop-dots"></i>
                                <p>L'interrogatoire commence...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="right-col">
                    
                    <div class="action-card question-card">
                        <label class="action-label"><i class="ph-bold ph-microphone"></i> Posez votre question</label>
                        <div class="input-wrapper">
                            <textarea id="questionInput" class="modern-input" placeholder="Ex: Avez-vous de la fièvre ? La douleur irradie-t-elle ?"></textarea>
                            <div class="input-focus-border"></div>
                        </div>
                        <button id="askBtn" class="modern-btn btn-primary">
                            <span>Envoyer</span> <i class="ph-bold ph-paper-plane-right"></i>
                        </button>
                    </div>

                    <div class="action-card diag-card">
                        <label class="action-label gold-label"><i class="ph-fill ph-lightbulb"></i> Votre conclusion</label>
                        <div class="input-wrapper">
                            <input id="diagnosisInput" class="modern-input" placeholder="Nom de la pathologie...">
                            <div class="input-focus-border gold-border"></div>
                        </div>
                        <button id="submitDiagnosisBtn" class="modern-btn btn-gold">
                            <i class="ph-bold ph-check-circle"></i> Valider le diagnostic
                        </button>
                    </div>

                    <button class="text-btn" onclick="renderModeSelection()">
                        <i class="ph-bold ph-arrow-left"></i> Quitter
                    </button>

                </div>
            </div>
        </div>

        <style>
            /* LAYOUT & GRID */
            .header-banner {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 30px;
                border-radius: 20px;
                margin-bottom: 25px;
                text-align: left;
                box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
            }
            .header-banner h2 { color: white; margin: 0 0 10px 0; font-size: 1.8em; }
            .patient-summary { color: rgba(255,255,255,0.9); display: flex; align-items: center; gap: 10px; font-size: 1.1em; }
            .sep { opacity: 0.5; }

            .game-grid {
                display: grid;
                grid-template-columns: 1fr 1.2fr; /* Colonne droite un peu plus large */
                gap: 25px;
            }
            @media (max-width: 800px) { .game-grid { grid-template-columns: 1fr; } }

            /* CARDS GÉNÉRIQUES */
            .info-card, .action-card {
                background: rgba(30, 30, 46, 0.8); /* Fond sombre */
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 16px;
                padding: 20px;
                backdrop-filter: blur(10px);
            }

            /* INFO PATIENT */
            .card-label { font-size: 0.85em; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
            .card-value { font-size: 1.1em; color: var(--text-main); line-height: 1.5; }

            /* STATS */
            .stats-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 20px 0; }
            .mini-stat { background: rgba(0,0,0,0.2); padding: 10px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
            .mini-stat .val { font-size: 1.4em; font-weight: bold; color: var(--accent); }
            .mini-stat .lbl { font-size: 0.75em; color: var(--text-muted); margin-top: 4px; }
            .error-stat .val { color: var(--error); }
            .hint-stat .val { color: var(--gold); }

            /* HISTORIQUE */
            .history-container {
                background: rgba(0,0,0,0.2);
                border-radius: 16px;
                border: 1px solid rgba(255,255,255,0.05);
                height: 300px; /* Hauteur fixe avec scroll */
                display: flex; flex-direction: column;
            }
            .history-header { padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); font-weight: bold; color: var(--text-muted); display:flex; gap:8px; align-items:center; }
            .history-content { flex: 1; overflow-y: auto; padding: 15px; }
            .empty-state { text-align: center; color: var(--text-muted); opacity: 0.5; margin-top: 80px; }
            .empty-state i { font-size: 3em; margin-bottom: 10px; }

            /* INPUTS MODERNES */
            .action-label { display: block; margin-bottom: 12px; font-weight: 600; color: var(--accent); display:flex; align-items:center; gap:8px;}
            .gold-label { color: var(--gold); }
            
            .input-wrapper { position: relative; margin-bottom: 15px; }
            .modern-input {
                width: 100%;
                background: rgba(0,0,0,0.3);
                border: 2px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                padding: 15px;
                color: white;
                font-size: 1em;
                font-family: inherit;
                transition: all 0.3s ease;
                outline: none;
            }
            textarea.modern-input { min-height: 100px; resize: vertical; }
            
            .modern-input:focus {
                background: rgba(0,0,0,0.5);
                border-color: var(--accent);
                box-shadow: 0 0 20px rgba(102, 126, 234, 0.2);
            }
            #diagnosisInput:focus { border-color: var(--gold); box-shadow: 0 0 20px rgba(255, 159, 67, 0.2); }

            /* BOUTONS */
            .modern-btn {
                width: 100%;
                padding: 14px;
                border: none;
                border-radius: 12px;
                font-size: 1em;
                font-weight: 600;
                cursor: pointer;
                display: flex; align-items: center; justify-content: center; gap: 10px;
                transition: transform 0.2s, box-shadow 0.2s;
                color: white;
            }
            .modern-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
            .modern-btn:active { transform: translateY(0); }
            
            .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .btn-gold { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
            
            .text-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 10px; width: 100%; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; }
            .text-btn:hover { color: white; }
        </style>
    `;
    
    // Réattachement des événements (Crucial !)
    document.getElementById('askBtn').onclick = handleQuestion;
    document.getElementById('submitDiagnosisBtn').onclick = validateDiagnosis;
    
    document.getElementById('questionInput').onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuestion(); }
    };
    document.getElementById('diagnosisInput').onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); validateDiagnosis(); }
    };
}

// ============================================================
// TRAITEMENT DES QUESTIONS (LLM)
// ============================================================

async function handleQuestion() {
    const questionText = document.getElementById('questionInput').value.trim();
    if (!questionText) return;
    
    const btn = document.getElementById('askBtn');
    btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Analyse en cours...';
    btn.disabled = true;
    
    // Analyse de la question via LLM
    const result = await analyzeQuestion(questionText);
    
    btn.innerHTML = '<i class="ph-bold ph-paper-plane-right"></i> Envoyer la question';
    btn.disabled = false;
    
    if (result === null) {
        alert("❌ Question non comprise ou trop vague. Reformulez de manière plus précise.\n\nExemple : 'Le patient a-t-il une douleur constrictive ?'");
        return;
    }
    
    // Enregistrement de la question
    experimentState.questionsAsked.push({
        question: questionText,
        sign: result.sign,
        answer: result.answer,
        timestamp: Date.now() - experimentState.startTime
    });
    
    updateCounters();
    addQuestionToHistory(questionText, result.answer);
    
    // Gestion des mauvaises réponses consécutives
    if (!result.answer) {
        experimentState.wrongAnswers++;
        if (experimentState.wrongAnswers >= 5) {
            giveHint();
        }
    } else {
        experimentState.wrongAnswers = 0; // Reset si bonne réponse
    }
    
    document.getElementById('questionInput').value = '';
    document.getElementById('questionInput').focus();
}

// ============================================================
// ANALYSE DE LA QUESTION PAR LLM (CORRIGÉE & OPTIMISÉE)
// ============================================================

async function analyzeQuestion(questionText) {
    if (!cachedOpenAIKey) {
        cachedOpenAIKey = prompt("🔐 Clé OpenAI requise pour le mode expérimental (sk-...) :");
        if (!cachedOpenAIKey) return null;
    }

    const targetPathology = experimentState.targetPathology;
    const presentSignsKeys = Object.keys(targetPathology.signes).join(", ");

    const systemPrompt = `Tu es un moteur sémantique médical. Le patient souffre de "${targetPathology.name}".
Signes PRÉSENTS dans la pathologie : [${presentSignsKeys}]

L'étudiant pose : "${questionText}"

Ta mission :
1. Identifie le symptôme/signe médical visé
2. Si le signe correspond à un code de la liste (même approximativement), utilise ce code EXACT
3. Si le signe n'est PAS dans la liste, génère quand même un code snake_case standard (ex: "ictere", "boiterie", "prurit")
4. IMPORTANT : Tu dois TOUJOURS renvoyer un code, même si le signe est absent de la pathologie

Réponds UNIQUEMENT en JSON :
{"detected_sign": "code_du_signe"}

JAMAIS {"detected_sign": null} sauf si la question est totalement incompréhensible.`;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${cachedOpenAIKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: systemPrompt }],
                temperature: 0
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert("❌ Clé API invalide.");
                cachedOpenAIKey = null;
            }
            throw new Error(`Erreur API: ${response.status}`);
        }

        const data = await response.json();
        let cleanContent = data.choices[0].message.content
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        const result = JSON.parse(cleanContent);

        if (!result.detected_sign) {
            return null;
        }

        const signDataInJson = targetPathology.signes[result.detected_sign];
        const isPresent = signDataInJson !== undefined;
        const weight = isPresent ? signDataInJson : 0;

        return {
            sign: result.detected_sign,
            answer: isPresent,
            weight: weight
        };

    } catch (error) {
        console.error("Erreur critique LLM:", error);
        return null;
    }
}

// ============================================================
// SYSTÈME D'INDICES
// ============================================================

function giveHint() {
    const targetPathology = experimentState.targetPathology;
    
    // Trouver les signes très pondérés non encore demandés
    const askedSigns = experimentState.questionsAsked.map(q => q.sign);
    const availableHints = Object.entries(targetPathology.signes)
        .filter(([sign, weight]) => weight >= 40 && !askedSigns.includes(sign))
        .sort((a, b) => b[1] - a[1]); // Tri par poids décroissant
    
    if (availableHints.length === 0) {
        alert("💡 Indice : Revoyez les signes paracliniques et les examens complémentaires caractéristiques !");
        return;
    }
    
    const [hintSign, hintWeight] = availableHints[0];
    const hintText = formatSymptomName(hintSign);
    
    experimentState.hintsGiven++;
    experimentState.wrongAnswers = 0; // Reset après indice
    
    alert(`💡 INDICE RÉVÉLATEUR\n\nUn signe clé à rechercher :\n\n"${hintText}"\n\n(Pondération : ${hintWeight} points)`);
    
    updateCounters();
}

// ============================================================
// VALIDATION DU DIAGNOSTIC
// ============================================================

async function validateDiagnosis() {
    const diagnosisInput = document.getElementById('diagnosisInput').value.trim();
    if (!diagnosisInput) {
        alert("⚠️ Veuillez entrer un diagnostic avant de valider.");
        return;
    }
    
    const targetName = experimentState.targetPathology.name.toLowerCase();
    const userGuess = diagnosisInput.toLowerCase();
    
    experimentState.attempts++;
    
    // Comparaison stricte ou similarité
    const isCorrect = targetName === userGuess || 
                      targetName.includes(userGuess) || 
                      userGuess.includes(targetName);
    
    const endTime = Date.now();
    const totalTime = Math.round((endTime - experimentState.startTime) / 1000);
    
    // Sauvegarde des données expérimentales
    await saveExperimentData({
        mode: 'classique',
        sessionId: experimentState.sessionId,
        targetPathology: experimentState.targetPathology.name,
        userGuess: diagnosisInput,
        success: isCorrect,
        questionsAsked: experimentState.questionsAsked.length,
        wrongAnswers: experimentState.wrongAnswers,
        hintsGiven: experimentState.hintsGiven,
        attempts: experimentState.attempts,
        totalTimeSeconds: totalTime,
        timestamp: new Date()
    });
    
    if (isCorrect) {
        renderSuccessScreen(totalTime);
    } else {
        renderFailureScreen(diagnosisInput);
    }
}

// ============================================================
// ÉCRANS DE RÉSULTAT
// ============================================================

function renderSuccessScreen(totalTime) {
    const app = document.getElementById('app');
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    
    app.innerHTML = `
        <div class="card center" style="max-width: 700px;">
            <div style="font-size: 5em; color: var(--success); margin-bottom: 20px; animation: float 2s ease-in-out infinite;">
                <i class="ph-fill ph-check-circle"></i>
            </div>
            <h2 style="color: var(--success); margin-bottom: 15px;">
                🎉 DIAGNOSTIC CORRECT !
            </h2>
            <div style="font-size: 1.5em; margin: 20px 0; color: var(--text-main);">
                ${experimentState.targetPathology.name}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 30px 0; width: 100%;">
                <div class="stat-box" style="border-color: var(--accent);">
                    <div class="stat-number" style="color: var(--accent);">${experimentState.questionsAsked.length}</div>
                    <div class="stat-label">Questions</div>
                </div>
                <div class="stat-box" style="border-color: var(--gold);">
                    <div class="stat-number" style="color: var(--gold);">${minutes}:${seconds.toString().padStart(2, '0')}</div>
                    <div class="stat-label">Temps</div>
                </div>
                <div class="stat-box" style="border-color: var(--ruby);">
                    <div class="stat-number" style="color: var(--ruby);">${experimentState.hintsGiven}</div>
                    <div class="stat-label">Indices</div>
                </div>
            </div>

            <div style="background: rgba(0,255,157,0.1); border: 1px solid var(--success); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: left;">
                <h3 style="color: var(--success); margin-bottom: 10px;">
                    <i class="ph-duotone ph-check-square"></i> Résumé de votre démarche
                </h3>
                <div class="small" style="line-height: 1.6;">
                    Vous avez réussi à identifier la pathologie cible en ${experimentState.questionsAsked.length} questions.
                    ${experimentState.hintsGiven > 0 ? `Vous avez bénéficié de ${experimentState.hintsGiven} indice(s).` : 'Aucun indice n\'a été nécessaire ! ✨'}
                    <br><br>
                    <strong>Performance :</strong> 
                    ${experimentState.questionsAsked.length <= 8 ? '🏆 Excellent (≤ 8 questions)' : 
                      experimentState.questionsAsked.length <= 15 ? '✅ Bien (9-15 questions)' : 
                      '⚠️ À améliorer (> 15 questions)'}
                </div>
            </div>

            <button class="btn" onclick="startClassiqueMode()" style="margin-top: 20px;">
                <i class="ph-bold ph-arrow-clockwise"></i> Nouveau cas
            </button>
            <button class="btn-back" onclick="renderModeSelection()">
                <i class="ph-bold ph-arrow-left"></i> Retour sélection mode
            </button>
        </div>
    `;
}

// DANS apptest.js - Remplace la fonction renderFailureScreen

function renderFailureScreen(userGuess) {
    const app = document.getElementById('app');
    const correctAnswer = experimentState.targetPathology.name;

    // 1. LOGIQUE : Récupérer les signes correctement identifiés
    // On filtre l'historique pour ne garder que les réponses "true"
    const foundSignsObjects = experimentState.questionsAsked.filter(q => q.answer === true);
    // On dédoublonne les signes (au cas où on a posé 2 questions sur le même signe)
    const uniqueSigns = [...new Set(foundSignsObjects.map(q => q.sign))];

    // 2. CONSTRUCTION DU HTML POUR LES SIGNES TROUVÉS
    let foundSignsHTML = '';
    if (uniqueSigns.length > 0) {
        foundSignsHTML = `
            <div class="signs-grid">
                ${uniqueSigns.map(sign => `
                    <div class="sign-badge">
                        <i class="ph-bold ph-check-circle"></i>
                        ${formatSymptomName(sign)}
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        foundSignsHTML = `
            <div class="empty-signs">
                <i class="ph-duotone ph-magnifying-glass"></i>
                Aucun symptôme clé identifié lors de l'interrogatoire.
            </div>
        `;
    }

    // 3. RENDU DE L'INTERFACE
    app.innerHTML = `
        <div class="card center" style="max-width: 800px; padding: 0; overflow: hidden;">
            
            <div style="background: linear-gradient(135deg, #ff5f6d 0%, #ffc371 100%); padding: 30px 20px; color: white; position: relative;">
                <div style="font-size: 4em; margin-bottom: 10px; animation: popIn 0.5s ease;">
                    <i class="ph-fill ph-x-circle"></i>
                </div>
                <h2 style="color: white; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">Diagnostic Incorrect</h2>
                <p style="opacity: 0.9; margin-top: 5px;">Il y avait un piège ?</p>
            </div>

            <div style="padding: 30px;">
                
                <div class="comparison-container">
                    <div class="comparison-box user-box">
                        <div class="comp-label">Votre hypothèse</div>
                        <div class="comp-val user-val">${userGuess}</div>
                    </div>
                    <div class="vs-badge">VS</div>
                    <div class="comparison-box real-box">
                        <div class="comp-label">La réalité</div>
                        <div class="comp-val real-val">${correctAnswer}</div>
                    </div>
                </div>

                <div class="investigation-report">
                    <h3 class="report-title">
                        <i class="ph-duotone ph-clipboard-text"></i> Rapport d'enquête
                    </h3>
                    <p class="small" style="margin-bottom: 15px;">Voici les éléments cliniques que vous aviez correctement repérés :</p>
                    ${foundSignsHTML}
                </div>

                <div class="patho-info-card">
                    <div class="info-header">
                        <i class="ph-bold ph-info"></i> À propos de : ${correctAnswer}
                    </div>
                    <div class="info-content">
                        ${experimentState.targetPathology.short}
                    </div>
                </div>

                <div style="display: flex; gap: 15px; margin-top: 30px; flex-wrap: wrap;">
                    <button class="btn" onclick="startClassiqueMode()" style="flex: 1; background: var(--accent);">
                        <i class="ph-bold ph-arrow-clockwise"></i> Nouveau Patient
                    </button>
                    <button class="btn-back" onclick="renderModeSelection()" style="flex: 1;">
                        <i class="ph-bold ph-list"></i> Menu
                    </button>
                </div>

            </div>
        </div>

        <style>
            @keyframes popIn { 0% { transform: scale(0); } 80% { transform: scale(1.1); } 100% { transform: scale(1); } }
            
            .comparison-container {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 30px;
                position: relative;
            }
            .comparison-box {
                flex: 1;
                padding: 15px;
                border-radius: 12px;
                background: var(--glass-bg);
                border: 1px solid var(--glass-border);
                text-align: center;
            }
            .user-box { border-color: var(--error); background: rgba(255, 77, 77, 0.05); }
            .real-box { border-color: var(--success); background: rgba(0, 255, 157, 0.05); }
            
            .comp-label { font-size: 0.8em; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 5px; }
            .comp-val { font-weight: bold; font-size: 1.1em; }
            .user-val { color: var(--error); text-decoration: line-through; }
            .real-val { color: var(--success); }

            .vs-badge {
                background: var(--glass-bg);
                border: 1px solid var(--glass-border);
                width: 30px; height: 30px;
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                font-size: 0.8em; font-weight: bold; color: var(--text-muted);
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            }

            .investigation-report {
                text-align: left;
                background: rgba(255,255,255,0.03);
                border-radius: 12px;
                padding: 20px;
                border: 1px solid var(--glass-border);
                margin-bottom: 25px;
            }
            .report-title { color: var(--text-main); font-size: 1.1em; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
            
            .signs-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            .sign-badge {
                background: rgba(0, 255, 157, 0.1);
                border: 1px solid var(--success);
                color: var(--success);
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 0.9em;
                display: flex; align-items: center; gap: 6px;
            }
            .empty-signs {
                color: var(--text-muted);
                font-style: italic;
                font-size: 0.9em;
                display: flex; align-items: center; gap: 8px;
            }

            .patho-info-card {
                text-align: left;
                border-left: 3px solid var(--accent);
                background: rgba(102, 126, 234, 0.1);
                border-radius: 0 12px 12px 0;
                padding: 15px;
            }
            .info-header { color: var(--accent); font-weight: bold; margin-bottom: 8px; }
            .info-content { color: var(--text-main); font-size: 0.95em; line-height: 1.5; }
        </style>
    `;
}

// ============================================================
// UTILITAIRES
// ============================================================

function formatSymptomName(sign) {
    // SÉCURITÉ : Si le signe est vide (null/undefined), on renvoie un texte par défaut
    if (!sign) return "Motif non spécifié";
    
    return sign.replace(/_/g, ' ')
               .replace(/\b\w/g, c => c.toUpperCase());
}

function updateCounters() {
    const questionsCount = document.getElementById('questionsCount');
    const wrongCount = document.getElementById('wrongCount');
    const hintsCount = document.getElementById('hintsCount');
    
    if (questionsCount) questionsCount.textContent = experimentState.questionsAsked.length;
    if (wrongCount) wrongCount.textContent = experimentState.wrongAnswers;
    if (hintsCount) hintsCount.textContent = experimentState.hintsGiven;
}

function addQuestionToHistory(question, answer) {
    const historyList = document.getElementById('historyList');
    
    // Supprime le message "Aucune question"
    if (experimentState.questionsAsked.length === 1) {
        historyList.innerHTML = '';
    }
    
    const answerIcon = answer 
        ? '<i class="ph-fill ph-check-circle" style="color: var(--success);"></i>' 
        : '<i class="ph-fill ph-x-circle" style="color: var(--error);"></i>';
    
    const answerText = answer ? 'OUI' : 'NON';
    const answerColor = answer ? 'var(--success)' : 'var(--error)';
    
    const questionItem = document.createElement('div');
    questionItem.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 15px;
        background: var(--glass-bg);
        border-bottom: 1px solid var(--glass-border);
        margin-bottom: 8px;
        border-radius: 8px;
        animation: fadeIn 0.3s ease;
    `;
    
    questionItem.innerHTML = `
        <div style="flex: 1; text-align: left; color: var(--text-main);">
            <strong style="color: var(--accent);">Q${experimentState.questionsAsked.length}.</strong> ${question}
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-left: 15px;">
            ${answerIcon}
            <strong style="color: ${answerColor}; font-size: 14px; min-width: 40px;">${answerText}</strong>
        </div>
    `;
    
    historyList.appendChild(questionItem);
    
    // Scroll automatique vers le bas
    historyList.scrollTop = historyList.scrollHeight;
}

// ============================================================
// SAUVEGARDE DES DONNÉES EXPÉRIMENTALES
// ============================================================

async function saveExperimentData(data) {
    try {
        const currentUser = auth.currentUser;
        const experimentData = {
            ...data,
            userId: currentUser ? currentUser.uid : 'anonymous',
            userEmail: currentUser ? currentUser.email : null,
            questionsDetail: experimentState.questionsAsked,
            patientProfile: experimentState.patientProfile,
            chiefComplaint: experimentState.chiefComplaint
        };
        
        await addDoc(collection(db, "experiment_results"), experimentData);
        console.log("✅ Données expérimentales sauvegardées");
    } catch (error) {
        console.error("❌ Erreur sauvegarde données:", error);
    }
}

// ============================================================
// POINT D'ENTRÉE & ROUTAGE
// ============================================================

// ============================================================
// POINT D'ENTRÉE & ROUTAGE (FIN DU FICHIER apptest.js)
// ============================================================

window.renderModeSelection = renderModeSelection;

// 1. Définition des redirections
window.startGeneratifMode = function() {
    // On ajoute le paramètre mode=generatif pour que app.js le détecte
    window.location.href = window.location.pathname + '?mode=generatif';
}

window.startClassiqueMode = function() {
    experimentState.mode = 'classique';
    experimentState.sessionId = Date.now().toString();
    experimentState.startTime = Date.now();
    experimentState.questionsAsked = [];
    experimentState.wrongAnswers = 0;
    experimentState.hintsGiven = 0;
    experimentState.attempts = 0;
    
    // Sélection aléatoire d'une pathologie
    experimentState.targetPathology = PATHOLOGIES[Math.floor(Math.random() * PATHOLOGIES.length)];
    
    // Génération du profil patient
    generatePatientProfile(experimentState.targetPathology);
    
    renderClassiqueInterface();
}

// 2. Logique de démarrage (routage)
const params = new URLSearchParams(window.location.search);
const currentMode = params.get('mode');

console.log("🔍 Routeur APPTEST - Mode détecté :", currentMode);

if (currentMode === 'generatif') {
    // === CORRECTION 210 IQ ===
    // On charge dynamiquement le moteur principal (app.js)
    // Cela débloque le chargement infini
    console.log("✅ Mode Génératif : Chargement dynamique de app.js...");
    import('./app.js')
        .then(() => console.log("🚀 Medicome Engine (app.js) chargé avec succès."))
        .catch(err => console.error("❌ Erreur fatale au chargement de app.js :", err));
} 
else if (currentMode === 'classique') {
    // Mode Classique → Lancement immédiat
    console.log("🕵️ Mode Classique (Lancement immédiat).");
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initExperiment().then(() => {
                window.startClassiqueMode();
            });
        });
    } else {
        initExperiment().then(() => {
            window.startClassiqueMode();
        });
    }
}
else {
    // Aucun mode → Menu de sélection
    console.log("🧪 Menu de sélection.");
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExperiment);
    } else {
        initExperiment();
    }
}
