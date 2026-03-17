import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from 'dotenv';

export default defineConfig({
  plugins: [react()],
  define: {
    // Pass environment variables to the client
    'process.env': process.env,
  },
  server: {
    proxy: {
      "/api": "http://localhost:3001", // Proxy API requests to the local backend
    },
  },
});
