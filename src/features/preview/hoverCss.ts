
// This defines the hover box over the iframe
export const injectWebsiteBuilderNodeHoverStyles = `
  [data-hov="true"] {
    position: relative;
  }

  [data-hov="true"]::before {
    content: '';
    position: absolute;
    pointer-events: none;
    z-index: 9999;
    outline: 1px dashed #0da2e7 !important;
    offset: 3px;
    transition: outline-offset 0.2s ease-in-out;
    background-color: #0da2e71a;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  /* Element tag label in the top left corner */
  [data-hov="true"]::after {
    content: attr(data-tag-label);
    position: absolute;
    top: -18px;
    left: 0px;
    background-color: #0da2e7;
    color: white;
    font-size: 10px;
    padding: 2px 4px;
    border-radius: 2px;
    font-family: monospace;
    pointer-events: none;
    z-index: 10000;
    text-transform: lowercase;
  }

  /* Ensure SVG icons from Lucide are selectable */
  svg[class*="lucide-"] {
    position: relative;
    cursor: pointer;
  }

  /* Purple outline for layout elements (div, section, header, footer, etc.) */
  div[data-hov="true"]::before,
  section[data-hov="true"]::before,
  header[data-hov="true"]::before,
  footer[data-hov="true"]::before,
  aside[data-hov="true"]::before,
  nav[data-hov="true"]::before,
  main[data-hov="true"]::before,
  article[data-hov="true"]::before {
    outline: 1px dotted #9c27b0 !important;
    outline-offset: -1px;
    background-color: #9c27b008;
  }

  /* Purple label for layout elements */
  div[data-hov="true"]::after,
  section[data-hov="true"]::after,
  header[data-hov="true"]::after,
  footer[data-hov="true"]::after,
  aside[data-hov="true"]::after,
  nav[data-hov="true"]::after,
  main[data-hov="true"]::after,
  article[data-hov="true"]::after {
    background-color: #9c27b0;
  }

  /* Special image support. Because it <img /> cannot have pseudo elements */
  img[data-hov="true"], input[data-hov="true"] {
    outline: 1px dashed #0da2e7 !important;
    offset: 3px;
    transition: outline-offset 0.2s ease-in-out;
    position: relative;
  }

  /* Special label for self-closing elements (img, input) */
  img[data-hov="true"] ~ label.element-tag-label,
  input[data-hov="true"] ~ label.element-tag-label {
    position: absolute;
    top: -18px;
    left: 0px;
    background-color: #0da2e7;
    color: white;
    font-size: 10px;
    padding: 2px 4px;
    border-radius: 2px;
    font-family: monospace;
    pointer-events: none;
    z-index: 10000;
    text-transform: lowercase;
  }
`;

