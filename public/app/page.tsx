"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  getDocs, 
  setDoc, 
  doc 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Feather, ArrowRight, LogOut, Copy, Check, Plus, KeyRound } from "lucide-react";

export default function StartPage() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const router = useRouter();

  const [circles, setCircles] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form states
  const [newCircleName, setNewCircleName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  // Load circles
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "circles"), where("members", "array-contains", user.uid));
    return onSnapshot(q, (snap) => {
      setCircles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCircleName.trim() || !user) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const docRef = await addDoc(collection(db, "circles"), {
      name: newCircleName.trim(),
      inviteCode: code,
      createdBy: user.uid,
      members: [user.uid],
      createdAt: new Date(),
    });
    setNewCircleName("");
    setShowCreate(false);
    router.push(`/circle/${docRef.id}`);
  };

  const handleJoinCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !user) return;
    const q = query(collection(db, "circles"), where("inviteCode", "==", joinCode.trim().toUpperCase()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const circleDoc = snap.docs[0];
      const members = circleDoc.data().members || [];
      if (!members.includes(user.uid)) {
        await setDoc(doc(db, "circles", circleDoc.id), { members: [...members, user.uid] }, { merge: true });
      }
      setJoinCode("");
      setShowJoin(false);
      router.push(`/circle/${circleDoc.id}`);
    } else {
      alert("Invalid invite code");
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-stone-500 font-serif">Opening notebook...</div>;
  }

  // 1. PUBLIC START / LANDING PAGE
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center text-center pt-20 space-y-8">
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-[#C25E3E] mb-2">
            <Feather size={26} />
            <span className="font-serif text-2xl font-semibold">rpsyche</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-[#1C1917]">
            A quiet space for genuine thoughts.
          </h1>
          <p className="text-stone-500 text-base max-w-sm mx-auto leading-relaxed pt-2">
            One shared prompt. Blind responses. Everything revealed together.
          </p>
        </div>

        <button
          onClick={signInWithGoogle}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-[#1C1917] text-[#FBF9F5] py-3.5 px-6 rounded-xl hover:opacity-90 transition active:scale-[0.99] font-medium text-sm shadow-md"
        >
          Get Started with Google
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  // 2. AUTHENTICATED DASHBOARD
  return (
    <div className="space-y-8 pb-16">
      <header className="flex justify-between items-baseline border-b border-stone-200 pb-4">
        <div>
          <span className="text-[#C25E3E] text-xs font-semibold tracking-wider uppercase block">rpsyche</span>
          <h2 className="text-2xl font-serif text-[#1C1917]">
            Welcome, {user.displayName?.split(" ")[0]}
          </h2>
        </div>
        <button
          onClick={signOut}
          className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1.5 transition"
        >
          <LogOut size={14} /> Sign out
        </button>
      </header>

      {/* Circle Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-xs uppercase tracking-widest text-stone-400 font-semibold">
          Your Circles ({circles.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowCreate(!showCreate); setShowJoin(false); }}
            className="text-xs flex items-center gap-1 bg-[#1C1917] text-white px-3 py-1.5 rounded-lg"
          >
            <Plus size={13} /> Create
          </button>
          <button
            onClick={() => { setShowJoin(!showJoin); setShowCreate(false); }}
            className="text-xs flex items-center gap-1 bg-stone-200 text-stone-800 px-3 py-1.5 rounded-lg"
          >
            <KeyRound size={13} /> Join
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreateCircle} className="bg-white border p-4 rounded-xl space-y-2">
          <input
            type="text"
            placeholder="Circle Name (e.g. Sunday Reflections)"
            value={newCircleName}
            onChange={(e) => setNewCircleName(e.target.value)}
            className="w-full text-xs p-2.5 border rounded-lg focus:outline-none"
            required
            autoFocus
          />
          <button type="submit" className="text-xs bg-[#C25E3E] text-white px-4 py-2 rounded-lg font-medium">
            Create & Enter
          </button>
        </form>
      )}

      {/* Join Form */}
      {showJoin && (
        <form onSubmit={handleJoinCircle} className="bg-white border p-4 rounded-xl space-y-2">
          <input
            type="text"
            placeholder="6-Character Code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="w-full text-xs p-2.5 border rounded-lg font-mono uppercase focus:outline-none"
            required
            autoFocus
          />
          <button type="submit" className="text-xs bg-stone-800 text-white px-4 py-2 rounded-lg font-medium">
            Join & Enter
          </button>
        </form>
      )}

      {/* Circle Cards */}
      {circles.length === 0 ? (
        <div className="border border-dashed p-10 rounded-2xl text-center text-stone-500 font-serif text-sm">
          You are not in any circles yet. Create or join one above!
        </div>
      ) : (
        <div className="grid gap-3">
          {circles.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm flex justify-between items-center"
            >
              <div className="space-y-1">
                <h4 className="font-serif text-lg text-stone-900 font-medium">{c.name}</h4>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(c.inviteCode);
                    setCopiedCode(c.inviteCode);
                    setTimeout(() => setCopiedCode(null), 2000);
                  }}
                  className="text-xs text-stone-500 flex items-center gap-1 font-mono hover:text-stone-800"
                >
                  {copiedCode === c.inviteCode ? (
                    <><Check size={12} className="text-green-600" /> Copied</>
                  ) : (
                    <><Copy size={12} /> Code: {c.inviteCode}</>
                  )}
                </button>
              </div>

              <button
                onClick={() => router.push(`/circle/${c.id}`)}
                className="bg-[#1C1917] text-white text-xs px-4 py-2 rounded-xl hover:opacity-90 font-medium"
              >
                Open Circle →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}