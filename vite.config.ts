import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // All requests that start with /api go to FastAPI
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
        // If your backend doesn't have /api prefix, uncomment:
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
