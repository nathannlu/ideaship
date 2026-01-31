// features/editor/codeTransforms/convertButtonToLink.ts
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';

const JSX_PLUGINS = ['jsx', 'typescript'];

/** Wrap the button with `data-id` in a `<Link to={url}>` … and add import if needed. */
export function convertButtonToLink(
  files: Record<string, string>,
  id: string,
  url: string,
): Record<string, string> | null {
  for (const [fname, src] of Object.entries(files)) {
    if (!fname.match(/\.(jsx?|tsx?)$/)) continue;

    const ast = parse(src, { sourceType: 'module', plugins: JSX_PLUGINS });
    let mutated = false;
    let linkImportExists = false;

    traverse(ast, {
      ImportDeclaration(p) {
        if (p.node.source.value === 'react-router-dom')
          linkImportExists = p.node.specifiers.some(
            (s) =>
              t.isImportSpecifier(s) &&
              t.isIdentifier(s.imported, { name: 'Link' }),
          );
      },
    });

    traverse(ast, {
      JSXElement(path) {
        if (mutated) return;
        const open = path.node.openingElement;
        const tag = (open.name as t.JSXIdentifier).name;
        if (!['button', 'Button'].includes(tag)) return;
        if (!hasId(open, id)) return;

        /* already inside a Link/a? just update href/to ---------------- */
        const parent = path.parentPath;
        if (
          parent.isJSXElement() &&
          ['Link', 'a'].includes(
            ((parent.node.openingElement.name as t.JSXIdentifier).name),
          )
        ) {
          setOrAddAttr(
            parent.node.openingElement,
            parent.node.openingElement.name.name === 'Link' ? 'to' : 'href',
            url,
          );
          mutated = true;
          return;
        }

        /* otherwise wrap the button ---------------------------------- */
        const wrapper = t.jsxElement(
          t.jsxOpeningElement(
            t.jsxIdentifier('Link'),
            [t.jsxAttribute(t.jsxIdentifier('to'), t.stringLiteral(url))],
            false,
          ),
          t.jsxClosingElement(t.jsxIdentifier('Link')),
          [path.node],
        );
        path.replaceWith(wrapper);
        mutated = true;
      },
    });

    if (!mutated) continue;

    if (!linkImportExists) addLinkImport(ast);
    return { ...files, [fname]: generate(ast, { retainLines: true }).code };
  }
  return null;
}

/* ---------- helpers -------------------------------------------------- */

function hasId(el: t.JSXOpeningElement, id: string) {
  return el.attributes.some(
    (a) =>
      t.isJSXAttribute(a) &&
      t.isJSXIdentifier(a.name, { name: 'data-id' }) &&
      t.isStringLiteral(a.value) &&
      a.value.value === id,
  );
}

function setOrAddAttr(el: t.JSXOpeningElement, name: string, val: string) {
  const attr = el.attributes.find(
    (a) => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name, { name }),
  ) as t.JSXAttribute | undefined;
  const literal = t.stringLiteral(val);

  if (attr) attr.value = literal;
  else el.attributes.push(t.jsxAttribute(t.jsxIdentifier(name), literal));
}

function addLinkImport(ast: t.File) {
  ast.program.body.unshift(
    t.importDeclaration(
      [t.importSpecifier(t.identifier('Link'), t.identifier('Link'))],
      t.stringLiteral('react-router-dom'),
    ),
  );
}