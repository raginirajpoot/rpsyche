"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  updateDoc 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import AnnotationModal from "../../components/AnnotationModal";
import { ArrowLeft, Feather, Plus, Lock, CheckCircle2, Sparkles, Send, MessageSquareQuote } from "lucide-react";

interface Circle {
  name: string;
  description?: string;
  inviteCode: string;
  members: string[];
}

interface Topic {
  id: string;
  prompt: string;
  description?: string;
  isRevealed: boolean;
  createdAt: any;
}

interface Entry {
  id?: string;
  title: string;
  content: string;
  isSubmitted: boolean;
  userId: string;
  userName: string;
}

interface Annotation {
  id: string;
  entryId: string;
  userName: string;
  highlightedText: string;
  comment: string;
}

export default function CirclePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [circle, setCircle] = useState<Circle | null>(null);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  
  // Highlighting & Note popup state
  const [selectedText, setSelectedText] = useState("");
  const [annotatingEntryId, setAnnotatingEntryId] = useState<string | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  // Writing state
  const [myEntry, setMyEntry] = useState<Entry>({
    title: "",
    content: "",
    isSubmitted: false,
    userId: "",
    userName: "",
  });
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const [newPromptDesc, setNewPromptDesc] = useState("");
  const [saving, setSaving] = useState(false);

  // 1. Fetch Circle details
  useEffect(() => {
    if (!id) return;
    const fetchCircle = async () => {
      const docRef = doc(db, "circles", id as string);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setCircle(snap.data() as Circle);
      }
    };
    fetchCircle();
  }, [id]);

  // 2. Fetch Active Topic in this Circle
  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "topics"), where("circleId", "==", id));
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const docData = snap.docs[0];
        setActiveTopic({ id: docData.id, ...docData.data() } as Topic);
      } else {
        setActiveTopic(null);
      }
    });
    return () => unsubscribe();
  }, [id]);

  // 3. Listen to Submissions for this Topic
  useEffect(() => {
    if (!activeTopic || !user) return;
    const q = query(collection(db, "entries"), where("topicId", "==", activeTopic.id));
    const unsubscribe = onSnapshot(q, (snap) => {
      const allEntries = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Entry[];
      setEntries(allEntries);

      const mine = allEntries.find((e) => e.userId === user.uid);
      if (mine) setMyEntry(mine);
    });
    return () => unsubscribe();
  }, [activeTopic, user]);

  // 4. Fetch Annotations if Revealed
  useEffect(() => {
    if (!activeTopic?.isRevealed) return;
    const q = query(collection(db, "annotations"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const notes = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Annotation[];
      setAnnotations(notes);
    });
    return () => unsubscribe();
  }, [activeTopic?.isRevealed]);

  // Handle text selection for notes
  const handleTextSelection = (entryId: string) => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : "";
    if (text.length > 3) {
      setSelectedText(text);
      setAnnotatingEntryId(entryId);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim() || !id) return;

    await addDoc(collection(db, "topics"), {
      circleId: id,
      prompt: newPrompt.trim(),
      description: newPromptDesc.trim(),
      isRevealed: false,
      createdAt: new Date(),
    });

    setNewPrompt("");
    setNewPromptDesc("");
    setIsCreatingTopic(false);
  };

  const handleSaveEntry = async (submit: boolean = false) => {
    if (!activeTopic || !user) return;
    setSaving(true);

    const entryId = `${activeTopic.id}_${user.uid}`;
    const entryData = {
      topicId: activeTopic.id,
      circleId: id,
      userId: user.uid,
      userName: user.displayName || "Anonymous",
      title: myEntry.title,
      content: myEntry.content,
      isSubmitted: submit ? true : myEntry.isSubmitted,
      updatedAt: new Date(),
    };

    await setDoc(doc(db, "entries", entryId), entryData, { merge: true });
    setSaving(false);
  };

  const handleReveal = async () => {
    if (!activeTopic) return;
    await updateDoc(doc(db, "topics", activeTopic.id), { isRevealed: true });
  };

  if (!circle) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="italic text-stone-500 font-serif">Opening circle...</span>
      </div>
    );
  }

  const submittedCount = entries.filter((e) => e.isSubmitted).length;
  const totalMembers = circle.members?.length || 1;
  const wordCount = myEntry.content.trim() ? myEntry.content.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-xs text-stone-500 hover:text-stone-800 transition font-medium"
        >
          <ArrowLeft size={14} /> Back to Circles
        </button>
        <span className="text-xs text-stone-400 uppercase tracking-widest font-mono">
          Code: {circle.inviteCode}
        </span>
      </div>

      {/* Circle Info */}
      <div className="space-y-1">
        <h1 className="font-serif text-3xl text-[#1C1917]">{circle.name}</h1>
        {circle.description && (
          <p className="text-stone-500 text-sm leading-relaxed">{circle.description}</p>
        )}
      </div>

      {/* NO ACTIVE TOPIC */}
      {!activeTopic && !isCreatingTopic && (
        <div className="border border-dashed border-stone-300 rounded-2xl p-10 text-center bg-white/40 space-y-4">
          <Feather className="mx-auto text-stone-400" size={24} />
          <div className="space-y-1">
            <h3 className="font-serif text-lg text-stone-700">No active prompt</h3>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              Pose a single question to your circle. Everyone writes blindly until revealed.
            </p>
          </div>
          <button
            onClick={() => setIsCreatingTopic(true)}
            className="inline-flex items-center gap-2 text-xs bg-[#1C1917] text-[#FBF9F5] px-4 py-2.5 rounded-xl hover:opacity-90 transition font-medium"
          >
            <Plus size={14} /> Ask a Question
          </button>
        </div>
      )}

      {/* CREATE TOPIC FORM */}
      {isCreatingTopic && (
        <form onSubmit={handleCreateTopic} className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="font-serif text-lg text-[#1C1917]">New Question for the Circle</h3>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wider">
              The Question / Prompt
            </label>
            <input
              type="text"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="e.g. What does home mean to you?"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C25E3E]/30 focus:border-[#C25E3E]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wider">
              Optional Guidelines
            </label>
            <textarea
              value={newPromptDesc}
              onChange={(e) => setNewPromptDesc(e.target.value)}
              placeholder="No rules. Just write whatever comes to mind."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C25E3E]/30 focus:border-[#C25E3E] resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreatingTopic(false)}
              className="px-4 py-2 text-xs text-stone-500 hover:text-stone-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs bg-[#C25E3E] text-white rounded-lg hover:opacity-90 font-medium"
            >
              Pose Question
            </button>
          </div>
        </form>
      )}

      {/* ACTIVE TOPIC PRESENT */}
      {activeTopic && (
        <div className="space-y-8">
          <div className="bg-[#F4EFE6] border border-stone-200/80 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#C25E3E]">
                Active Topic
              </span>
              <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-white/70 px-2.5 py-1 rounded-full border border-stone-200">
                <Lock size={12} />
                <span>{submittedCount} / {totalMembers} submitted</span>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="font-serif text-2xl text-[#1C1917]">"{activeTopic.prompt}"</h2>
              {activeTopic.description && (
                <p className="text-xs text-stone-600 italic">{activeTopic.description}</p>
              )}
            </div>

            {!activeTopic.isRevealed && (
              <div className="pt-2 flex justify-between items-center border-t border-stone-200/60 text-xs">
                <span className="text-stone-500 italic">Submissions stay hidden until revealed.</span>
                <button
                  onClick={handleReveal}
                  className="flex items-center gap-1.5 text-[#C25E3E] font-medium hover:underline"
                >
                  <Sparkles size={14} /> Reveal All ({submittedCount})
                </button>
              </div>
            )}
          </div>

          {/* VIEW MODE: If Revealed */}
          {activeTopic.isRevealed ? (
            <div className="space-y-6">
              <div className="flex items-baseline justify-between border-b border-stone-200 pb-2">
                <h3 className="font-serif text-xl text-[#1C1917]">
                  All Responses ({entries.length})
                </h3>
                <span className="text-xs text-stone-400 italic">Highlight any phrase to leave a thought</span>
              </div>

              <div className="space-y-6">
                {entries.map((entry) => {
                  const entryNotes = annotations.filter((n) => n.entryId === entry.id);

                  return (
                    <div
                      key={entry.id}
                      className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-sm"
                    >
                      <div className="flex justify-between items-baseline border-b border-stone-100 pb-2">
                        <h4 className="font-serif text-lg font-semibold text-[#1C1917]">
                          {entry.title || "Untitled Thought"}
                        </h4>
                        <span className="text-xs text-stone-400">by {entry.userName}</span>
                      </div>

                      {/* Text selection area */}
                      <div
                        onMouseUp={() => handleTextSelection(entry.id || "")}
                        className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap selection:bg-[#C25E3E]/20"
                      >
                        {entry.content}
                      </div>

                      {/* Floating Prompt Button to Add Thought */}
                      {selectedText && annotatingEntryId === entry.id && (
                        <div className="pt-2">
                          <button
                            onClick={() => setIsNoteModalOpen(true)}
                            className="inline-flex items-center gap-1.5 bg-[#C25E3E] text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-sm hover:opacity-90 animate-bounce"
                          >
                            <MessageSquareQuote size={13} />
                            Comment on selected text
                          </button>
                        </div>
                      )}

                      {/* Render Attached Annotations / Thoughts */}
                      {entryNotes.length > 0 && (
                        <div className="pt-4 mt-4 border-t border-stone-100 space-y-2.5">
                          <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-400 block">
                            Thoughts & Highlights:
                          </span>
                          {entryNotes.map((note) => (
                            <div
                              key={note.id}
                              className="bg-stone-50 border border-stone-200/70 p-3 rounded-xl space-y-1 text-xs"
                            >
                              <div className="font-serif italic text-stone-500 border-l-2 border-[#C25E3E] pl-2">
                                "{note.highlightedText}"
                              </div>
                              <p className="text-stone-800 pt-1">
                                <strong className="font-medium text-stone-900">{note.userName}:</strong> {note.comment}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* WRITING DESK: If Not Revealed Yet */
            <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
              {myEntry.isSubmitted ? (
                <div className="py-8 text-center space-y-3">
                  <CheckCircle2 size={36} className="mx-auto text-green-600" />
                  <h3 className="font-serif text-xl text-[#1C1917]">You're all set!</h3>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto">
                    Your response is locked in the notebook. It will be revealed once the circle is ready.
                  </p>
                  <div className="pt-4 border-t border-stone-100 text-left">
                    <span className="text-xs uppercase tracking-wider text-stone-400 block mb-1 font-semibold">
                      Your submission:
                    </span>
                    <h4 className="font-serif font-semibold text-stone-800">{myEntry.title || "Untitled"}</h4>
                    <p className="text-xs text-stone-600 mt-2 line-clamp-3 italic">"{myEntry.content}"</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={myEntry.title}
                    onChange={(e) => setMyEntry({ ...myEntry, title: e.target.value })}
                    placeholder="Title of your thought..."
                    className="w-full text-xl font-serif border-b border-stone-200 pb-2 focus:outline-none focus:border-[#C25E3E] placeholder:text-stone-300"
                  />

                  <textarea
                    value={myEntry.content}
                    onChange={(e) => setMyEntry({ ...myEntry, content: e.target.value })}
                    placeholder="Start scribbling your thoughts here..."
                    rows={8}
                    className="w-full text-sm leading-relaxed border-none focus:outline-none resize-none placeholder:text-stone-300 placeholder:italic"
                  />

                  <div className="flex justify-between items-center pt-4 border-t border-stone-100 text-xs text-stone-400">
                    <span>{wordCount} words</span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSaveEntry(false)}
                        disabled={saving}
                        className="text-stone-500 hover:text-stone-800"
                      >
                        {saving ? "Saving..." : "Save Draft"}
                      </button>
                      <button
                        onClick={() => handleSaveEntry(true)}
                        disabled={saving || !myEntry.content.trim()}
                        className="flex items-center gap-1.5 bg-[#1C1917] text-[#FBF9F5] px-4 py-2 rounded-xl hover:opacity-90 transition font-medium disabled:opacity-50"
                      >
                        <Send size={12} /> Submit
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Note Modal */}
      {annotatingEntryId && (
        <AnnotationModal
          isOpen={isNoteModalOpen}
          entryId={annotatingEntryId}
          selectedText={selectedText}
          onClose={() => {
            setIsNoteModalOpen(false);
            setSelectedText("");
          }}
          onSuccess={() => {
            setSelectedText("");
          }}
        />
      )}
    </div>
  );
}