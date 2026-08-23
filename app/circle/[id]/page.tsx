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
import AnnotationModal from "@/app/components/AnnotationModal";
import CountdownTimer from "@/app/components/CountdownTimer";
import { 
  ArrowLeft, 
  Feather, 
  Plus, 
  Lock, 
  CheckCircle2, 
  Sparkles, 
  Send, 
  MessageSquareQuote, 
  Edit3, 
  Clock, 
  AlertTriangle 
} from "lucide-react";

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
  isRevealed?: boolean;
  deadline?: any;
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
  const [isWindowExpired, setIsWindowExpired] = useState(false);
  
  // Annotation state
  const [selectedText, setSelectedText] = useState("");
  const [annotatingEntryId, setAnnotatingEntryId] = useState<string | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  // User private drafting state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEditingAfterSubmit, setIsEditingAfterSubmit] = useState(false);
  
  // Topic creation state
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

  // 2. Fetch Active Topic
  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "topics"), where("circleId", "==", id));
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const allTopics = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Topic[];
        allTopics.sort((a, b) => {
          const dateA = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          const dateB = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          return dateA - dateB;
        });
        const current = allTopics[0];
        setActiveTopic(current);

        // Check if 1-hour window has already passed
        if (current.deadline) {
          const deadlineMs = current.deadline?.toDate ? current.deadline.toDate().getTime() : new Date(current.deadline).getTime();
          setIsWindowExpired(Date.now() > deadlineMs);
        }
      } else {
        setActiveTopic(null);
      }
    });
    return () => unsubscribe();
  }, [id]);

  // 3. Listen to Submissions
  useEffect(() => {
    if (!activeTopic || !user) return;
    const q = query(collection(db, "entries"), where("topicId", "==", activeTopic.id));
    const unsubscribe = onSnapshot(q, (snap) => {
      const allEntries = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Entry[];
      setEntries(allEntries);

      const mine = allEntries.find((e) => e.userId === user.uid);
      if (mine) {
        setTitle(mine.title || "");
        setContent(mine.content || "");
        setIsSubmitted(Boolean(mine.isSubmitted));
      }
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

  // Handle Highlight selection
  const handleTextSelection = (entryId: string) => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : "";
    if (text.length > 3) {
      setSelectedText(text);
      setAnnotatingEntryId(entryId);
    }
  };

  // Create New Question with Strict 1-Hour Deadline
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim() || !id) return;

    const now = new Date();
    // Exactly 60 minutes from now
    const oneHourDeadline = new Date(now.getTime() + 60 * 60 * 1000);

    await addDoc(collection(db, "topics"), {
      circleId: id,
      prompt: newPrompt.trim(),
      description: newPromptDesc.trim(),
      isRevealed: false,
      deadline: oneHourDeadline,
      createdAt: now,
    });

    setNewPrompt("");
    setNewPromptDesc("");
    setIsCreatingTopic(false);
  };

  // Save / Submit Entry
  const handleSaveEntry = async (submit: boolean = false) => {
    if (!activeTopic || !user || isWindowExpired) return;
    setSaving(true);

    const entryId = `${activeTopic.id}_${user.uid}`;
    const entryData = {
      topicId: activeTopic.id,
      circleId: id,
      userId: user.uid,
      userName: user.displayName || "Anonymous",
      title: title.trim(),
      content: content.trim(),
      isSubmitted: submit ? true : isSubmitted,
      updatedAt: new Date(),
    };

    await setDoc(doc(db, "entries", entryId), entryData, { merge: true });
    if (submit) {
      setIsSubmitted(true);
      setIsEditingAfterSubmit(false);
    }
    setSaving(false);
  };

  // Reveal Submissions
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
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const isRevealed = Boolean(activeTopic?.isRevealed);

  return (
    <div className="space-y-8">
      {/* Navigation Top Bar */}
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
        <div className="flex justify-between items-baseline">
          <h1 className="font-serif text-3xl text-[#1C1917]">{circle.name}</h1>
          <button
            onClick={() => router.push(`/circle/${id}/archive`)}
            className="text-xs text-[#C25E3E] hover:underline font-medium"
          >
            Past Chapters →
          </button>
        </div>
        {circle.description && (
          <p className="text-stone-500 text-sm leading-relaxed">{circle.description}</p>
        )}
      </div>

      {/* NO ACTIVE QUESTION */}
      {!activeTopic && !isCreatingTopic && (
        <div className="border border-dashed border-stone-300 rounded-2xl p-10 text-center bg-white/40 space-y-4">
          <Feather className="mx-auto text-stone-400" size={24} />
          <div className="space-y-1">
            <h3 className="font-serif text-lg text-stone-700">No active prompt</h3>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              Pose a question. Circle members have exactly 1 hour to write their thoughts.
            </p>
          </div>
          <button
            onClick={() => setIsCreatingTopic(true)}
            className="inline-flex items-center gap-2 text-xs bg-[#1C1917] text-[#FBF9F5] px-4 py-2.5 rounded-xl hover:opacity-90 transition font-medium"
          >
            <Plus size={14} /> Pose 1-Hour Question
          </button>
        </div>
      )}

      {/* QUESTION CREATION FORM */}
      {isCreatingTopic && (
        <form onSubmit={handleCreateTopic} className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-lg text-[#1C1917]">New Question</h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C25E3E] bg-[#C25E3E]/10 px-2 py-0.5 rounded-full">
              <Clock size={11} /> 1-Hour Writing Window
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wider">
              The Question / Prompt
            </label>
            <input
              type="text"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="e.g. What is one thing you believed five years ago that you no longer believe?"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C25E3E]/30 focus:border-[#C25E3E]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wider">
              Optional Context / Guidelines
            </label>
            <textarea
              value={newPromptDesc}
              onChange={(e) => setNewPromptDesc(e.target.value)}
              placeholder="Write instinctively. Submissions lock in 60 minutes."
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
              Publish (Starts 1-Hr Timer)
            </button>
          </div>
        </form>
      )}

      {/* ACTIVE TOPIC BANNER */}
      {activeTopic && (
        <div className="space-y-8">
          <div className="bg-[#F4EFE6] border border-stone-200/80 rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#C25E3E]">
                Active Topic
              </span>
              <div className="flex items-center gap-2">
                {activeTopic.deadline && (
                  <CountdownTimer 
                    deadline={activeTopic.deadline} 
                    onExpire={() => setIsWindowExpired(true)} 
                  />
                )}
                <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-white/70 px-2.5 py-1 rounded-full border border-stone-200">
                  <Lock size={12} />
                  <span>{submittedCount} / {totalMembers} submitted</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="font-serif text-2xl text-[#1C1917]">"{activeTopic.prompt}"</h2>
              {activeTopic.description && (
                <p className="text-xs text-stone-600 italic">{activeTopic.description}</p>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-stone-200/60 text-xs">
              <span className="text-stone-500 italic">
                {isWindowExpired ? "1-Hour writing window has closed." : "1-Hour rapid writing window in progress."}
              </span>
              {!isRevealed && (
                <button
                  onClick={handleReveal}
                  className="flex items-center gap-1.5 text-[#C25E3E] font-medium hover:underline"
                >
                  <Sparkles size={14} /> Reveal Responses ({submittedCount})
                </button>
              )}
            </div>
          </div>

          {/* WRITING WINDOW EXPIRED & NOT SUBMITTED */}
          {isWindowExpired && !isSubmitted && !isRevealed && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-2">
              <AlertTriangle size={24} className="mx-auto text-amber-700" />
              <h3 className="font-serif text-base text-amber-950 font-medium">
                The 1-hour writing window has closed
              </h3>
              <p className="text-xs text-amber-800 max-w-sm mx-auto">
                The timer for this prompt expired. You will be able to read everyone's thoughts as soon as they are revealed!
              </p>
            </div>
          )}

          {/* ACTIVE WRITING DESK (ONLY WITHIN THE 1-HOUR WINDOW) */}
          {!isWindowExpired && (!isSubmitted || isEditingAfterSubmit) && (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Your Notebook Page (1-Hr Window Active)
                </span>
                {isSubmitted && (
                  <button
                    onClick={() => setIsEditingAfterSubmit(false)}
                    className="text-xs text-stone-500 hover:text-stone-800"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title of your thought..."
                  className="w-full text-xl font-serif border-b border-stone-200 pb-2 focus:outline-none focus:border-[#C25E3E] placeholder:text-stone-300"
                />

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your instinctive reaction... (nobody can see this until revealed)"
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
                      disabled={saving || !content.trim()}
                      className="flex items-center gap-1.5 bg-[#1C1917] text-[#FBF9F5] px-4 py-2 rounded-xl hover:opacity-90 transition font-medium disabled:opacity-50"
                    >
                      <Send size={12} /> {isSubmitted ? "Update Submission" : "Submit"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUBMITTED CONFIRMATION */}
          {isSubmitted && !isEditingAfterSubmit && (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="py-4 text-center space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-green-600" />
                <h3 className="font-serif text-lg text-[#1C1917]">Your entry is submitted!</h3>
                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  Your entry is locked in. It will be viewable when the responses are revealed.
                </p>
                {!isRevealed && !isWindowExpired && (
                  <button
                    onClick={() => setIsEditingAfterSubmit(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-[#C25E3E] hover:underline pt-2 font-medium"
                  >
                    <Edit3 size={13} /> Edit response while timer is ticking
                  </button>
                )}
              </div>

              <div className="pt-4 border-t border-stone-100 text-left">
                <span className="text-[11px] uppercase tracking-wider text-stone-400 block mb-1 font-semibold">
                  Your submission:
                </span>
                <h4 className="font-serif font-semibold text-stone-800">{title || "Untitled"}</h4>
                <p className="text-xs text-stone-600 mt-2 line-clamp-4 italic whitespace-pre-wrap">"{content}"</p>
              </div>
            </div>
          )}

          {/* REVEALED ENTRIES (ALWAYS PERMANENTLY VIEWABLE) */}
          {isRevealed && (
            <div className="space-y-6 pt-4">
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

                      <div
                        onMouseUp={() => handleTextSelection(entry.id || "")}
                        className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap selection:bg-[#C25E3E]/20"
                      >
                        {entry.content}
                      </div>

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