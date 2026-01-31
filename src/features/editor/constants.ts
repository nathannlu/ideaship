export const layoutTags = [
    "div",
    "section",
    "header",
    "footer",
    "aside",
    "nav",
    "main",
    "article",
] as const;
export type LayoutTag = typeof layoutTags[number];
  