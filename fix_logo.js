import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

// Lee la config
const configContent = fs.readFileSync('./src/firebase/config.js', 'utf-8');
const match = configContent.match(/const firebaseConfig = ({[\s\S]*?});/);
if (match) {
  const firebaseConfig = eval('(' + match[1] + ')');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  await setDoc(doc(db, 'settings', 'general'), { logoUrl: '/logo.jpg' }, { merge: true });
  console.log('Firebase updated successfully');
}
