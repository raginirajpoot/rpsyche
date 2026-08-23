"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CircleModal from "./components/CircleModal";
import { ArrowRight, Feather, LogOut, Copy, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface Circle {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  members: string[];
}

export default function Home() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const router = useRouter();

  // Real-time listener for user's circles
  useEffect(() => {
    if (!user) {
      setCircles([]);
      return;
    }

    const q = query(
      collection(db, "circles"),
      where("members", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const circleData: Circle[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Circle[];
      setCircles(circleData);
    });

    return () => unsubscribe();
  }, [user]);

  const copyInvite = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="italic text-stone-500 font-serif">Opening notebook...</span>
      </div>
    );
  }

  // Logged-out Landing State
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center text-center pt-16 space-y-8">
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-[#C25E3E] mb-2">
            <Feather size={22} />
            <span className="font-serif text-2xl tracking-wide font-medium">rpsyche</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-[#1C1917]">
            A quiet space for genuine thoughts.
          </h1>
          <p className="text-stone-500 text-base max-w-sm mx-auto leading-relaxed pt-2">
            One shared question. No one sees what you wrote until everyone submits.
          </p>
        </div>

        <button
          onClick={signInWithGoogle}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-[#1C1917] text-[#FBF9F5] py-3.5 px-6 rounded-xl hover:opacity-90 transition active:scale-[0.99] font-medium text-sm shadow-sm"
        >
          Sign in with Google
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  // Logged-in Dashboard
  return (
    <div className="space-y-10">
      <header className="flex justify-between items-baseline border-b border-stone-200 pb-4">
        <div>
          <span className="text-[#C25E3E] text-xs font-semibold tracking-wider uppercase block">
            rpsyche
          </span>
          <h2 className="text-2xl font-serif text-[#1C1917]">
            Good day, {user.displayName?.split(" ")[0]}.
          </h2>
        </div>
        <button
          onClick={signOut}
          className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1.5 transition"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </header>

      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs uppercase tracking-widest text-stone-400 font-semibold">
            Your Circles
          </h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs text-[#C25E3E] font-medium hover:underline"
          >
            + New Circle
          </button>
        </div>

        {circles.length === 0 ? (
          <div className="border border-dashed border-stone-300 rounded-2xl p-10 text-center bg-white/40 space-y-3">
            <p className="italic text-stone-500 text-sm font-serif">
              You aren't in any writing circles yet.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs bg-[#1C1917] text-[#FBF9F5] px-4 py-2.5 rounded-xl hover:opacity-90 transition font-medium"
            >
              Create or Join a Circle
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {circles.map((circle) => (
              <div
                key={circle.id}
                className="bg-white/80 border border-stone-200/80 rounded-2xl p-5 hover:border-stone-300 transition shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-serif text-lg font-semibold text-[#1C1917]">
                      {circle.name}
                    </h4>
                    {circle.description && (
                      <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">
                        {circle.description}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-medium">
                    {circle.members.length} {circle.members.length === 1 ? "writer" : "writers"}
                  </span>
                </div>

                <div className="pt-2 border-t border-stone-100 flex justify-between items-center text-xs">
                  <button
                    onClick={() => copyInvite(circle.inviteCode)}
                    className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800 transition"
                  >
                    {copiedCode === circle.inviteCode ? (
                      <>
                        <Check size={13} className="text-green-600" />
                        <span className="text-green-600 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Code: <strong className="font-mono">{circle.inviteCode}</strong></span>
                      </>
                    )}
                  </button>

                 <button
                  onClick={() => router.push(`/circle/${circle.id}`)}
                  className="text-[#C25E3E] font-medium hover:underline cursor-pointer"
                 >
                  Open Circle →
                 </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Circle Modal */}
      <CircleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => setIsModalOpen(false)}
      />
    </div>
  );
}