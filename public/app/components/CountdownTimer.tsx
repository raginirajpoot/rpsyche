"use client";

import { useEffect, useState } from "react";
import { Clock, AlertCircle } from "lucide-react";

interface CountdownTimerProps {
  deadline: any; // Firestore Timestamp or Date string
  onExpire?: () => void;
}

export default function CountdownTimer({ deadline, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    if (!deadline) return;

    const targetDate = deadline?.toDate ? deadline.toDate().getTime() : new Date(deadline).getTime();

    const calculate = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (onExpire) onExpire();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  if (!deadline) return null;

  if (timeLeft.isExpired) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-100/70 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
        <AlertCircle size={13} />
        <span>Time limit ended</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-stone-700 bg-white/80 border border-stone-200 px-2.5 py-1 rounded-full font-mono font-medium shadow-2xl">
      <Clock size={12} className="text-[#C25E3E]" />
      <span>
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:
        {String(timeLeft.seconds).padStart(2, "0")} left
      </span>
    </div>
  );
}