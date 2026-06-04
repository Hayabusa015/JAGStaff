import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc, addDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, writeBatch
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

export const FIREBASE_READY =
  firebaseConfig.apiKey !== "YOUR_API_KEY" && !!firebaseConfig.projectId;

let _db;
if (FIREBASE_READY) {
  try {
    const app = initializeApp(firebaseConfig);
    _db = getFirestore(app);
  } catch (e) {
    console.warn("Firebase init failed:", e);
  }
}
export const db = _db;

export function useSharedHallPasses() {
  const [passes, setPasses] = useState([]);
  const [log, setLog] = useState([]);
  const [ready, setReady] = useState(!FIREBASE_READY);

  useEffect(() => {
    if (!FIREBASE_READY || !db) return;
    const unsubPasses = onSnapshot(
      query(collection(db, "hallPasses"), orderBy("outTime", "asc")),
      snap => {
        setPasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setReady(true);
      },
      err => console.warn("hallPasses listener:", err)
    );
    const unsubLog = onSnapshot(
      query(collection(db, "hallPassLog"), orderBy("createdAt", "desc")),
      snap => setLog(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { unsubPasses(); unsubLog(); };
  }, []);

  async function addPass(passData) {
    if (!FIREBASE_READY || !db) {
      const id = Date.now().toString();
      setPasses(p => [...p, { id, ...passData, outTime: new Date() }]);
      return id;
    }
    const ref = await addDoc(collection(db, "hallPasses"), {
      ...passData,
      outTime: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }

  async function returnPass(passId, passData) {
    if (!FIREBASE_READY || !db) {
      setPasses(p => p.filter(x => x.id !== passId));
      const returnTime = new Date();
      const outTime = passData.outTime instanceof Date ? passData.outTime : new Date(passData.outTime);
      const duration = Math.round((returnTime - outTime) / 60000);
      setLog(l => [{ id: Date.now().toString(), ...passData, returnTime, duration }, ...l]);
      return;
    }
    const batch = writeBatch(db);
    const outTime = passData.outTime?.toDate?.() || new Date();
    const duration = Math.round((Date.now() - outTime.getTime()) / 60000);
    batch.delete(doc(db, "hallPasses", passId));
    const logRef = doc(collection(db, "hallPassLog"));
    batch.set(logRef, { ...passData, returnTime: serverTimestamp(), duration, createdAt: serverTimestamp() });
    await batch.commit();
  }

  return { passes, log, ready, addPass, returnPass };
}
