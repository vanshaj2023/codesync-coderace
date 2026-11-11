import { Bot, Clock, Dumbbell, Swords, Target, Trophy } from "lucide-react";

export const FEATURES = [
  {
    icon: Swords,
    title: "1v1 duels",
    text: "Create a room, share its code, and race a friend on the very same problem at the very same time.",
  },
  {
    icon: Dumbbell,
    title: "Practice mode",
    text: "No opponent needed. Train solo against the clock whenever you want a quick session.",
  },
  {
    icon: Clock,
    title: "Pick your pace",
    text: "Bullet (5 min), Blitz (15 min), Rapid (30 min), Zen with no limit, or set a custom time.",
  },
  {
    icon: Target,
    title: "Problems that fit",
    text: "Choose easy, medium or hard, and optionally focus on questions a specific company has asked.",
  },
  {
    icon: Trophy,
    title: "Ratings and leaderboard",
    text: "When both players are signed in, the result moves both ELO ratings. The leaderboard shows the top players.",
  },
  {
    icon: Bot,
    title: "AI code review",
    text: "After a match, get a short review of your code: its likely complexity and one tip to improve it.",
  },
];

export const LANGUAGES = [
  { name: "C++", isReady: true },
  { name: "Java", isReady: false },
  { name: "Python", isReady: false },
];

export const STEPS = [
  {
    title: "Pick a mode",
    text: "Practice solo or create a 1v1 room. Choose a difficulty, an optional company, and a time format.",
  },
  {
    title: "Share the room code",
    text: "Send the short room code to your opponent. The arena opens as soon as they join.",
  },
  {
    title: "Ready up",
    text: "When both players lock in, a countdown starts and you each receive the same problem.",
  },
  {
    title: "Code, run, submit",
    text: "Run against the sample cases while you work. Submit to run the full test suite. First to pass every test wins.",
  },
];
