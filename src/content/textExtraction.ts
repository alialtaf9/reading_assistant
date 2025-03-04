/**
 * @description
 * Utility functions for extracting visible text from the current webpage.
 * 
 * Key features:
 * - Traverses the DOM to find all visible text nodes
 * - Filters out hidden elements (display: none, visibility: hidden, etc.)
 * - Cleans and processes the text (removes extra whitespace)
 * - Limits the extracted text to 20,000 words
 */

/**
 * Checks if an element is visible in the DOM
 * @param element - The DOM element to check
 * @returns boolean - True if the element is visible, false otherwise
 */
function isElementVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  
  return !(
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0' ||
    element.offsetWidth === 0 ||
    element.offsetHeight === 0
  );
}

/**
 * Determines if we should extract text from this node
 * Filters out script, style, and other non-content elements
 * @param node - The DOM node to check
 * @returns boolean - True if we should extract text from this node
 */
function shouldExtractFromNode(node: Node): boolean {
  if (node.nodeType === Node.COMMENT_NODE) {
    return false;
  }
  
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent !== null && node.textContent.trim() !== '';
  }
  
  if (node.nodeType === Node.ELEMENT_NODE) {
    const tagName = (node as Element).tagName.toLowerCase();
    
    // Skip script, style, noscript, and other non-content elements
    const excludedTags = ['script', 'style', 'noscript', 'code', 'pre', 'meta', 'head'];
    if (excludedTags.includes(tagName)) {
      return false;
    }
    
    // Skip hidden elements
    if (node instanceof HTMLElement && !isElementVisible(node)) {
      return false;
    }
    
    return true;
  }
  
  return false;
}

/**
 * Recursively extracts visible text from a node and its children
 * @param node - The DOM node to extract text from
 * @param result - Array to accumulate text nodes
 */
function extractTextFromNode(node: Node, result: string[]): void {
  if (!shouldExtractFromNode(node)) {
    return;
  }
  
  // If it's a text node, add its content
  if (node.nodeType === Node.TEXT_NODE && node.textContent) {
    const text = node.textContent.trim();
    if (text) {
      result.push(text);
    }
    return;
  }
  
  // Recursively process child nodes
  for (let i = 0; i < node.childNodes.length; i++) {
    extractTextFromNode(node.childNodes[i], result);
  }
}

/**
 * Cleans the extracted text
 * @param text - The text to clean
 * @returns string - The cleaned text
 */
function cleanText(text: string): string {
  // Replace multiple spaces with a single space
  let cleaned = text.replace(/\s+/g, ' ');
  
  // Remove other non-meaningful characters if needed
  cleaned = cleaned.replace(/\u200B/g, ''); // Zero-width space
  
  return cleaned.trim();
}

/**
 * Count words in a text string
 * @param text - The text to count words in
 * @returns number - The word count
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

/**
 * Main function to extract visible text from the current page
 * @returns string - Extracted visible text, limited to 20,000 words
 */
export function extractVisibleText(): string {
  const textNodes: string[] = [];
  
  try {
    // Start extraction from the body
    if (document.body) {
      extractTextFromNode(document.body, textNodes);
    }
    
    // Join all text nodes with a space
    let fullText = textNodes.join(' ');
    
    // Clean the text
    fullText = cleanText(fullText);
    
    // Limit to 20,000 words
    const words = fullText.split(/\s+/);
    if (words.length > 20000) {
      console.log(`Text extracted: ${words.length} words, truncating to 20,000 words`);
      return words.slice(0, 20000).join(' ');
    }
    
    console.log(`Text extracted: ${words.length} words`);
    return fullText;
  } catch (error) {
    console.error('Error extracting visible text:', error);
    return '';
  }
}

/**
 * Export a simpler function that returns both the extracted text and word count
 */
export function getPageContent(): { text: string; wordCount: number } {
  const text = extractVisibleText();
  return {
    text,
    wordCount: countWords(text)
  };
} 