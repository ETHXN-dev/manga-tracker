import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Any request to /api/* in development gets forwarded to your Node server.
      // This is how you avoid CORS issues in dev without changing any code.
      // In production, your hosting provider handles routing instead.
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
