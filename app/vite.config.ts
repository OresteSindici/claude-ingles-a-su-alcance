import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/apple-touch-icon.png"],
      manifest: {
        name: "Inglés a su Alcance",
        short_name: "Inglés",
        description: "El método del TC Jairo Alberto Payán: 5 fórmulas y los 21 auxiliares.",
        lang: "es",
        theme_color: "#081629",
        background_color: "#081629",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App shell + course data are precached; page images and audio are cached as they are used.
        globPatterns: ["**/*.{js,css,html,png,svg}", "data/*.json", "homenaje/*.jpg"],
        runtimeCaching: [
          { urlPattern: /\/(pages|audio)\//, handler: "CacheFirst",
            options: { cacheName: "contenido", expiration: { maxEntries: 600 } } },
          { urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//, handler: "StaleWhileRevalidate",
            options: { cacheName: "fuentes" } },
        ],
      },
    }),
  ],
});
