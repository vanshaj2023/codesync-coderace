import rateLimit from "express-rate-limit";

import userRoutes from "./routes/user.route.js";
import codeRoutes from "./routes/code.route.js";
import aiRoutes from "./routes/ai.route.js";
import { handleSocketConnection } from "./controllers/socket.controller.js";
import { setIo } from "./utils/io.js";
import { initCronJobs } from "./cron/testCaseGenerator.js";

// ─── Rate Limiters ────────────────────────────────────────────────────────────
// Code execution: max 15 submissions per minute per IP
const codeExecutionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many submissions. Please wait a moment before trying again." },
});

// AI review: max 5 reviews per minute per IP (Gemini quota protection)
const aiReviewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "🏎️ Pit stop! Too many AI requests. Please wait 60 seconds." },
});

// General API: 100 requests per minute per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

/**
 * Mounts CodeRace: its REST routes under `/api` and the multiplayer race logic on
 * the `/race` Socket.IO namespace, so its rooms never mix with CodeSync's.
 */
export const mountCodeRace = ({ app, io }) => {
  const namespace = io.of("/race");

  // Controllers emit through this singleton, so it must point at the race namespace.
  setIo(namespace);
  namespace.on("connection", (socket) => handleSocketConnection(namespace, socket));

  app.use("/api/code", codeExecutionLimiter, codeRoutes);
  app.use("/api/users", generalLimiter, userRoutes);
  app.use("/api/ai", aiReviewLimiter, aiRoutes);

  initCronJobs();
};
