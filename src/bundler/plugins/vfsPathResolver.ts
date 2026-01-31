import * as esbuild from 'esbuild-wasm';

// Mutable map of virtual files, updated per build via setVirtualFsFiles
let fsMap: Record<string, string> = {};

/**
 * Update the virtual file map used by the plugin.
 * Should be called before each build with the latest files.
 */
export function setVirtualFsFiles(fs: Record<string, string>) {
  fsMap = fs;
}

export function virtualFs(): esbuild.Plugin {
  const tryExtensions = ['.tsx', '.ts', '.jsx', '.js', '.css', '.json'];

  /** Pick the right esbuild loader based on file extension */
  const getLoader = (path: string): esbuild.Loader => {
    if (path.endsWith('.tsx'))  return 'tsx';
    if (path.endsWith('.ts'))   return 'ts';
    if (path.endsWith('.jsx'))  return 'jsx';
    if (path.endsWith('.js'))   return 'js';
    if (path.endsWith('.css'))  return 'css';
    if (path.endsWith('.json')) return 'json';
    return 'file'; // fallback
  };

  return {
    name: 'virtual-fs',
    setup(build) {
      /* Absolute imports like "/App.tsx" */
      build.onResolve({ filter: /^\/.*$/ }, args => ({
        path: args.path,
        namespace: 'vfs',
      }));

      /* "@/..." alias → "/src/..." */
      build.onResolve({ filter: /^@\/.*/ }, args => {
        const full = '/src' + args.path.slice(1); // replace @ with /src
        for (const ext of tryExtensions) {
          if (fsMap[full + ext]) {
            return { path: full + ext, namespace: 'vfs' };
          }
        }
        return { path: full, namespace: 'vfs' };
      });

      /* Relative imports like "./App" */
      build.onResolve({ filter: /^\.+\// }, args => {
        const full = new URL(args.path, 'vfs:' + args.resolveDir + '/').pathname;
        for (const ext of tryExtensions) {
          if (fsMap[full + ext]) {
            return { path: full + ext, namespace: 'vfs' };
          }
        }
        return { path: full, namespace: 'vfs' };
      });

      /* ⛔️ Ignore CSS safely in browser */
      build.onLoad({ filter: /\.css$/, namespace: 'vfs' }, args => {
        return {
          contents: '',      // no-op
          loader: 'css',     // required so esbuild doesn't crash
        };
      });

      /* Load other files from virtual fs */
      build.onLoad({ filter: /.*/, namespace: 'vfs' }, args => {
        const raw = fsMap[args.path];
        if (raw == null) {
          return { errors: [{ text: `File not found: ${args.path}` }] };
        }
        const versioned = raw + `\n// v=${Date.now()}`;

        const lastSlash = args.path.lastIndexOf('/');
        const resolveDir = lastSlash > 0 ? args.path.slice(0, lastSlash) : '/';

        return {
          contents: versioned,
          loader: getLoader(args.path),
          resolveDir,
        };
      });
    },
  };
}
