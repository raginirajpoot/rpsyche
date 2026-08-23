"use client";

import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { MessageSquare, X } from "lucide-react";

interface AnnotationModalProps {
  entryId: string;
  selectedText: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AnnotationModal({
  entryId,
  selectedText,
  isOpen,
  onClose,
  onSuccess,
}: AnnotationModalProps) {
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user || !selectedText) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setLoading(true);

    try {
      await addDoc(collection(db, "annotations"), {
        entryId,
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        highlightedText: selectedText,
        comment: comment.trim(),
        createdAt: new Date(),
      });

      setComment("");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-[#FBF9F5] border border-stone-300 w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-stone-200">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C25E3E]">
            <MessageSquare size={14} /> Leave a thought
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X size={16} />
          </button>
        </div>

        {/* Highlight Quote Banner */}
        <div className="bg-amber-50/80 border-l-2 border-amber-400 p-3 rounded-r-lg">
          <p className="font-serif italic text-xs text-stone-700 leading-relaxed">
            "{selectedText}"
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="This made me stop reading for a second..."
            rows={3}
            autoFocus
            required
            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#C25E3E]/30 focus:border-[#C25E3E] resize-none"
          />

          <button
            type="submit"
            disabled={loading || !comment.trim()}
            className="w-full py-2.5 bg-[#1C1917] text-[#FBF9F5] rounded-xl text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Adding thought..." : "Attach Note"}
          </button>
        </form>
      </div>
    </div>
  );
}