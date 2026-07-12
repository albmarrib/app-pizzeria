import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAdCUDT5VjJ-iJbZ0_3w5QDf3rg7lfA2jA",
  authDomain: "pizzeria-saas-8bef4.firebaseapp.com",
  projectId: "pizzeria-saas-8bef4",
  storageBucket: "pizzeria-saas-8bef4.firebasestorage.app",
  messagingSenderId: "628102528193",
  appId: "1:628102528193:web:f247fb20daf18ff2bce840"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
