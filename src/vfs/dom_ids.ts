// addIdsToJsx.ts
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { DOM_ID_TAGS } from "@/constants";



/**
 * Injects data‑id attributes (h1‑0, h1‑1, …) into
 * h1/h2/h3/p/img tags that don't have one yet.
 */
export function addIdsToFiles(fs: Record<string, string>): Record<string, string> {
  const updatedFs: Record<string, string> = {};
  const validExtensions = ['.tsx', '.jsx', '.ts', '.js'];
  const idTags = DOM_ID_TAGS

  for (const [path, code] of Object.entries(fs)) {
    const isJsx = validExtensions.some(ext => path.endsWith(ext));
    if (!isJsx) {
      updatedFs[path] = code;
      continue;
    }

    try {
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      });

      traverse(ast, {
        JSXOpeningElement(path) {
          const namePath = path.get('name');
          if (!namePath.isJSXIdentifier()) return;

          const tag = namePath.node.name;
          if (!idTags.includes(tag)) return;

          const hasId = path.node.attributes.some(
            attr =>
              t.isJSXAttribute(attr) &&
              t.isJSXIdentifier(attr.name) &&
              attr.name.name === 'data-id'
          );

          if (hasId) return;

          const randomId = `${tag}-${Math.floor(Math.random() * 10000)}`;
          path.node.attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier('data-id'),
              t.stringLiteral(randomId)
            )
          );
        },
      });

      const output = generate(ast, { retainLines: true }).code;
      updatedFs[path] = output;
    } catch (err) {
      console.error(`Failed to parse ${path}:`, err);
      updatedFs[path] = code; // fallback to original if parse fails
    }
  }

  return updatedFs;
}
