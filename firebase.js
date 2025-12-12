// Importa SDK modular do Firebase v9+
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore }    from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage }      from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCZ3athAEEy2-ABr_6Vyo3VZ0kj-8IrwLE",
  authDomain: "ficha-aa5b7.firebaseapp.com",
  projectId: "ficha-aa5b7",
  storageBucket: "ficha-aa5b7.appspot.com",
  messagingSenderId: "658310849346",
  appId: "1:658310849346:web:52441352cb56531d7bdedb"
};

const app = initializeApp(firebaseConfig);
export const db      = getFirestore(app);
export const storage = getStorage(app);