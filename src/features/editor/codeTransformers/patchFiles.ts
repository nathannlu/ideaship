// features/editor/codeTransforms/patchFiles.ts
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';

const JSX_PLUGINS = ['jsx', 'typescript'];

/** Apply text / style changes to the element with `data-id`. */
export function patchFiles(
  files: Record<string, string>,
  id: string,
  options: {
    newText?: string;
    styles?: { backgroundColor?: string; color?: string };
    linkUrl?: string;
  },
): Record<string, string> | null {
  for (const [fname, src] of Object.entries(files)) {
    if (isStaticAsset(fname)) continue;

    const ast = parse(src, { sourceType: 'module', plugins: JSX_PLUGINS });
    let mutated = false;

    traverse(ast, {
      JSXElement(path) {
        if (mutated) return; // early‑exit once we mutate

        const el = path.node.openingElement;
        if (!hasId(el, id)) return;

        applyTextMutation(el, path, options.newText, options.linkUrl);
        applyStyleMutation(el, options.styles);

        mutated = true;
        path.stop();
      },
    });

    if (!mutated) continue;

    const out = generate(ast, { retainLines: true }).code;
    return { ...files, [fname]: out };
  }
  return null;
}

/* ---------- helpers --------------------------------------------------- */

const isStaticAsset = (f: string) =>
  /\.(css|js|ts)$/i.test(f.split('?')[0]);

const hasId = (el: t.JSXOpeningElement, id: string) =>
  el.attributes.some(
    (a) =>
      t.isJSXAttribute(a) &&
      t.isJSXIdentifier(a.name, { name: 'data-id' }) &&
      t.isStringLiteral(a.value) &&
      a.value.value === id,
  );

function applyTextMutation(
  el: t.JSXOpeningElement,
  path: any,
  newText?: string,
  linkUrl?: string,
) {
  const tag = (el.name as t.JSXIdentifier).name;
  const layout = ['div', 'section', 'header', 'footer', 'aside', 'nav', 'main', 'article'];

  /* special cases */
  if (tag === 'img') {
    if (newText) setOrAddAttr(el, 'src', newText);
  } else if (tag === 'i') {
    if (newText) setOrAddAttr(el, 'data-lucide', newText);
  } else if (tag === 'a' || tag === 'Link') {
    if (linkUrl) {
      const attrName = tag === 'Link' ? 'to' : 'href';
      setOrAddAttr(el, attrName, linkUrl);
    }
    if (newText) {
      path.node.children = [t.jsxText(newText)];
    }
  } else if (!layout.includes(tag)) {
    if (newText) {
      path.node.children = [t.jsxText(newText)];
    }
  }
}

function applyStyleMutation(
  el: t.JSXOpeningElement,
  styles?: { backgroundColor?: string; color?: string },
) {
  if (!styles) return;
  const styleAttr = el.attributes.find(
    (a) => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name, { name: 'style' }),
  ) as t.JSXAttribute | undefined;

  const kv = Object.entries(styles).filter(([, v]) => v);
  if (kv.length === 0) return;

  const makeObjExpr = () =>
    t.objectExpression(
      kv.map(([k, v]) =>
        t.objectProperty(t.identifier(k), t.stringLiteral(v!)),
      ),
    );

  if (styleAttr && styleAttr.value) {
    // override/merge if style already exists as object literal
    if (
      t.isJSXExpressionContainer(styleAttr.value) &&
      t.isObjectExpression(styleAttr.value.expression)
    ) {
      kv.forEach(([k, v]) => {
        const prop = styleAttr.value!.expression.properties.find(
          (p) => t.isObjectProperty(p) && t.isIdentifier(p.key, { name: k }),
        ) as t.ObjectProperty | undefined;

        if (prop) prop.value = t.stringLiteral(v!);
        else
          styleAttr.value!.expression.properties.push(
            t.objectProperty(t.identifier(k), t.stringLiteral(v!)),
          );
      });
      return;
    }
  }

  /* add or replace style attribute */
  setOrAddAttr(el, 'style', null, makeObjExpr());
}

function setOrAddAttr(
  el: t.JSXOpeningElement,
  name: string,
  value?: string,
  expr?: t.Expression,
) {
  const attr = el.attributes.find(
    (a) => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name, { name }),
  ) as t.JSXAttribute | undefined;

  const val = expr
    ? t.jsxExpressionContainer(expr)
    : t.stringLiteral(value ?? '');

  if (attr) attr.value = val;
  else el.attributes.push(t.jsxAttribute(t.jsxIdentifier(name), val));
}