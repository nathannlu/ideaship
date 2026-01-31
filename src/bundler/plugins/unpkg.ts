import * as esbuild from 'esbuild-wasm';

// Cache for unpkg URL content to avoid repeated fetches
const moduleCache = new Map<string, { contents: string, timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minute cache TTL

// Clean up stale cache entries periodically
const cleanupModuleCache = () => {
  const now = Date.now();
  for (const [url, { timestamp }] of moduleCache.entries()) {
    if (now - timestamp > CACHE_TTL) {
      moduleCache.delete(url);
    }
  }
};

// Fetch with cache implementation
const fetchWithCache = async (url: string): Promise<string> => {
  // Clean up stale entries
  cleanupModuleCache();

  // Check cache first
  const cached = moduleCache.get(url);
  if (cached) {
    //console.log(`📦 Module cache hit: ${url.substring(0, 40)}...`);
    return cached.contents;
  }

  // Perform fetch if not in cache
  //console.log(`🔍 Fetching module: ${url.substring(0, 40)}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);

  const contents = await res.text();

  // Store in cache
  moduleCache.set(url, {
    contents,
    timestamp: Date.now()
  });

  return contents;
};

// This plugin resolves any import path that doesn't start with a dot or a slash
// to a CDN URL using the ESM.sh service.
//
// e.g. 
// ./App -> file system
// App -> https://esm.sh/App

export function unpkgPlugin(): esbuild.Plugin {
  return {
    name: "unpkg-path",
    setup(build) {
      const reactVer = "18.2.0";

      /* 1️⃣  bare specifiers (npm packages) */
      build.onResolve({ filter: /^[^./].*/ }, ({ path }) => {
        if (path.startsWith("@/")) return;                        // -> virtualFs
        if (path === "react")
          return { path: `https://esm.sh/react@${reactVer}`, namespace: "unpkg" };
        if (path === "react-dom/client")
          return {
            path: `https://esm.sh/react-dom@${reactVer}/client?external=react`,
            namespace: "unpkg",
          };
        if (path === "react/jsx-runtime")
          return {
            path: `https://esm.sh/react@${reactVer}/jsx-runtime?external=react`,
            namespace: "unpkg",
          };
        return { path: `https://esm.sh/${path}?external=react`, namespace: "unpkg" };
      });

      /* 2️⃣  root-relative imports that esm.sh emits (“/react@…” or “/dist/…”) */
      build.onResolve({ filter: /^\//, namespace: "unpkg" }, ({ path, importer }) => ({
        path: new URL(path, importer).href,                       // absolute URL next to importer
        namespace: "unpkg",
      }));

      /* 3️⃣  NEW:  “./something” or “../something” inside unpkg files */
      build.onResolve({ filter: /^\.\.?\//, namespace: "unpkg" }, ({ path, importer }) => ({
        path: new URL(path, importer).href,                       // resolve relative to importing file
        namespace: "unpkg",
      }));

      /* 4️⃣  loader that actually fetches every URL we just produced */
      build.onLoad({ filter: /.*/, namespace: "unpkg" }, async ({ path }) => {
        // Use our cached fetch implementation
        const contents = await fetchWithCache(path);

        // Determine the appropriate loader based on file extension
        let loader: esbuild.Loader = 'js';
        if (path.endsWith('.css')) loader = 'css';
        else if (path.endsWith('.json')) loader = 'json';
        else if (path.endsWith('.jsx')) loader = 'jsx';
        else if (path.endsWith('.tsx')) loader = 'tsx';
        else if (path.endsWith('.ts')) loader = 'ts';

        return { contents, loader };
      });
    },
  };
}
