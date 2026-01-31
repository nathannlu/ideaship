"use client"

// @ts-nocheck
import * as esbuild from 'esbuild-wasm';
import { virtualFs, setVirtualFsFiles } from './plugins/vfsPathResolver';
import { unpkgPlugin } from './plugins/unpkg';

// This file takes in a file object, and bundles it into a single HTML file

const wasmURL = 'https://unpkg.com/esbuild-wasm@0.25.3/esbuild.wasm';

// Track esbuild initialization to avoid multiple initialize calls per session
let isEsbuildInitialized = false;
let initializeEsbuildPromise: Promise<void> | null = null;

// Start initializing esbuild as soon as this module loads (only in browser)
// This gives us a head start on initialization
if (typeof window !== 'undefined') {
  initializeEsbuildPromise = esbuild.initialize({
    wasmURL,
    worker: true,
  }).then(() => {
    console.log("Early esbuild initialization complete");
    isEsbuildInitialized = true;
  }).catch((error) => {
    console.warn("Early esbuild initialization failed:", error);
    initializeEsbuildPromise = null;
  });
} else {
  // On server, skip WASM initialization
  initializeEsbuildPromise = null;
}

// Persistent build context for incremental builds
let buildContext: esbuild.BuildContext | null = null;

// Cache for file hashes to detect changes
let prevFilesHash = '';

// Global flag to avoid duplicate bundling on initial page load
let isBundleRunning = false;
let hasProcessedInitialBundle = false;

// Cache for unpkg plugin and virtualFs plugin instances
let cachedUnpkgPlugin: esbuild.Plugin | null = null;
let cachedVirtualFsPlugin: esbuild.Plugin | null = null;
let cachedVirtualFsFiles: string | null = null;

// Cache for built bundles to quickly serve identical builds
const bundleCache = new Map<string, { bundledJs: string, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL


// Fast simple hash function for strings
// This is much faster than using crypto hashing for our use case
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash >>> 0; // Convert to unsigned
};

// Faster hash computation that focuses only on key files
// This significantly reduces the time to compute the hash
const computeFilesHash = (files: Record<string, string>): string => {
  // Essential files that always need to be tracked
  const mainFiles = ['/src/main.tsx', '/src/App.tsx'];

  // Track a maximum of 5 files with likely style changes
  const styleFiles: string[] = [];
  const fileEntries = Object.entries(files);

  for (let i = 0; i < fileEntries.length && styleFiles.length < 5; i++) {
    const [path, content] = fileEntries[i];
    // Only include visual files that affect rendering
    if (
      (path.endsWith('.tsx') || path.endsWith('.jsx') || path.endsWith('.css')) &&
      (content.includes('style') || content.includes('color') || content.includes('background'))
    ) {
      styleFiles.push(path);
    }
  }

  // Combine the files
  let result = '';

  // Add main files
  for (const path of mainFiles) {
    if (files[path]) {
      result += path + ':' + files[path].length + '|';
    }
  }

  // Add style files with content hash
  for (const path of styleFiles) {
    if (files[path]) {
      // Use simpleHash instead of full content for better performance
      result += path + ':' + simpleHash(files[path]) + '|';
    }
  }

  return result;
};

// Memoized version of the unpkgPlugin to avoid recreating it
const getMemoizedUnpkgPlugin = (): esbuild.Plugin => {
  if (!cachedUnpkgPlugin) {
    cachedUnpkgPlugin = unpkgPlugin();
  }
  return cachedUnpkgPlugin;
};

// Memoized version of the virtualFs plugin that only recreates when files change
const getMemoizedVirtualFsPlugin = (files: Record<string, string>, forceRefresh = false): esbuild.Plugin => {
  const filesHash = computeFilesHash(files);
  if (!cachedVirtualFsPlugin || cachedVirtualFsFiles !== filesHash || forceRefresh) {
    console.log("Creating new virtualFs plugin instance");
    cachedVirtualFsPlugin = virtualFs(files);
    cachedVirtualFsFiles = filesHash;
  }
  return cachedVirtualFsPlugin;
};

// Clean up stale cache entries
const cleanupCache = () => {
  const now = Date.now();
  for (const [hash, { timestamp }] of bundleCache.entries()) {
    if (now - timestamp > CACHE_TTL) {
      bundleCache.delete(hash);
    }
  }
};

export const bundleReactFilesIntoIframe = async ({
  files,
  forceRefresh = false,
  isProduction = false
}): Promise<Blob> => {
  // In production, alias BrowserRouter as MemoryRouter via import override
  if (isProduction && files['/src/App.tsx']) {
    let appSource = files['/src/App.tsx'];
    // Replace import: alias BrowserRouter to MemoryRouter, leave JSX tags unchanged
    appSource = appSource.replace(
      /import\s*\{([^}]*)\}\s*from\s*['"]react-router-dom['"];?/,  
      (_, specifiers) => {
        const items = specifiers
          .split(',')
          .map(s => {
            const t = s.trim();
            return t === 'MemoryRouter'
              ? 'BrowserRouter as MemoryRouter'
              : t;
          })
          .join(', ');
        return `import { ${items} } from 'react-router-dom';`;
      }
    );
    files['/src/App.tsx'] = appSource;
  }
  // Update virtualFs plugin with the latest files map
  setVirtualFsFiles(files);
  // Check if we're already bundling - if so, return a cached result or wait
  if (isBundleRunning && !forceRefresh && !isProduction) {
    console.log("🔄 Bundle already in progress, returning cached or pending result");

    // Wait for the existing bundle operation to complete
    while (isBundleRunning) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // If we have a cached bundle, use it
    const cachedBundle = bundleCache.get(computeFilesHash(files));
    if (cachedBundle) {
      return generateHtml(cachedBundle.bundledJs);
    }
  }

  // If this is the initial load and we've already processed once, skip duplicate runs
  if (!forceRefresh && hasProcessedInitialBundle && !isProduction) {
    const cachedBundle = bundleCache.get(computeFilesHash(files));
    if (cachedBundle) {
      console.log("🚀 Using cached bundle from initial load");
      return generateHtml(cachedBundle.bundledJs);
    }
  }

  // Set flag to indicate we're bundling
  isBundleRunning = true;

  const startTime = performance.now();
  try {
    // Compute hash for caching
    //const filesHash = computeFilesHash(files);

    // Check cache first, unless forceRefresh is true
    if (isProduction) {
      console.log("📦 Production build requested, creating optimized bundle");
      // For production builds, always create a fresh context
      if (buildContext) {
        await buildContext.dispose();
        buildContext = null;
      }
    } else if (forceRefresh) {
      console.log("🔄 Force refresh requested, using incremental rebuild");
      // For normal force refresh, we don't need to dispose the context
      // Just let the incremental build handle it for speed
    }

    // Wait for esbuild initialization to complete
    // We already started this in the global scope, so this should complete quickly
    if (!isEsbuildInitialized && initializeEsbuildPromise) {
      console.log("Waiting for esbuild initialization...");
      await initializeEsbuildPromise;
    } else if (!isEsbuildInitialized) {
      // If initialization failed earlier, retry once
      console.log("Retrying esbuild initialization");
      initializeEsbuildPromise = esbuild.initialize({
        wasmURL,
        worker: true,
      }).then(() => {
        isEsbuildInitialized = true;
      }).catch((error) => {
        initializeEsbuildPromise = null;
        throw error;
      });

      await initializeEsbuildPromise;
    }

    let bundledJs: string;

    // Use incremental builds with context if possible
    if (buildContext) {
      // If files haven't changed, we can just rebuild with the same context
      console.log("🔄 Using incremental rebuild");
      const { outputFiles } = await buildContext.rebuild();
      bundledJs = outputFiles[0].text;
    } else {
      // Files changed or first build, create/recreate context
      if (buildContext) {
        // Dispose previous context
        await buildContext.dispose();
        buildContext = null;
      }

      console.log("🏗️ Creating new build context");

      // Create new build context with optimized settings
      buildContext = await esbuild.context({
        entryPoints: ['/src/main.tsx'],
        bundle: true,
        write: false,
        format: 'esm',
        jsx: 'automatic',
        // Only minify for production builds (like deployment to S3)
        minify: isProduction,
        // Performance optimizations
        treeShaking: true,
        jsxDev: false,
        logLevel: 'error',
        metafile: false,
        legalComments: 'none',
        ignoreAnnotations: true,
        target: ['es2020'],
        // Use memoized plugins
        plugins: [
          getMemoizedUnpkgPlugin(),
          virtualFs(),
          // getMemoizedVirtualFsPlugin(files, forceRefresh)
        ],
        sourcemap: false,
        // Define environment variables to skip unnecessary code
        define: {
          'process.env.NODE_ENV': isProduction ? '"production"' : '"development"',
          'global': 'window',
          'process.browser': 'true',
        },
      });

      const { outputFiles } = await buildContext.rebuild();
      bundledJs = outputFiles[0].text;

      // Update file hash cache
      //prevFilesHash = filesHash;
    }

    console.log(`✅ Done bundling (${Math.round(performance.now() - startTime)}ms)`);

    // Mark that we've successfully processed at least one bundle
    hasProcessedInitialBundle = true;

    // Reset the bundling flag
    isBundleRunning = false;


    return generateHtml(bundledJs);
  } catch (error) {
    // Use warn to avoid Next.js console.error interception and overlay, error will be handled by IframePreview
    console.warn('Error during bundling:', error);

    // Reset the bundling flag even on error
    isBundleRunning = false;

    throw error;
  }
};

// Precompute static parts of the HTML template for better performance
const HTML_TEMPLATE_START = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/whammy@0.0.3/whammy.js"></script>
    <style>
      .bg-background { background-color: white; }
      body { margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">`;

const HTML_TEMPLATE_END = `
      console.log('🔍 Running bundle');
    </script>
    <script src="https://unpkg.com/lucide@0.509.0/dist/umd/lucide.js"></script>
    <script>
      // Wait until #root is populated, then run lucide.createIcons
      const root = document.getElementById('root');
      const observer = new MutationObserver((mutations, obs) => {
        if (root.innerHTML.trim().length > 0) {
          console.log('✅ Detected populated #root, running Lucide');
          lucide.createIcons({ icons: lucide.icons });
          obs.disconnect();
        }
      });
      observer.observe(root, { childList: true, subtree: true });
    </script>
  </body>
</html>`;

// Helper to generate the HTML blob from bundled JS - optimized version
const generateHtml = (bundledJs: string): Blob => {
  // Faster concatenation than using template literals
  const htmlParts = [HTML_TEMPLATE_START, bundledJs, HTML_TEMPLATE_END];

  return new Blob(htmlParts, { type: 'text/html' });
};

