// ============================================================
// 🧪 STUDY-AUTH.JS
// Instance Firebase Auth SECONDAIRE, dédiée uniquement à l'étude IMPACT-R2C.
// Objectif : produire un UID anonyme pour experiment_results, sans jamais
// lire ni modifier la session de connexion principale de l'étudiant
// (son compte perso Medicome reste inchangé, connecté ou non).
// ============================================================

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

// Même config que app.js / apptest.js (clé publique, normal pour une web app Firebase)
const firebaseConfig = {
    apiKey: "AIzaSyCig9G4gYHU5h642YV1IZxthYm_IXp6vZU",
    authDomain: "medicome-paco.firebaseapp.com",
    projectId: "medicome-paco",
    storageBucket: "medicome-paco.firebasestorage.app",
    messagingSenderId: "332171806096",
    appId: "1:332171806096:web:36889325196a7a718b5f15"
};

const STUDY_APP_NAME = "study"; // nom unique pour ne jamais entrer en conflit avec l'app principale

// On récupère l'app "study" si elle existe déjà (rechargement de page dans le même module),
// sinon on l'initialise. C'est une app Firebase à part entière, avec sa PROPRE instance Auth :
// initialiser une session ici NE TOUCHE PAS à auth.currentUser de l'app principale.
export const studyApp = getApps().find(a => a.name === STUDY_APP_NAME)
    || initializeApp(firebaseConfig, STUDY_APP_NAME);

export const studyAuth = getAuth(studyApp);

/**
 * Garantit une session anonyme active sur l'instance Auth dédiée à l'étude.
 * Renvoie l'UID anonyme à stocker dans experiment_results (jamais l'UID/email du vrai compte).
 */
export async function ensureStudyAuth() {
    if (!studyAuth.currentUser) {
        await signInAnonymously(studyAuth);
    }
    return studyAuth.currentUser.uid;
}

// Cloud Function "analyzeSymptom", appelée via l'app d'étude uniquement.
// Ainsi le token envoyé au serveur est TOUJOURS celui de l'identité anonyme d'étude,
// jamais celui du compte personnel de l'étudiant (même s'il est connecté par ailleurs).
const studyFunctions = getFunctions(studyApp, "europe-west1"); // doit correspondre à la région déployée
const _studyAnalyzeSymptom = httpsCallable(studyFunctions, "analyzeSymptom");

export async function callStudyAnalyzeSymptom(payload) {
    await ensureStudyAuth();
    return _studyAnalyzeSymptom(payload);
}

