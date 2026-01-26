// ============================================================
// APPTEST.JS - MODE EXPÉRIMENTAL POUR ÉTUDE SCIENTIFIQUE
// Comparaison : Raisonnement Génératif Inversé vs Classique
// ============================================================

import { getFirestore, doc, getDoc, setDoc, addDoc, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Configuration Firebase (même que app.js)
const firebaseConfig = {
    apiKey: "AIzaSyCig9G4gYHU5h642YV1IZxthYm_IXp6vZU",
    authDomain: "medicome-paco.firebaseapp.com",
    projectId: "medicome-paco",
    storageBucket: "medicome-paco.firebasestorage.app",
    messagingSenderId: "332171806096",
    appId: "1:332171806096:web:36889325196a7a718b5f15"
};

const app = initializeApp(firebaseConfig);
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
        <div class="card center" style="max-width: 700px;">
            <h2><i class="ph-duotone ph-flask"></i> Étude Scientifique</h2>
            <p class="small" style="margin-bottom: 30px; line-height: 1.6;">
                Comparaison de deux paradigmes d'apprentissage médical :<br>
                <strong>Raisonnement Génératif Inversé</strong> vs <strong>Démarche Classique</strong>
            </p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%; margin-bottom: 20px;">
                <!-- MODE GÉNÉRATIF INVERSÉ (MODE ACTUEL) -->
                <div class="mode-card" id="modeGeneratif">
                    <div class="mode-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <i class="ph-duotone ph-brain" style="font-size: 3em; color: white;"></i>
                    </div>
                    <h3 style="margin: 15px 0 10px; color: var(--text-main);">Mode Génératif Inversé</h3>
                    <p class="small" style="line-height: 1.5; margin-bottom: 15px;">
                        Vous pensez à une pathologie, l'IA pose des questions pour la deviner.
                        <br><strong>(Mode actuel de Medicome)</strong>
                    </p>
                    <button class="btn" style="width: 100%; font-size: 13px;" onclick="startGeneratifMode()">
                        <i class="ph-bold ph-play"></i> Démarrer
                    </button>
                </div>

                <!-- MODE CLASSIQUE (NOUVEAU) -->
                <div class="mode-card" id="modeClassique">
                    <div class="mode-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                        <i class="ph-duotone ph-detective" style="font-size: 3em; color: white;"></i>
                    </div>
                    <h3 style="margin: 15px 0 10px; color: var(--text-main);">Mode Classique</h3>
                    <p class="small" style="line-height: 1.5; margin-bottom: 15px;">
                        L'IA a une pathologie en tête, vous posez des questions pour la découvrir.
                        <br><strong>(Démarche diagnostique traditionnelle)</strong>
                    </p>
                    <button class="btn" style="width: 100%; font-size: 13px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);" onclick="startClassiqueMode()">
                        <i class="ph-bold ph-play"></i> Démarrer
                    </button>
                </div>
            </div>

            <div style="background: rgba(255,159,67,0.1); padding: 15px; border-radius: 12px; border-left: 3px solid var(--gold); margin-top: 20px;">
                <div style="font-weight: bold; color: var(--gold); margin-bottom: 8px;">
                    <i class="ph-duotone ph-info"></i> À propos de cette étude
                </div>
                <div class="small" style="text-align: left; line-height: 1.5;">
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
                padding: 25px;
                transition: all 0.3s;
                cursor: pointer;
                text-align: center;
            }
            .mode-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                border-color: var(--accent);
            }
            .mode-icon {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto;
                box-shadow: 0 8px 20px rgba(0,0,0,0.3);
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
    
    alert("Mode Génératif Inversé sélectionné.\n\nVous allez maintenant être redirigé vers l'interface classique de Medicome.\n\nPensez à une pathologie et laissez l'IA la deviner !");
    
    // Redirection vers le mode normal (app.js)
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
        age: null,
        gender: null,
        terrain: []
    };
    
    // Détermination de l'âge en fonction des facteurs
    const facteurs = pathology.facteurs || {};
    if (facteurs['nourrisson_moins_2ans'] || facteurs['nourrisson']) {
        profile.age = "Nourrisson (< 2 ans)";
    } else if (facteurs['enfant'] || facteurs['enfant_3_15ans']) {
        profile.age = "Enfant (8 ans)";
    } else if (facteurs['adolescent'] || facteurs['sujet_jeune']) {
        profile.age = "Adolescent (16 ans)";
    } else if (facteurs['adulte_jeune'] || facteurs['jeune']) {
        profile.age = "Jeune adulte (28 ans)";
    } else if (facteurs['age_>50ans'] || facteurs['adulte']) {
        profile.age = "Adulte (55 ans)";
    } else if (facteurs['sujet_age'] || facteurs['age_>65ans']) {
        profile.age = "Senior (72 ans)";
    } else {
        profile.age = "Adulte (45 ans)";
    }
    
    // Détermination du genre
    if (facteurs['homme'] || facteurs['homme_age'] || facteurs['homme_jeune']) {
        profile.gender = "Homme";
    } else if (facteurs['femme'] || facteurs['femme_jeune'] || facteurs['femme_age_procreer']) {
        profile.gender = "Femme";
    } else {
        profile.gender = Math.random() > 0.5 ? "Homme" : "Femme";
    }
    
    // Terrain médical
    if (facteurs['tabac'] || facteurs['tabagisme']) profile.terrain.push("Tabagisme actif");
    if (facteurs['diabete']) profile.terrain.push("Diabète de type 2");
    if (facteurs['hta']) profile.terrain.push("HTA");
    if (facteurs['alcoolisme_chronique'] || facteurs['alcool']) profile.terrain.push("Éthylisme chronique");
    if (facteurs['surpoids'] || facteurs['obesite']) profile.terrain.push("Obésité (IMC 32)");
    if (facteurs['immunodepression']) profile.terrain.push("Immunodépression");
    if (facteurs['grossesse_>20SA']) profile.terrain.push("Grossesse (28 SA)");
    
    experimentState.patientProfile = profile;
    
    // Identification du chef de file
    const signes = pathology.signes;
    const generalSymptoms = [
        'douleur_thoracique', 'douleur_abdominale', 'fievre', 'dyspnee', 
        'cephalees', 'troubles_neuro', 'anomalie_peau', 'genes_urinaires',
        'douleur_membre_traumatisme', 'douleur_dos', 'trouble_psy', 'toux'
    ];
    
    // Trouver le symptôme général le plus pondéré
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
    
    const terrainText = profile.terrain.length > 0 
        ? profile.terrain.join(', ') 
        : "Aucun antécédent notable";
    
    app.innerHTML = `
        <div class="card center" style="max-width: 800px;">
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                <h2 style="color: white; margin: 0;">
                    <i class="ph-duotone ph-detective"></i> Mode Classique - Enquête Diagnostique
                </h2>
            </div>

            <!-- PROFIL PATIENT -->
            <div style="background: rgba(0,210,255,0.1); border: 1px solid var(--accent); border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: left;">
                <h3 style="color: var(--accent); margin-bottom: 15px;">
                    <i class="ph-duotone ph-user-circle"></i> Profil du Patient
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                    <div><strong>Âge :</strong> ${profile.age}</div>
                    <div><strong>Sexe :</strong> ${profile.gender}</div>
                </div>
                <div style="margin-top: 10px;">
                    <strong>Terrain :</strong> ${terrainText}
                </div>
                <div style="margin-top: 15px; padding: 12px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                    <strong style="color: var(--gold);">
                        <i class="ph-duotone ph-warning-circle"></i> Motif de consultation :
                    </strong>
                    <div style="font-size: 1.2em; margin-top: 5px;">${chiefComplaint}</div>
                </div>
            </div>

            <!-- COMPTEURS -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <div class="stat-box">
                    <div class="stat-number" id="questionsCount">0</div>
                    <div class="stat-label">Questions posées</div>
                </div>
                <div class="stat-box" style="border-color: var(--error);">
                    <div class="stat-number" style="color: var(--error);" id="wrongCount">0</div>
                    <div class="stat-label">Impasses</div>
                </div>
                <div class="stat-box" style="border-color: var(--gold);">
                    <div class="stat-number" style="color: var(--gold);" id="hintsCount">0</div>
                    <div class="stat-label">Indices</div>
                </div>
            </div>

            <!-- ZONE DE QUESTION -->
            <div style="background: var(--glass-bg); border: 2px solid var(--glass-border); border-radius: 16px; padding: 25px; margin-bottom: 20px;">
                <h3 style="color: var(--text-main); margin-bottom: 15px;">
                    <i class="ph-duotone ph-chat-centered-text"></i> Posez votre question
                </h3>
                <textarea 
                    id="questionInput" 
                    class="input" 
                    placeholder="Ex: Le patient présente-t-il une douleur thoracique constrictive ?"
                    style="min-height: 80px; font-size: 15px;"
                ></textarea>
                <button id="askBtn" class="btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin-top: 10px;">
                    <i class="ph-bold ph-paper-plane-right"></i> Envoyer la question
                </button>
            </div>

            <!-- HISTORIQUE DES QUESTIONS -->
            <div id="questionsHistory" style="margin-bottom: 20px;">
                <h3 style="color: var(--text-muted); margin-bottom: 10px;">
                    <i class="ph-duotone ph-list-bullets"></i> Historique de l'interrogatoire
                </h3>
                <div id="historyList" style="background: rgba(0,0,0,0.2); border-radius: 12px; padding: 15px; min-height: 100px;">
                    <div class="small" style="text-align: center; color: var(--text-muted);">
                        Aucune question posée pour le moment
                    </div>
                </div>
            </div>

            <!-- ZONE DE DIAGNOSTIC -->
            <div style="background: rgba(255,215,0,0.1); border: 2px solid var(--gold); border-radius: 16px; padding: 25px;">
                <h3 style="color: var(--gold); margin-bottom: 15px;">
                    <i class="ph-duotone ph-lightbulb"></i> Votre Diagnostic
                </h3>
                <input 
                    id="diagnosisInput" 
                    class="input" 
                    placeholder="Entrez le nom de la pathologie..."
                    style="font-size: 16px;"
                />
                <button id="submitDiagnosisBtn" class="btn" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); margin-top: 10px;">
                    <i class="ph-bold ph-check-circle"></i> Valider le diagnostic
                </button>
            </div>

            <button class="btn-back" style="margin-top: 20px;" onclick="renderModeSelection()">
                <i class="ph-bold ph-arrow-left"></i> Retour sélection mode
            </button>
        </div>
    `;
    
    // Event listeners
    document.getElementById('askBtn').onclick = handleQuestion;
    document.getElementById('submitDiagnosisBtn').onclick = validateDiagnosis;
    
    // Entrée au clavier
    document.getElementById('questionInput').onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleQuestion();
        }
    };
    
    document.getElementById('diagnosisInput').onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            validateDiagnosis();
        }
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
// ANALYSE DE LA QUESTION PAR LLM
// ============================================================

async function analyzeQuestion(questionText) {
    if (!cachedOpenAIKey) {
        cachedOpenAIKey = prompt("🔐 Clé OpenAI requise pour le mode expérimental :");
        if (!cachedOpenAIKey) return null;
    }
    
    const targetPathology = experimentState.targetPathology;
    const allSigns = Object.keys(targetPathology.signes);
    const signsListText = allSigns.join(", ");
    
    const systemPrompt = `Tu es un assistant médical expert. Une pathologie est en jeu : "${targetPathology.name}".

Voici TOUS les signes possibles pour cette pathologie :
[${signsListText}]

L'étudiant pose cette question : "${questionText}"

Ta mission :
1. Identifie le signe clinique auquel cette question fait référence (utilise UNIQUEMENT un code de la liste ci-dessus)
2. Détermine si ce signe est présent (OUI) ou absent (NON) pour cette pathologie
3. Réponds UNIQUEMENT au format JSON : {"sign": "code_du_signe", "answer": true/false}

Si la question est trop vague ou ne correspond à aucun signe, réponds : {"sign": null, "answer": null}`;

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
            if (response.status === 401) alert("❌ Clé API invalide");
            throw new Error("Erreur API");
        }
        
        const data = await response.json();
        let cleanContent = data.choices[0].message.content
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
        
        const result = JSON.parse(cleanContent);
        
        if (!result.sign || result.answer === null) return null;
        
        // Vérification de la validité du signe
        const isSignValid = targetPathology.signes.hasOwnProperty(result.sign);
        if (!isSignValid) return null;
        
        // La réponse est OUI si le signe existe dans la pathologie
        const correctAnswer = targetPathology.signes[result.sign] ? true : false;
        
        return {
            sign: result.sign,
            answer: correctAnswer
        };
        
    } catch (error) {
        console.error("Erreur LLM:", error);
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
                    ${experimentState.questionsAsked.length <= 8
