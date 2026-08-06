import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    assetsDir: ".", // keep everything flat in dist/ (no dist/assets/ subfolder) — makes phone-only uploads to GitHub/Netlify far easier, since mobile file pickers handle "select multiple files in one flat folder" much better than nested folders
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "Sparks of Ember — AI Dungeon Master",
        short_name: "Sparks",
        description: "A free, AI-chronicled D&D adventure powered by Google's Gemini API.",
        theme_color: "#0d0b0e",
        background_color: "#0d0b0e",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }
    })
  ]
});
