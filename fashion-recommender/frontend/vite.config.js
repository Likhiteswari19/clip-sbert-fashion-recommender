
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // GitHub Pages deployment path
  base: "/clip-sbert-fashion-recommender/",

  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true },
      "/images": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
});
