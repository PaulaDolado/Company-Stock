import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  // GitHub Pages sirve este proyecto en una subruta (github.io/Company-Stock/,
  // no en la raíz del dominio), así que los assets necesitan esa ruta base.
  // Solo se activa en el build de CI (ver .github/workflows/deploy.yml); el
  // resto de hostings estáticos (Netlify, Vercel...) siguen sirviendo desde
  // la raíz sin tocar nada.
  base: process.env.GITHUB_PAGES ? "/Company-Stock/" : "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
