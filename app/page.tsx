"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  getDocs, 
  updateDoc, 
  arrayUnion 
} from "firebase/firestore";
import Link from "next/link";
import { Feather, Plus, Users, ArrowRight, LogIn, LogOut } from "lucide-react";

const ADMIN_EMAIL = "raginirajpoot13@gmail.com";

interface Circle {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  members: string[];
}

export default function Home() {
  const { user, login, logout } = useAuth();

  const currentEmail = (user?.email || "").toLowerCase().trim();
  const isAdmin = currentEmail !== "" && currentEmail === ADMIN_EMAIL.toLowerCase().trim();

  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [circleName, setCircleName] = useState("");
  const [circleDesc, setCircleDesc] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [authError, setAuthError] = useState("");

  const handleLogin = async () => {
    setAuthError("");
    try {
      await login();
    } catch (err: any) {
      setAuthError(err?.message || "Sign in failed. Please try again.");
    }
  };

  useEffect(() => {
    if (!user) {
      setCircles([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "circles"),
      where("members", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: Circle[] = [];
        snapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() } as Circle);
        });
        setCircles(fetched);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching circles:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !user || !circleName.trim()) return;

    try {
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await addDoc(collection(db, "circles"), {
        name: circleName.trim(),
        description: circleDesc.trim(),
        inviteCode: randomCode,
        createdBy: user.uid,
        members: [user.uid],
        createdAt: new Date(),
      });
      setCircleName("");
      setCircleDesc("");
      setIsCreateOpen(false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create circle");
    }
  };

  const handleJoinCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteCodeInput.trim()) return;
    setErrorMsg("");

    try {
      const q = query(
        collection(db, "circles"),
        where("inviteCode", "==", inviteCodeInput.trim().toUpperCase())
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setErrorMsg("No circle found with that code.");
        return;
      }

      const targetDoc = snap.docs[0];
      await updateDoc(targetDoc.ref, {
        members: arrayUnion(user.uid),
      });

      setInviteCodeInput("");
      setIsJoinOpen(false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to join circle");
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center text-center space-y-10 py-6">
      
      {/* Header - Centered */}
      <header className="w-full flex flex-col items-center justify-center space-y-3 border-b border-stone-100 pb-8">
        <div className="space-y-1">
          <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-stone-900">
            rpsyche
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 font-serif italic">
            A shared journal for close minds
          </p>
        </div>

        {user && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <span className="text-xs text-stone-500 font-mono bg-stone-50 border border-stone-200 px-3 py-1 rounded-full">
              {user.email} &bull; {isAdmin ? "ADMIN" : "MEMBER"}
            </span>
            <button
              onClick={logout}
              className="text-xs text-stone-400 hover:text-stone-900 flex items-center gap-1 transition"
            >
              <LogOut size={12} /> Exit
            </button>
          </div>
        )}
      </header>

      {/* Pre-Login View - Centered */}
      {!user ? (
        <div className="w-full flex flex-col items-center justify-center py-6 space-y-6 max-w-md mx-auto">
          <Feather className="text-stone-300" size={36} />
          <div className="space-y-2">
            <h2 className="font-serif text-2xl sm:text-3xl text-stone-800">
              Your quiet writing room awaits
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 leading-relaxed max-w-sm mx-auto">
              Join a private circle to write answers to prompts blindly, revealing entries together when everyone finishes.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleLogin}
              className="inline-flex items-center gap-2 bg-stone-900 text-white text-xs sm:text-sm px-6 py-3 rounded-xl hover:bg-black transition font-medium shadow-sm"
            >
              <LogIn size={15} /> Sign In with Google
            </button>
          </div>

          {authError && (
            <p className="text-xs text-red-500 max-w-sm mx-auto pt-2">
              {authError}
            </p>
          )}
        </div>
      ) : (
        /* Post-Login View - Centered */
        <div className="w-full space-y-8 flex flex-col items-center">
          
          {/* Action Bar */}
          <div className="w-full flex flex-col items-center justify-center space-y-3 border-b border-stone-100 pb-5">
            <h2 className="font-serif text-2xl text-stone-900">Your Circles</h2>
            
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => { setIsJoinOpen(true); setIsCreateOpen(false); setErrorMsg(""); }}
                className="text-xs border border-stone-200 px-3.5 py-2 rounded-xl text-stone-700 hover:bg-stone-50 transition"
              >
                Join with Code
              </button>

              {isAdmin && (
                <button
                  onClick={() => { setIsCreateOpen(true); setIsJoinOpen(false); setErrorMsg(""); }}
                  className="text-xs bg-stone-900 text-white px-3.5 py-2 rounded-xl hover:bg-black flex items-center gap-1.5 font-medium transition"
                >
                  <Plus size={13} /> New Circle
                </button>
              )}
            </div>
          </div>

          {/* Admin Circle Creation Form */}
          {isAdmin && isCreateOpen && (
            <form onSubmit={handleCreateCircle} className="w-full bg-stone-50/70 border border-stone-200 rounded-2xl p-5 space-y-3 text-center">
              <h3 className="font-serif text-sm font-semibold text-stone-800">Create New Circle</h3>
              <input
                type="text"
                placeholder="Circle Name (e.g. Sunday Folio)"
                value={circleName}
                onChange={(e) => setCircleName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs text-center rounded-xl bg-white border border-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
              <textarea
                placeholder="Description / Purpose (optional)"
                value={circleDesc}
                onChange={(e) => setCircleDesc(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 text-xs text-center rounded-xl bg-white border border-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-400 resize-none"
              />
              {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
              <div className="flex justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-stone-900 text-white rounded-xl hover:bg-black font-medium transition"
                >
                  Create
                </button>
              </div>
            </form>
          )}

          {/* Member Join Form */}
          {isJoinOpen && (
            <form onSubmit={handleJoinCircle} className="w-full bg-stone-50/70 border border-stone-200 rounded-2xl p-5 space-y-3 text-center">
              <h3 className="font-serif text-sm font-semibold text-stone-800">Enter Invite Code</h3>
              <input
                type="text"
                placeholder="6-digit code"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs uppercase font-mono tracking-widest text-center bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
              {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
              <div className="flex justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsJoinOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-stone-900 text-white rounded-xl hover:bg-black font-medium transition"
                >
                  Join
                </button>
              </div>
            </form>
          )}

          {/* Circles List - Centered */}
          {loading ? (
            <div className="w-full text-center py-10 text-xs text-stone-400 font-serif italic">
              Loading circles...
            </div>
          ) : circles.length === 0 ? (
            <div className="w-full border border-dashed border-stone-200 rounded-2xl p-8 text-center bg-stone-50/40 space-y-1">
              <p className="font-serif text-stone-700">You are not in any circles yet.</p>
              <p className="text-xs text-stone-400">Ask your circle host for their 6-digit invite code.</p>
            </div>
          ) : (
            <div className="w-full grid grid-cols-1 gap-3.5">
              {circles.map((c) => (
                <div
                  key={c.id}
                  className="w-full bg-white border border-stone-200 rounded-2xl p-5 hover:border-stone-400 transition space-y-3 flex flex-col items-center text-center"
                >
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-medium text-stone-900">{c.name}</h3>
                    {c.description && (
                      <p className="text-xs text-stone-500 max-w-sm mx-auto">{c.description}</p>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-stone-500 bg-stone-50 border border-stone-200 px-3 py-0.5 rounded-md">
                    Code: {c.inviteCode}
                  </span>

                  <div className="w-full flex justify-between items-center pt-3 border-t border-stone-100 text-xs px-2">
                    <span className="flex items-center gap-1.5 text-stone-400">
                      <Users size={13} /> {c.members?.length || 1} member{c.members?.length === 1 ? "" : "s"}
                    </span>
                    <Link
                      href={`/circle/${c.id}`}
                      className="inline-flex items-center gap-1 text-stone-900 font-medium hover:underline text-xs"
                    >
                      Open Circle <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}