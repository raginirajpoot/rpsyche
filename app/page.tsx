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
    <div className="min-h-screen py-10 px-4 sm:px-6 relative flex flex-col items-center">
      {/* Top Right Corner Profile & Exit Button */}
      {user && (
        <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
          <span className="text-xs sm:text-sm text-stone-800 font-mono bg-white/40 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-sm">
            {user.email} &bull; {isAdmin ? "ADMIN" : "MEMBER"}
          </span>
          <button
            onClick={logout}
            className="text-xs sm:text-sm text-stone-700 hover:text-stone-950 bg-white/40 hover:bg-white/60 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 transition"
          >
            <LogOut size={14} /> Exit
          </button>
        </div>
      )}

      {/* Main Transparent Container */}
      <div className="w-full max-w-3xl bg-white/30 backdrop-blur-xl rounded-3xl p-8 sm:p-12 shadow-2xl space-y-12 text-center mt-6">
        
        {/* Top Centered Header */}
        <header className="space-y-2">
          <h1 className="font-serif text-5xl sm:text-6xl tracking-tight text-[#1C1917] font-medium">
            rpsyche
          </h1>
          <p className="text-base sm:text-lg text-stone-700 font-serif italic">
            A shared journal for close minds
          </p>
        </header>

        {/* Landing View (Pre-Login) */}
        {!user ? (
          <div className="py-12 space-y-8 max-w-xl mx-auto">
            <Feather className="mx-auto text-stone-600" size={44} />
            <div className="space-y-3">
              <h2 className="font-serif text-3xl sm:text-4xl text-stone-900 leading-snug">
                Your quiet writing room awaits
              </h2>
              <p className="text-base sm:text-lg text-stone-700 leading-relaxed">
                Join a private circle to write answers to prompts blindly, revealing entries together when everyone finishes.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleLogin}
                className="inline-flex items-center gap-2 bg-[#1C1917]/90 text-[#FBF9F5] text-base px-8 py-3.5 rounded-2xl hover:bg-[#1C1917] transition font-medium shadow-lg hover:scale-[1.02] transform"
              >
                <LogIn size={18} /> Sign In with Google
              </button>
            </div>

            {authError && (
              <p className="text-sm text-red-600 max-w-sm mx-auto pt-2 bg-white/50 py-1.5 rounded-xl">
                {authError}
              </p>
            )}
          </div>
        ) : (
          /* Post-Login Centered Dashboard */
          <div className="space-y-10">
            {/* Action Bar */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="font-serif text-3xl sm:text-4xl text-[#1C1917]">Your Circles</h2>
                <p className="text-sm sm:text-base text-stone-700">Select a circle to read and submit reflections</p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => { setIsJoinOpen(true); setIsCreateOpen(false); setErrorMsg(""); }}
                  className="text-sm bg-white/50 hover:bg-white/80 px-5 py-2.5 rounded-xl text-stone-800 transition shadow-sm font-medium"
                >
                  Join with Code
                </button>

                {isAdmin && (
                  <button
                    onClick={() => { setIsCreateOpen(true); setIsJoinOpen(false); setErrorMsg(""); }}
                    className="text-sm bg-[#1C1917]/90 text-[#FBF9F5] px-5 py-2.5 rounded-xl hover:bg-[#1C1917] flex items-center gap-2 font-medium transition shadow-sm"
                  >
                    <Plus size={16} /> New Circle
                  </button>
                )}
              </div>
            </div>

            {/* Admin Circle Creation Form */}
            {isAdmin && isCreateOpen && (
              <form onSubmit={handleCreateCircle} className="bg-white/40 backdrop-blur-md rounded-2xl p-6 sm:p-8 space-y-4 shadow-lg max-w-xl mx-auto text-left">
                <h3 className="font-serif text-xl font-semibold text-stone-900 text-center">Create New Circle</h3>
                <input
                  type="text"
                  placeholder="Circle Name (e.g. Sunday Folio)"
                  value={circleName}
                  onChange={(e) => setCircleName(e.target.value)}
                  required
                  className="w-full px-4 py-3 text-base rounded-xl bg-white/70 border-none focus:outline-none focus:ring-2 focus:ring-stone-400 placeholder:text-stone-500"
                />
                <textarea
                  placeholder="Description / Purpose (optional)"
                  value={circleDesc}
                  onChange={(e) => setCircleDesc(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 text-base rounded-xl bg-white/70 border-none focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none placeholder:text-stone-500"
                />
                {errorMsg && <p className="text-xs text-red-600 font-medium">{errorMsg}</p>}
                <div className="flex justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 text-sm bg-[#1C1917] text-[#FBF9F5] rounded-xl hover:opacity-90 font-medium transition shadow"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}

            {/* Member Join Form */}
            {isJoinOpen && (
              <form onSubmit={handleJoinCircle} className="bg-white/40 backdrop-blur-md rounded-2xl p-6 sm:p-8 space-y-4 shadow-lg max-w-md mx-auto text-left">
                <h3 className="font-serif text-xl font-semibold text-stone-900 text-center">Enter Invite Code</h3>
                <input
                  type="text"
                  placeholder="6-character code"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  required
                  className="w-full px-4 py-3 text-base uppercase font-mono tracking-widest text-center rounded-xl bg-white/70 border-none focus:outline-none focus:ring-2 focus:ring-stone-400 placeholder:text-stone-500"
                />
                {errorMsg && <p className="text-xs text-red-600 font-medium text-center">{errorMsg}</p>}
                <div className="flex justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsJoinOpen(false)}
                    className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 text-sm bg-[#1C1917] text-[#FBF9F5] rounded-xl hover:opacity-90 font-medium transition shadow"
                  >
                    Join
                  </button>
                </div>
              </form>
            )}

            {/* Circle Cards List */}
            {loading ? (
              <div className="text-center py-12 text-base text-stone-600 font-serif italic">
                Loading circles...
              </div>
            ) : circles.length === 0 ? (
              <div className="rounded-2xl p-10 text-center bg-white/30 backdrop-blur-sm space-y-2 max-w-lg mx-auto">
                <p className="font-serif text-xl text-stone-800">You are not in any circles yet.</p>
                <p className="text-sm text-stone-600">Ask your circle host for their 6-digit invite code.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 text-left max-w-2xl mx-auto">
                {circles.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white/40 backdrop-blur-md rounded-2xl p-6 sm:p-7 hover:bg-white/60 transition space-y-4 shadow-sm group"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <h3 className="font-serif text-2xl font-medium text-[#1C1917] group-hover:text-black transition">
                          {c.name}
                        </h3>
                        {c.description && (
                          <p className="text-sm sm:text-base text-stone-700 leading-relaxed">{c.description}</p>
                        )}
                      </div>
                      <span className="text-xs font-mono text-stone-600 bg-white/60 px-3 py-1 rounded-lg shadow-xs">
                        {c.inviteCode}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 text-sm">
                      <span className="flex items-center gap-1.5 text-stone-600">
                        <Users size={16} /> {c.members?.length || 1} member{c.members?.length === 1 ? "" : "s"}
                      </span>
                      <Link
                        href={`/circle/${c.id}`}
                        className="inline-flex items-center gap-1.5 text-stone-900 font-semibold hover:underline text-base"
                      >
                        Open Circle <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}