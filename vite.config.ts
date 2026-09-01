import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
import type { Plugin, UserConfig } from "vite";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

function keepOnViteDevServer(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/install") ||
    pathname.startsWith("/terminal") ||
    pathname.startsWith("/manage") ||
    pathname.startsWith("/src") ||
    pathname.startsWith("/node_modules") ||
    pathname.startsWith("/@") ||
    pathname.startsWith("/__vite") ||
    pathname.startsWith("/system-assets") ||
    pathname.startsWith("/assets/flags") ||
    pathname.startsWith("/assets/logo") ||
    pathname.startsWith("/assets/pwa-icon") ||
    pathname.startsWith("/assets/lite-card-background-v4") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/themes")
  );
}

function litePublicDashboardProxy(apiTarget: string): Plugin {
  return {
    name: "lite-public-dashboard-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url || "/").split("?")[0];
        if (keepOnViteDevServer(pathname)) {
          next();
          return;
        }
        const target = new URL(apiTarget);
        const upstream = http.request(
          {
            protocol: target.protocol,
            hostname: target.hostname,
            port: target.port || (target.protocol === "https:" ? "443" : "80"),
            path: req.url,
            method: req.method,
            headers: { ...req.headers, host: target.host },
          },
          (up) => {
            res.writeHead(up.statusCode ?? 502, up.headers);
            up.pipe(res);
          },
        );
        upstream.on("error", (error) => {
          res.statusCode = 502;
          res.end(String(error));
        });
        req.pipe(upstream);
      });
    },
  };
}

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const buildTime = new Date().toISOString();
  const systemUiBuild = mode !== "development" && process.env.VITE_SYSTEM_UI_BUILD !== "0";

  // Production builds are embedded into Lite. An explicit opt-out is required
  // for a standalone root-path build.
  const base: string = process.env.VITE_BASE_URL
    ? process.env.VITE_BASE_URL
    : systemUiBuild
      ? "/system-assets/"
      : "/";
  const baseConfig: UserConfig = {
    base: base,
    plugins: [
      react(),
      tailwindcss(),
      ...(systemUiBuild ? [] : [VitePWA({
        registerType: "autoUpdate",
        includeManifestIcons: false,
        manifest: {
          name: "Lite",
          short_name: "Lite",
          description: "All your servers, one simple view.",
          theme_color: "#2563eb",
          background_color: "#ffffff",
          display: "standalone",
          scope: base,
          start_url: base,
          icons: [
            {
              src: `${base}assets/pwa-icon.png`,
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable any",
            },
            {
              src: `${base}assets/pwa-icon.png`,
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable any",
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          // HTML is rendered by Lite so it can inject the current site
          // title and custom Head/Body content. Precaching the build-time
          // index would bypass that server-side rendering.
          globPatterns: ["**/*.{js,css,ico,png,svg}"],
          // The public document is selected by Lite at request time. A
          // cached SPA fallback would keep serving the previous theme after
          // an administrator switches themes.
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\./i,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      })]),
      ...(process.env.ANALYZE === "1"
        ? [visualizer({
            open: false,
            filename: "bundle-analysis.html",
            gzipSize: true,
            brotliSize: true,
          })]
        : []),
    ],
    define: {
      __BUILD_TIME__: JSON.stringify(buildTime),
    },
    resolve: {
      alias: [
        { find: "@", replacement: path.resolve(configDir, "./src") },
        // Force xterm to use the CJS build to avoid a rollup bug where `||=` in
        // xterm.mjs is incorrectly lowered to `void 0||(i={})` with an undeclared `i`,
        // causing `ReferenceError: i is not defined` at requestMode when vi sends DECRQM sequences.
        // Regex to match only the bare specifier, not subpaths like @xterm/xterm/css/xterm.css.
        { find: /^@xterm\/xterm$/, replacement: path.resolve(configDir, "node_modules/@xterm/xterm/lib/xterm.js") },
      ],
    },
    build: {
      assetsDir: "assets",
      outDir: "dist",
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          // go embed ignore files start with '_'
          chunkFileNames: "assets/chunk-[name]-[hash].js",
          entryFileNames: "assets/entry-[name]-[hash].js",
          // Do not use manualChunks, use React.lazy() and <Suspense> instead
        }
      },
    },
  };

  if (mode === "development") {
    const envPath = path.resolve(process.cwd(), ".env.development");
    if (fs.existsSync(envPath)) {
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      for (const k in envConfig) {
        process.env[k] = envConfig[k];
      }
    }
    const apiTarget = process.env.VITE_API_TARGET || "http://127.0.0.1:27777";
    process.env.VITE_API_TARGET = apiTarget;
    const apiOrigin = new URL(apiTarget).origin;
    const proxy = {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        rewriteWsOrigin: true,
        ws: true,
        headers: {
          Origin: apiOrigin,
        },
      },
      "/themes": {
        target: apiTarget,
        changeOrigin: true,
      },
      "/server": {
        target: apiTarget,
        changeOrigin: true,
      },
    };
    baseConfig.plugins = [
      ...(baseConfig.plugins ?? []),
      litePublicDashboardProxy(apiTarget),
    ];
    baseConfig.server = {
      host: "127.0.0.1",
      port: 5273,
      strictPort: true,
      proxy,
    };
    baseConfig.preview = {
      proxy: {
        ...proxy,
      },
    };
  }

  return baseConfig;
});
