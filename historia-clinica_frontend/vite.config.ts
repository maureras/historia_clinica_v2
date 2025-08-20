// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173, // opcional
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        // si tu backend NO usa /api al inicio del path, podrías reescribirlo:
        // rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
