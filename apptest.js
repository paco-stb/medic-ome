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
        <div class="card center" style="max-width: 900px;">
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
                padding: 30px;
                transition: all 0.3s;
                text-align: center;
            }
            .mode-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                border-color: var(--accent);
            }
            .mode-icon {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 15px;
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
        <div class="card center" style="max-width: 900px;">
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
                <h2 style="color: white; margin: 0; font-size: 1.5rem;">
                    <i class="ph-duotone ph-detective"></i> Mode Classique - Enquête Diagnostique
                </h2>
            </div>

            <!-- PROFIL PATIENT -->
            <div style="background: rgba(0,210,255,0.1); border: 2px solid var(--accent); border-radius: 12px; padding: 25px; margin-bottom: 25px; text-align: left;">
                <h3 style="color: var(--accent); margin-bottom: 15px; font-size: 1.2rem;">
                    <i class="ph-duotone ph-user-circle"></i> Profil du Patient
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                        <strong>Âge :</strong> ${profile.age}
                    </div>
                    <div style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                        <strong>Sexe :</strong> ${profile.gender}
                    </div>
                </div>
                <div style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                    <strong>Terrain :</strong> ${terrainText}
                </div>
                <div style="margin-top: 15px; padding: 15px; background: rgba(255,215,0,0.15); border-radius: 8px; border-left: 3px solid var(--gold);">
                    <strong style="color: var(--gold);">
                        <i class="ph-duotone ph-warning-circle"></i> Motif de consultation :
                    </strong>
                    <div style="font-size: 1.3em; margin-top: 8px; color: var(--text-main);">${chiefComplaint}</div>
                </div>
            </div>

            <!-- COMPTEURS -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                <div class="stat-box" style="border-color: var(--accent);">
                    <div class="stat-number" style="color: var(--accent);" id="questionsCount">0</div>
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
            <div style="background: var(--glass-bg); border: 2px solid var(--glass-border); border-radius: 16px; padding: 25px; margin-bottom: 25px;">
                <h3 style="color: var(--text-main); margin-bottom: 15px; font-size: 1.1rem;">
                    <i class="ph-duotone ph-chat-centered-text"></i> Posez votre question
                </h3>
                <textarea 
                    id="questionInput" 
                    class="input" 
                    placeholder="Ex: Le patient présente-t-il une douleur thoracique constrictive ?"
                    style="min-height: 100px; font-size: 15px; margin-bottom: 15px;"
                ></textarea>
                <button id="askBtn" class="btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 100%;">
                    <i class="ph-bold ph-paper-plane-right"></i> Envoyer la question
                </button>
            </div>

            <!-- HISTORIQUE -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: var(--text-muted); margin-bottom: 15px; font-size: 1.1rem;">
                    <i class="ph-duotone ph-list-bullets"></i> Historique de l'interrogatoire
                </h3>
                <div id="historyList" style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px; min-height: 120px; max-height: 400px; overflow-y: auto;">
                    <div class="small" style="text-align: center; color: var(--text-muted); opacity: 0.7;">
                        Aucune question posée pour le moment
                    </div>
                </div>
            </div>

            <!-- ZONE DE DIAGNOSTIC -->
            <div style="background: rgba(255,215,0,0.1); border: 2px solid var(--gold); border-radius: 16px; padding: 25px; margin-bottom: 20px;">
                <h3 style="color: var(--gold); margin-bottom: 15px; font-size: 1.1rem;">
                    <i class="ph-duotone ph-lightbulb"></i> Votre Diagnostic Final
                </h3>
                <input 
                    id="diagnosisInput" 
                    class="input" 
                    placeholder="Entrez le nom de la pathologie..."
                    style="font-size: 16px; margin-bottom: 15px;"
                />
                <button id="submitDiagnosisBtn" class="btn" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); width: 100%;">
                    <i class="ph-bold ph-check-circle"></i> Valider le diagnostic
                </button>
            </div>

            <button class="btn-back" onclick="renderModeSelection()">
                <i class="ph-bold ph-arrow-left"></i> Retour sélection mode
            </button>
        </div>
    `;
    
    document.getElementById('askBtn').onclick = handleQuestion;
    document.getElementById('submitDiagnosisBtn').onclick = validateDiagnosis;
    
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
// ANALYSE DE LA QUESTION PAR LLM (CORRIGÉE & OPTIMISÉE)
// ============================================================

async function analyzeQuestion(questionText) {
    // 1. Vérification de la clé API
    if (!cachedOpenAIKey) {
        // Idéalement, codez votre clé en dur ici pour l'étude si c'est sur une tablette contrôlée
        // ou utilisez une variable d'environnement. Pour l'instant, on garde le prompt.
        cachedOpenAIKey = prompt("🔐 Clé OpenAI requise pour le mode expérimental (sk-...) :");
        if (!cachedOpenAIKey) return null;
    }

    const targetPathology = experimentState.targetPathology;
    
    // On donne à l'IA la liste des signes PRÉSENTS pour qu'elle privilégie ces clés
    const presentSignsKeys = Object.keys(targetPathology.signes).join(", ");

    // 2. Construction du Prompt "Intelligent"
    // On demande à l'IA de normaliser la question, qu'elle soit dans la liste ou non.
    const systemPrompt = `Tu es un moteur sémantique pour une simulation médicale.
Le patient souffre de : "${targetPathology.name}".
Voici les signes CLINIQUES PRÉSENTS (code_interne) chez ce patient : [${presentSignsKeys}].

L'étudiant docteur pose la question : "${questionText}"

Ta mission :
1. Identifie le symptôme ou le signe médical visé par la question.
2. Si ce signe correspond à l'un des "codes internes" de la liste ci-dessus (même approximativement, ex: "mal au bide" -> "douleur_abdominale"), utilise ce code EXACT.
3. Si le signe N'EST PAS dans la liste (l'étudiant cherche un signe absent), génère un code standard snake_case (ex: "toux", "fievre", "ictere").
4. Si la question est hors-sujet ou incompréhensible, renvoie null.

Réponds UNIQUEMENT au format JSON strict :
{"detected_sign": "code_du_signe_ou_null"}`;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${cachedOpenAIKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini", // Modèle rapide et économique, suffisant pour ça
                messages: [{ role: "system", content: systemPrompt }],
                temperature: 0 // Zéro créativité, on veut de la précision logique
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert("❌ Clé API invalide. Veuillez recharger la page.");
                cachedOpenAIKey = null;
            }
            throw new Error(`Erreur API: ${response.status}`);
        }

        const data = await response.json();
        
        // 3. Nettoyage robuste du JSON (au cas où l'IA ajoute des ```json ... ```)
        let cleanContent = data.choices[0].message.content
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        const result = JSON.parse(cleanContent);

        // Si l'IA n'a rien compris
        if (!result.detected_sign) return null;

        // 4. Logique de Vérité (Le Miroir)
        // On vérifie si le signe détecté existe dans notre JSON de pathologie
        
        const signDataInJson = targetPathology.signes[result.detected_sign];
        
        // Si signDataInJson existe (il a un poids), alors le signe est PRÉSENT (TRUE)
        // Si undefined, alors le signe est ABSENT (FALSE), mais la question est valide !
        
        const isPresent = signDataInJson !== undefined;

        // (Optionnel) On peut récupérer le poids pour le scoring futur
        const weight = isPresent ? signDataInJson : 0;

        return {
            sign: result.detected_sign, // Le code (ex: "douleur_thoracique" ou "toux")
            answer: isPresent,          // true (Oui) ou false (Non)
            weight: weight              // Points potentiels
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

function renderFailureScreen(userGuess) {
    const app = document.getElementById('app');
    const correctAnswer = experimentState.targetPathology.name;
    
    app.innerHTML = `
        <div class="card center" style="max-width: 700px;">
            <div style="font-size: 5em; color: var(--error); margin-bottom: 20px;">
                <i class="ph-fill ph-x-circle"></i>
            </div>
            <h2 style="color: var(--error); margin-bottom: 15px;">
                ❌ Diagnostic Incorrect
            </h2>
            
            <div style="background: rgba(255,77,77,0.1); border: 1px solid var(--error); border-radius: 12px; padding: 20px; margin: 20px 0;">
                <div style="margin-bottom: 15px;">
                    <strong>Votre réponse :</strong>
                    <div style="font-size: 1.2em; color: var(--error); margin-top: 5px;">${userGuess}</div>
                </div>
                <div>
                    <strong>Réponse attendue :</strong>
                    <div style="font-size: 1.5em; color: var(--success); margin-top: 5px;">${correctAnswer}</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 30px 0; width: 100%;">
                <div class="stat-box">
                    <div class="stat-number">${experimentState.questionsAsked.length}</div>
                    <div class="stat-label">Questions posées</div>
                </div>
                <div class="stat-box" style="border-color: var(--gold);">
                    <div class="stat-number" style="color: var(--gold);">${experimentState.attempts}</div>
                    <div class="stat-label">Tentatives</div>
                </div>
            </div>

            <div style="background: rgba(0,210,255,0.1); border: 1px solid var(--accent); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: left;">
                <h3 style="color: var(--accent); margin-bottom: 10px;">
                    <i class="ph-duotone ph-info"></i> À propos de cette pathologie
                </h3>
                <div class="small" style="line-height: 1.6;">
                    <strong>${correctAnswer}</strong><br>
                    ${experimentState.targetPathology.short}
                </div>
            </div>

            <button class="btn" onclick="startClassiqueMode()" style="margin-top: 20px;">
                <i class="ph-bold ph-arrow-clockwise"></i> Réessayer avec un nouveau cas
            </button>
            <button class="btn-back" onclick="renderModeSelection()">
                <i class="ph-bold ph-arrow-left"></i> Retour sélection mode
            </button>
        </div>
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

window.renderModeSelection = renderModeSelection;

// 1. Définition des redirections
window.startGeneratifMode = function() {
    window.location.href = window.location.pathname + '?mode=generatif&direct=ia';
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
    // Mode Génératif → app.js prend le relais
    console.log("✅ Mode Génératif (app.js prend le relais).");
} 
else if (currentMode === 'classique') {
    // Mode Classique → Lancement immédiat
    console.log("🕵️ Mode Classique (Lancement immédiat).");
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initExperiment().then(() => {
                // ✅ Attendre que PATHOLOGIES soit chargé AVANT de lancer
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
