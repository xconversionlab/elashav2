import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'https://deno.land/std@0.168.0/http/server.ts': fileURLToPath(new URL('./tests/mocks/deno-server.ts', import.meta.url)),
      'https://esm.sh/@supabase/supabase-js@2': fileURLToPath(new URL('./tests/mocks/supabase-js.ts', import.meta.url)),
      'https://deno.land/x/hmac@v2.0.1/mod.ts': fileURLToPath(new URL('./tests/mocks/deno-hmac.ts', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
