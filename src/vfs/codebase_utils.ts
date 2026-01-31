
// This file is responsible for utility functions 
// that handle the codebase extraction process.


const ALWAYS_INCLUDE_FILES = ['package.json'];

export function sortFilesByImportance(files: string[], baseDir: string): string[] {
  // Define patterns for high-priority files
  const highPriorityPatterns = [
    new RegExp(`(^|/)${ALWAYS_INCLUDE_FILES[0]}$`),
    /tsconfig\.json$/,
    /README\.md$/i,
    /index\.(ts|js)x?$/i,
    /main\.(ts|js)x?$/i,
    /app\.(ts|js)x?$/i,
  ];

  // Normalize baseDir once
  const base = baseDir.endsWith('/') ? baseDir : baseDir + '/';

  return [...files].sort((a, b) => {
    const relativeA = a.startsWith(base) ? a.slice(base.length) : a;
    const relativeB = b.startsWith(base) ? b.slice(base.length) : b;

    const aIsHighPriority = highPriorityPatterns.some(p => p.test(relativeA));
    const bIsHighPriority = highPriorityPatterns.some(p => p.test(relativeB));

    if (aIsHighPriority && !bIsHighPriority) return -1;
    if (!aIsHighPriority && bIsHighPriority) return 1;

    return relativeA.localeCompare(relativeB);
  });
}

/**
 * Format a file for inclusion in the codebase extract (browser-safe version)
 */
export function formatFile(
  filePath: string,
  baseDir: string,
  content: string,
): string {
  try {
    const base = baseDir.endsWith('/') ? baseDir : baseDir + '/';
    const relativePath = filePath.startsWith(base)
      ? filePath.slice(base.length)
      : filePath;

    // Files to omit content for
    const redactedPatterns = [
      'src/components/ui/',
      'eslint.config',
      'tsconfig.json',
      'package-lock.json',
      '.env',
    ];

    const shouldRedact = redactedPatterns.some((pattern) =>
      relativePath.includes(pattern)
    );

    if (shouldRedact) {
      return `<ideaship-file path="${relativePath}">
// Contents omitted for brevity
</ideaship-file>

`;
    }

    return `<ideaship-file path="${relativePath}">
${content}
</ideaship-file>

`;
  } catch (error) {
    console.error(`Error formatting file: ${filePath}`, error);
    return `<ideaship-file path="${filePath}">
// Error reading file: ${error}
</ideaship-file>

`;
  }
}


