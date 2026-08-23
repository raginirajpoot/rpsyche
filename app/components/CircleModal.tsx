"use client";

import { useState } from "react";
import { collection, addDoc, doc, updateDoc, arrayUnion, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { X, Plus, KeyRound } from "lucide-react";

interface CircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CircleModal({ isOpen, onClose, onSuccess }: CircleModalProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !user) return null;

  // Generate a random 6-character code
  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    try {
      const code = generateCode();
      await addDoc(collection(db, "circles"), {
        name: name.trim(),
        description: description.trim(),
        inviteCode: code,
        createdBy: user.uid,
        members: [user.uid],
        createdAt: new Date(),
      });

      setName("");
      setDescription("");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to create circle. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError("");

    try {
      const q = query(
        collection(db, "circles"),
        where("inviteCode", "==", inviteCode.trim().toUpperCase())
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("Invalid invite code. Check with your friend!");
        setLoading(false);
        return;
      }

      const circleDoc = snapshot.docs[0];
      await updateDoc(doc(db, "circles", circleDoc.id), {
        members: arrayUnion(user.uid),
      });

      setInviteCode("");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to join circle. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-[#FBF9F5] border border-stone-200 w-full max-w-md rounded-2xl p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-stone-400 hover:text-stone-700 transition"
        >
          <X size={18} />
        </button>

        {/* Tab switcher */}
        <div className="flex border-b border-stone-200 pb-2 mb-6 gap-6 text-sm">
          <button
            onClick={() => { setTab("create"); setError(""); }}
            className={`font-serif pb-2 transition flex items-center gap-1.5 ${
              tab === "create"
                ? "border-b-2 border-[#C25E3E] text-[#1C1917] font-semibold"
                : "text-stone-400 hover:text-stone-700"
            }`}
          >
            <Plus size={16} />
            Create a Circle
          </button>
          <button
            onClick={() => { setTab("join"); setError(""); }}
            className={`font-serif pb-2 transition flex items-center gap-1.5 ${
              tab === "join"
                ? "border-b-2 border-[#C25E3E] text-[#1C1917] font-semibold"
                : "text-stone-400 hover:text-stone-700"
            }`}
          >
            <KeyRound size={16} />
            Join with Code
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-600 mb-4 bg-red-50 p-2.5 rounded-lg border border-red-200">
            {error}
          </p>
        )}

        {tab === "create" ? (
          <form onSubmit={handleCreateCircle} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wider">
                Circle Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The Sunday Writers"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C25E3E]/30 focus:border-[#C25E3E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wider">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="For our occasional overthinking and excessive punctuation."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C25E3E]/30 focus:border-[#C25E3E] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-3 bg-[#1C1917] text-[#FBF9F5] rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Circle"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinCircle} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wider">
                6-Character Invite Code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. 7K4P9M"
                maxLength={6}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-sm tracking-widest uppercase font-mono text-center focus:outline-none focus:ring-2 focus:ring-[#C25E3E]/30 focus:border-[#C25E3E]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || inviteCode.trim().length < 6}
              className="w-full py-3 bg-[#1C1917] text-[#FBF9F5] rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join Circle"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}