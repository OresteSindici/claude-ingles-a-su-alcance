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
        name: "Manual Inglés a su Alcance",
        short_name: "Manual Inglés",
        description: "El método del TC Jairo Alberto Payán: 5 fórmulas y los 21 auxiliares.",
        lang: "es",
        theme_color: "#12171b",
        background_color: "#12171b",
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
        globPatterns: ["**/*.{js,css,html,png,svg}", "data/{course,quizzes,voice,homenaje}.json", "homenaje/*.jpg"],
        runtimeCaching: [
          { urlPattern: /\/data\/(lessons\/|search\.json|manual\.json)/, handler: "StaleWhileRevalidate",
            options: { cacheName: "lecciones" } },
          // Audio: Safari (iPhone) requests audio in byte ranges, so the cache must answer range requests.
          { urlPattern: /\/audio\/.*\.mp3$/, handler: "CacheFirst",
            options: { cacheName: "audio", rangeRequests: true, cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 250 } } },
          { urlPattern: /\/pages\//, handler: "CacheFirst",
            options: { cacheName: "contenido", expiration: { maxEntries: 600 } } },
          { urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//, handler: "StaleWhileRevalidate",
            options: { cacheName: "fuentes" } },
        ],
      },
    }),
  ],
});
