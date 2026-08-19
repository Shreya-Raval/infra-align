"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

export default function Home() {
  const [text, setText] = useState("");
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComplaints(data);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    await addDoc(collection(db, "complaints"), {
      text: text,
      createdAt: serverTimestamp(),
    });

    setText("");
  };

  return (
    <main style={{ maxWidth: 600, margin: "40px auto", padding: 20 }}>
      <h1>Civic Complaint Portal</h1>

      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe your complaint..."
          rows={4}
          style={{ width: "100%", padding: 8 }}
        />
        <button type="submit" style={{ marginTop: 8 }}>
          Submit Complaint
        </button>
      </form>

      <h2 style={{ marginTop: 32 }}>Submitted Complaints</h2>
      <ul>
        {complaints.map((c) => (
          <li key={c.id}>{c.text}</li>
        ))}
      </ul>
    </main>
  );
}