
// This describes the set of tags that will have
// data-id attributes added to them.
// This is so we can hover, select, and edit the following tags:
export const DOM_ID_TAGS = [
  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // Interactive elements
  'a', 'Link', 'button', 'Button', 'input',
  // Content elements
  'p', 'img', 'span', 'i', 'svg',
  // Layout elements
  'div', 'section', 'header', 'footer', 'aside', 'nav', 'main', 'article'
];

// Feature flags
export const FEATURE_FLAGS = {
  // Set to false to disable the 3 messages per day credit limit
  ENABLE_DAILY_CREDIT_LIMIT: false,
  
  // Default number of daily credits when limit is enabled
  DEFAULT_DAILY_CREDITS: 3,
};
