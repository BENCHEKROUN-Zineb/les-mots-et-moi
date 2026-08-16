import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Remplace avec tes vraies clés Firebase :
const firebaseConfig = {
  apiKey: "AIzaSyDnq_S7Gp8MS2mPeWq2TO11KQ_rsDrGr60",
  authDomain: "les-mots-et-moi.firebaseapp.com",
  projectId: "les-mots-et-moi",
  storageBucket: "les-mots-et-moi.firebasestorage.app",
  messagingSenderId: "516956660247",
  appId: "1:516956660247:web:5bf9141c8f4b648c217252"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();