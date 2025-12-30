import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Target modern browsers to eliminate legacy polyfills
    target: 'es2020',
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React - smallest possible initial chunk
          'vendor-react': ['react', 'react-dom'],
          // Router loaded immediately after
          'vendor-router': ['react-router-dom'],
          // UI components - loaded on demand
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip', '@radix-ui/react-tabs'],
          // Query - deferred
          'vendor-query': ['@tanstack/react-query'],
          // Supabase - deferred
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Minification settings
    minify: 'esbuild',
    // CSS code splitting
    cssCodeSplit: true,
  },
  // Optimize deps
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
}));
