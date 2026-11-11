import { useState, useEffect, useRef } from 'react';

export const useRaceTimer = (timeLimitMinutes, raceStarted, onTimeUp) => {
  const [countdown, setCountdown] = useState(null);
  const [timeLeft, setTimeLeft] = useState(timeLimitMinutes === -1 ? -1 : timeLimitMinutes * 60);
  
  const countdownTimerRef = useRef(null);

  // --- CLEANUP ON UNMOUNT (Reviewer Suggestion #3) ---
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  // --- 1. THE MAIN RACE TIMER ---
  // (Note: As the review noted, calculating this against a server end-time is a future optimization!)
  useEffect(() => {
    if (timeLeft === -1) return; // Do not tick if infinite

    let timerInterval;
    if (raceStarted && timeLeft > 0) {
      timerInterval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && raceStarted) {
      if (onTimeUp) onTimeUp();
    }
    return () => clearInterval(timerInterval);
  }, [raceStarted, timeLeft, onTimeUp]);

  // --- 2. THE SERVER-SYNCED COUNTDOWN TIMER ---
  const syncCountdown = (serverStartTime, setRaceStarted) => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    const checkTime = () => {
      const now = Date.now();
      const diff = serverStartTime - now;
      const raceAlreadyStarted = diff <= -1000; // Reviewer Suggestion #5

      if (raceAlreadyStarted) {
        // Reconnecting mid-match: Skip countdown entirely
        setCountdown(null);
        setRaceStarted(true);
        clearInterval(countdownTimerRef.current);
      } else if (diff <= 0) {
        // Hit 0: Flash GO! and instantly allow them to type
        setCountdown('GO!');
        setRaceStarted(true); 
        setTimeout(() => setCountdown(null), 1000); 
        clearInterval(countdownTimerRef.current);
      } else {
        // Standard countdown ticking
        setCountdown(Math.ceil(diff / 1000));
      }
    };

    checkTime(); // Run immediately so there's no 100ms flash
    countdownTimerRef.current = setInterval(checkTime, 100); 
  };

  const formatTime = (seconds) => {
    if (seconds === -1) return '∞'; 
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return { countdown, setCountdown, timeLeft, formatTime, syncCountdown };
};