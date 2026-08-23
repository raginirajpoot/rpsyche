const handleCreatePrompt = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newPromptText.trim() || !circleId) return;

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour duration

  await addDoc(collection(db, "circles", circleId, "prompts"), {
    text: newPromptText.trim(),
    createdAt: now,
    expiresAt: oneHourLater,
    status: "active", // "active" | "archived"
    createdBy: user.uid,
  });

  setNewPromptText("");
};