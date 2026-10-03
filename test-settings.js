import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

// Lee el archivo de config para obtener la configuración de firebase
const configContent = fs.readFileSync('/home/albmarrib/Aplicaciones Antigravity/app-pizzeria/src/firebase/config.js', 'utf-8');
const match = configContent.match(/const firebaseConfig = ({[\s\S]*?});/);
if (match) {
  // Convertimos el string a un objeto JSON (esto es algo arriesgado con eval pero es para un script rápido)
  const configObjString = match[1].replace(/import\.meta\.env\.VITE_.*?/g, '""');
  // En este punto es más fácil extraer las variables de entorno de .env
}
