


// This function performs a regex search for <ideashipAction type="file"> 
// tags in the fullResponse string.
// Returns an array of objects containing the filePath, content, and optional description.
/**
 * Parse <ideashipAction type="file"> tags from the AI response and return their filePath, content, and optional description.
 */
export const getWriteTags = (fullResponse: string) : {
  path: string;
  content: string;
  description?: string;
}[] => {
  const ideashipActionRegex = /<ideashipAction\s+type="file"([^>]*)>([\s\S]*?)<\/ideashipAction>/gi;
  const pathRegex = /filePath="([^"]+)"/;
  const descriptionRegex = /description="([^"]+)"/;
  
  let match;                   
  const tags: { path: string; content: string; description?: string }[] = [];
  
  while ((match = ideashipActionRegex.exec(fullResponse)) !== null) {
    const attributesString = match[1];
    let content = match[2].trim();
    
    const pathMatch = pathRegex.exec(attributesString);
    const descriptionMatch = descriptionRegex.exec(attributesString);

    if (pathMatch && pathMatch[1]) {
      const path = pathMatch[1];
      const description = descriptionMatch?.[1];
  
      const contentLines = content.split("\n");
      if (contentLines[0]?.startsWith("```")) {
        contentLines.shift();  
      }
      if (contentLines[contentLines.length - 1]?.startsWith("```")) {
        contentLines.pop();    
      }
      content = contentLines.join("\n");
  
      tags.push({ path, content, description });
    } else {
    logger.warn(
      "Found <ideashipAction type=\"file\"> tag without a valid 'filePath' attribute:",
      match[0]
    );
    }
  }
  return tags;
}




export const processResponse = (fullResponse: string) => {

  const writeTags = getWriteTags(fullResponse)
  const filesToCreate = {};

  for (const tag of writeTags) {

    const filePath = tag.path;
    const content = tag.content;
    const description = tag.description;

    filesToCreate[filePath] = content;

    console.log("Creating file:", filePath);

    // TODO: ensure filepath exist
    
    //createVirtualFile(filePath, content)
  }


  return { filesToCreate }
}
