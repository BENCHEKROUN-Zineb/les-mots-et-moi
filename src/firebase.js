import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDnq_S7Gp8MS2mPeWq2TO11KQ_rsDrGr6O",
  authDomain: "les-mots-et-moi.firebaseapp.com",
  projectId: "les-mots-et-moi",
  storageBucket: "les-mots-et-moi.firebasestorage.app",
  messagingSenderId: "516956660247",
  appId: "1:516956660247:web:5bf9141c8f4b648c217252"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);