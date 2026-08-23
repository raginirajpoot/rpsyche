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
      console.error("Login error:", err);
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
    <div className="space-y-12 max-w-2xl mx-auto py-8">
      {/* Top Header */}
      <header className="flex justify-between items-center border-b border-stone-200/80 pb-6">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-[#1C1917]">rpsyche</h1>
          <p className="text-xs text-stone-500 font-serif italic mt-0.5">A shared journal for close minds</p>
        </div>

        <div>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-xs text-stone-600">
                {user.displayName || user.email}
              </span>
              <button
                onClick={logout}
                className="text-xs text-stone-400 hover:text-stone-700 flex items-center gap-1 transition"
              >
                <LogOut size={13} /> Exit
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Landing / Dashboard */}
      {!user ? (
        <div className="text-center py-20 space-y-4">
          <Feather className="mx-auto text-stone-400" size={32} />
          <h2 className="font-serif text-2xl text-stone-800">Your quiet writing room awaits</h2>
          <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
            Join a private circle to write answers to prompts blindly, revealing entries together when everyone finishes.
          </p>
          <div className="pt-2">
            <button
              onClick={handleLogin}
              className="inline-flex items-center gap-2 bg-[#1C1917] text-[#FBF9F5] text-xs px-5 py-2.5 rounded-xl hover:opacity-90 transition font-medium"
            >
              <LogIn size={14} /> Sign In with Google
            </button>
          </div>
          {authError && (
            <p className="text-xs text-red-500 max-w-sm mx-auto pt-2">
              {authError}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl text-[#1C1917]">Your Circles</h2>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setIsJoinOpen(true); setIsCreateOpen(false); setErrorMsg(""); }}
                className="text-xs border border-stone-300 px-3.5 py-2 rounded-xl text-stone-700 hover:bg-stone-50 transition"
              >
                Join with Code
              </button>

              {isAdmin && (
                <button
                  onClick={() => { setIsCreateOpen(true); setIsJoinOpen(false); setErrorMsg(""); }}
                  className="text-xs bg-[#1C1917] text-[#FBF9F5] px-3.5 py-2 rounded-xl hover:opacity-90 flex items-center gap-1.5 font-medium transition"
                >
                  <Plus size={14} /> New Circle
                </button>
              )}
            </div>
          </div>

          {/* Admin Create Form */}
          {isAdmin && isCreateOpen && (
            <form onSubmit={handleCreateCircle} className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <h3 className="font-serif text-base font-semibold text-stone-800">Create New Circle</h3>
              <input
                type="text"
                placeholder="Circle Name (e.g. Sunday Folio)"
                value={circleName}
                onChange={(e) => setCircleName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#C25E3E]"
              />
              <textarea
                placeholder="Description / Purpose (optional)"
                value={circleDesc}
                onChange={(e) => setCircleDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#C25E3E] resize-none"
              />
              {errorMsg && <p className="text-[11px] text-red-500">{errorMsg}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-[#1C1917] text-[#FBF9F5] rounded-xl hover:opacity-90 font-medium"
                >
                  Create
                </button>
              </div>
            </form>
          )}

          {/* Member Join Form */}
          {isJoinOpen && (
            <form onSubmit={handleJoinCircle} className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <h3 className="font-serif text-base font-semibold text-stone-800">Enter Invite Code</h3>
              <input
                type="text"
                placeholder="6-character code (e.g. A9B2X1)"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs uppercase font-mono tracking-wider rounded-xl border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#C25E3E]"
              />
              {errorMsg && <p className="text-[11px] text-red-500">{errorMsg}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsJoinOpen(false)}
                  className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-[#1C1917] text-[#FBF9F5] rounded-xl hover:opacity-90 font-medium"
                >
                  Join
                </button>
              </div>
            </form>
          )}

          {/* Circles List */}
          {loading ? (
            <div className="text-center py-12 text-xs text-stone-400 font-serif italic">
              Loading circles...
            </div>
          ) : circles.length === 0 ? (
            <div className="border border-dashed border-stone-300 rounded-2xl p-8 text-center bg-white/40 space-y-2">
              <p className="font-serif text-stone-600">You are not in any circles yet.</p>
              <p className="text-xs text-stone-400">Ask your circle host for their 6-digit invite code.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {circles.map((c) => (
                <div
                  key={c.id}
                  className="bg-white border border-stone-200 rounded-2xl p-5 hover:border-stone-400 transition space-y-3 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-[#1C1917]">{c.name}</h3>
                      {c.description && (
                        <p className="text-xs text-stone-500 mt-0.5">{c.description}</p>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">
                      {c.inviteCode}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-stone-100 text-xs">
                    <span className="flex items-center gap-1 text-stone-400">
                      <Users size={13} /> {c.members?.length || 1} member{c.members?.length === 1 ? "" : "s"}
                    </span>
                    <Link
                      href={`/circle/${c.id}`}
                      className="inline-flex items-center gap-1 text-[#C25E3E] font-medium hover:underline"
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