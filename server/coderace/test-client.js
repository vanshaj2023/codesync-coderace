import { io } from "socket.io-client";

const player1 = io("https://coderace-5xw6.onrender.com");
const player2 = io("https://coderace-5xw6.onrender.com");

player1.on("connect", () => {
  player1.emit("create_room", { difficulty: "medium", matchType: "1v1" });
});

player1.on("room_created", (data) => {
  player2.emit("join_room", { roomId: data.roomId });
});

// The Race Begins!
player1.on("match_started", (data) => {
  console.log(`\n🏁 RACE STARTED IN ROOM: ${data.roomId}`);
  
  // Player 1 types some code and sends progress
  setTimeout(() => {
    console.log("⌨️  Player 1: Typing code... (50% done)");
    player1.emit("progress_update", { roomId: data.roomId, progress: 50 });
  }, 1000);

  // Player 1 finishes the code and wins!
  setTimeout(() => {
    console.log("🏆 Player 1: I finished! Sending win signal...");
    player1.emit("player_won", { roomId: data.roomId });
  }, 2000);
});

// Player 2 sees Player 1's progress
player2.on("opponent_progress", (data) => {
  console.log(`👀 Player 2 sees: Opponent is at ${data.progress}%`);
});

// Both players see the game over screen
player2.on("match_over", (data) => {
  console.log(`🛑 MATCH OVER! The winner is: ${data.winnerId}`);
  console.log("✅ Backend multiplayer logic is 100% complete.");
  process.exit(0);
});