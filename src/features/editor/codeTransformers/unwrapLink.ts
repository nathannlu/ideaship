// features/editor/codeTransforms/unwrapLink.ts
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';

const JSX_PLUGINS = ['jsx', 'typescript'];

/** Remove a `<Link>`/`<a>` wrapper around the button with `data-id`. */
export function unwrapLink(
  files: Record<string, string>,
  id: string,
): Record<string, string> | null {
  let modified = false;
  const newFiles = { ...files };

  for (const [fname, src] of Object.entries(files)) {
    if (!fname.match(/\.(jsx?|tsx?)$/)) continue;

    const ast = parse(src, { sourceType: 'module', plugins: JSX_PLUGINS });
    let fileModified = false;

    traverse(ast, {
      JSXElement(path) {
        if (fileModified) return;
        const open = path.node.openingElement;
        const tag = (open.name as t.JSXIdentifier).name;
        if (tag !== 'Link' && tag !== 'a') return;

        const btnChild = path.node.children.find(
          (c) =>
            t.isJSXElement(c) &&
            ['button', 'Button'].includes(
              ((c.openingElement.name as t.JSXIdentifier).name),
            ) &&
            c.openingElement.attributes.some(
              (a) =>
                t.isJSXAttribute(a) &&
                t.isJSXIdentifier(a.name, { name: 'data-id' }) &&
                t.isStringLiteral(a.value) &&
                a.value.value === id,
            ),
        ) as t.JSXElement | undefined;

        if (!btnChild) return;

        path.replaceWith(btnChild);
        fileModified = true;
        modified = true;
        path.stop();
      },
    });

    if (fileModified) {
      removeUnusedLinkImport(ast);
      newFiles[fname] = generate(ast, { retainLines: true }).code;
    }
  }

  return modified ? newFiles : null;
}

/* ---------- helpers -------------------------------------------------- */

function removeUnusedLinkImport(ast: t.File) {
  traverse(ast, {
    ImportDeclaration(p) {
      if (p.node.source.value !== 'react-router-dom') return;
      p.node.specifiers = p.node.specifiers.filter(
        (s) =>
          !(
            t.isImportSpecifier(s) &&
            t.isIdentifier(s.imported, { name: 'Link' })
          ),
      );
      if (p.node.specifiers.length === 0) p.remove();
    },
  });
}