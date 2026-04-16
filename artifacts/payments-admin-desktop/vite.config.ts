import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const API_TARGET = process.env.API_URL || "https://shinobi-iga-ryu-production.up.railway.app";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 1420,
    strictPort: true,
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: "localhost",
        configure: (proxy) => {
          // Rewrite Set-Cookie headers so Safari accepts them on localhost
          proxy.on("proxyRes", (proxyRes) => {
            const setCookie = proxyRes.headers["set-cookie"];
            if (setCookie) {
              proxyRes.headers["set-cookie"] = setCookie.map((cookie) =>
                cookie
                  .replace(/;\s*Secure/gi, "")           // Remove Secure (localhost is not HTTPS)
                  .replace(/;\s*SameSite=\w+/gi, "; SameSite=Lax")  // Ensure Lax for same-origin
              );
            }
          });
        },
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
