// features/editor/codeTransforms/deleteElement.ts
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';

const JSX_PLUGINS = ['jsx', 'typescript'];

/** Remove the JSX node (and enclosing Link/a if button) with given `data-id`. */
export function deleteElement(
  files: Record<string, string>,
  id: string,
): Record<string, string> | null {
  for (const [fname, src] of Object.entries(files)) {
    if (!fname.match(/\.(jsx?|tsx?)$/)) continue;

    const ast = parse(src, { sourceType: 'module', plugins: JSX_PLUGINS });
    let removed = false;

    traverse(ast, {
      JSXElement(path) {
        if (removed) return;
        const open = path.node.openingElement;
        if (!hasId(open, id)) return;

        let deletePath = path;
        /* if it's a button, drop its Link/a wrapper too */
        const tag = (open.name as t.JSXIdentifier).name;
        if (['button', 'Button'].includes(tag)) {
          const parent = path.parentPath;
          if (
            parent.isJSXElement() &&
            ['Link', 'a'].includes(
              ((parent.node.openingElement.name as t.JSXIdentifier).name),
            )
          ) {
            deletePath = parent;
          }
        }
        deletePath.remove();
        removed = true;
      },
    });

    if (!removed) continue;
    return { ...files, [fname]: generate(ast, { retainLines: true }).code };
  }
  return null;
}

function hasId(el: t.JSXOpeningElement, id: string) {
  return el.attributes.some(
    (a) =>
      t.isJSXAttribute(a) &&
      t.isJSXIdentifier(a.name, { name: 'data-id' }) &&
      t.isStringLiteral(a.value) &&
      a.value.value === id,
  );
}