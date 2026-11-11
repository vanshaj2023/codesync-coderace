import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  // Served by the shared server under /coderace, next to the landing page and CodeSync.
  base: "/coderace/",
  plugins: [react(), tailwindcss()],
});
