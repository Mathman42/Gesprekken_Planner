// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { writeFileSync } from "fs";
import { resolve } from "path";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    {
      name: "generate-headers",
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
        const distPath = resolve(__vite_injected_original_dirname, "dist", "_headers");
        writeFileSync(distPath, headersContent);
        console.log("Generated _headers file for Netlify");
      }
    }
  ],
  optimizeDeps: {
    exclude: ["lucide-react"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAge1xuICAgICAgbmFtZTogJ2dlbmVyYXRlLWhlYWRlcnMnLFxuICAgICAgY2xvc2VCdW5kbGUoKSB7XG4gICAgICAgIGNvbnN0IGhlYWRlcnNDb250ZW50ID0gYCMgQ2FjaGUgaGVhZGVycyBmb3Igb3B0aW1hbCBwZXJmb3JtYW5jZVxuIyBIVE1MIGZpbGVzIC0gbm8gY2FjaGUgKGFsd2F5cyBnZXQgbGF0ZXN0IHZlcnNpb24pXG4vaW5kZXguaHRtbFxuICBDYWNoZS1Db250cm9sOiBuby1jYWNoZSwgbm8tc3RvcmUsIG11c3QtcmV2YWxpZGF0ZVxuICBQcmFnbWE6IG5vLWNhY2hlXG4gIEV4cGlyZXM6IDBcblxuIyBKUyBhbmQgQ1NTIGZpbGVzIHdpdGggaGFzaCBpbiBmaWxlbmFtZSAtIGNhY2hlIGZvciAxIHllYXJcbi9hc3NldHMvKlxuICBDYWNoZS1Db250cm9sOiBwdWJsaWMsIG1heC1hZ2U9MzE1MzYwMDAsIGltbXV0YWJsZVxuXG4jIE90aGVyIHN0YXRpYyBhc3NldHMgLSBjYWNoZSBmb3IgMSB3ZWVrXG4vKlxuICBDYWNoZS1Db250cm9sOiBwdWJsaWMsIG1heC1hZ2U9NjA0ODAwXG5gO1xuICAgICAgICBjb25zdCBkaXN0UGF0aCA9IHJlc29sdmUoX19kaXJuYW1lLCAnZGlzdCcsICdfaGVhZGVycycpO1xuICAgICAgICB3cml0ZUZpbGVTeW5jKGRpc3RQYXRoLCBoZWFkZXJzQ29udGVudCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdHZW5lcmF0ZWQgX2hlYWRlcnMgZmlsZSBmb3IgTmV0bGlmeScpO1xuICAgICAgfSxcbiAgICB9LFxuICBdLFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBleGNsdWRlOiBbJ2x1Y2lkZS1yZWFjdCddLFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQW9CO0FBQ3RQLE9BQU8sV0FBVztBQUNsQixTQUFTLHFCQUFxQjtBQUM5QixTQUFTLGVBQWU7QUFIeEIsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ047QUFBQSxNQUNFLE1BQU07QUFBQSxNQUNOLGNBQWM7QUFDWixjQUFNLGlCQUFpQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFldkIsY0FBTSxXQUFXLFFBQVEsa0NBQVcsUUFBUSxVQUFVO0FBQ3RELHNCQUFjLFVBQVUsY0FBYztBQUN0QyxnQkFBUSxJQUFJLHFDQUFxQztBQUFBLE1BQ25EO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxjQUFjO0FBQUEsRUFDMUI7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
