import { GitMerge, MousePointer2, Save, Terminal, Undo2, WifiOff } from "lucide-react";

export const FEATURES = [
  {
    icon: MousePointer2,
    title: "Live cursors and name tags",
    text: "See exactly where everyone is working. Each person gets their own color and name tag, and their selections are highlighted in your editor.",
  },
  {
    icon: GitMerge,
    title: "Edits that never collide",
    text: "Type at the same time, even on the same line. Changes merge automatically, so nobody's work is overwritten or lost.",
  },
  {
    icon: Terminal,
    title: "Run code together",
    text: "Pick a language and run. The output shows up in a shared console, so the whole room reads the same result at the same moment.",
  },
  {
    icon: Save,
    title: "Rooms that remember",
    text: "When the last person leaves, the room is saved. Come back with the same room ID and pick up exactly where you stopped.",
  },
  {
    icon: WifiOff,
    title: "Survives a bad connection",
    text: "Lose your connection and keep typing. Your changes merge back in when you reconnect, and your cursor reappears for everyone.",
  },
  {
    icon: Undo2,
    title: "Undo that is yours",
    text: "Undo only reverts your own edits. It never reaches into a teammate's work, however busy the file gets.",
  },
];

export const LANGUAGES = [
  "C",
  "C++",
  "C#",
  "Java",
  "Python",
  "JavaScript",
  "Ruby",
  "Go",
  "Rust",
  "Swift",
  "PHP",
  "Scala",
  "Bash",
  "SQL",
  "Pascal",
  "R",
];

export const STEPS = [
  {
    title: "Create or join a room",
    text: "Generate a new room ID, or enter the one you were sent, then choose the name your teammates will see.",
  },
  {
    title: "Share the room ID",
    text: "Copy the ID from the sidebar and send it to your team. They join from any browser, with nothing to install.",
  },
  {
    title: "Code together",
    text: "Type at the same time, choose a language, run the code, and read the shared output as a group.",
  },
];

export const USE_CASES = [
  {
    title: "Pair programming",
    text: "Work through a problem in one file instead of passing snippets back and forth.",
  },
  {
    title: "Interviews",
    text: "Watch a candidate think in real time, then run their solution together.",
  },
  {
    title: "Teaching",
    text: "Write and run examples live while students follow along, cursor by cursor.",
  },
  {
    title: "Hack nights",
    text: "Spin up a room in seconds and build together without any setup.",
  },
];
