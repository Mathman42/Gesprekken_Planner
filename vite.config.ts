import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'generate-headers',
      closeBundle() {
        const headersContent = `# Cache headers for optimal performance
# HTML files - no cache (always get latest version)
/index.html
  Cache-Control: no-cache, no-store, must-revalidate
  Pragma: no-cache
  Expires: 0

# JS and CSS files with hash in filename - cache for 1 year
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# Other static assets - cache for 1 week
/*
  Cache-Control: public, max-age=604800
`;
        const distPath = resolve(__dirname, 'dist', '_headers');
        writeFileSync(distPath, headersContent);
        console.log('Generated _headers file for Netlify');
      },
    },
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
