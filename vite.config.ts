// vite.config.ts  (root)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/ALBUMART_GPT/",   //  MUST match repo name exactly, incl. case
});
