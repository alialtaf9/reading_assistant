/**
 * @description
 * Content script that handles DOM manipulation and communication with the background script.
 */

import { openAIService } from '../services/openaiService';
import { contentExtractor } from '../services/contentExtractor';

// Define types for message handling
interface Message {
  action: string;
  timestamp?: string;
  query?: string;
  context?: string;
  apiKey?: string;
  processing?: boolean;
  response?: string;
  success?: boolean;
  error?: string;
  text?: string;
  wordCount?: number;
  metadata?: any;
  hasApiKey?: boolean;
}

// Keep track of if the overlay is currently shown
let overlayVisible = false;
let overlayFrame: HTMLIFrameElement | null = null;
let extractedPageContent: string | null = null;
let lastProcessedUrl: string = window.location.href;

// Set up URL change detection for SPAs like Gmail
const urlChangeDetector: number = window.setInterval(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastProcessedUrl) {
    lastProcessedUrl = currentUrl;
    // Clear the cache to ensure fresh content extraction on URL change
    extractedPageContent = null;
    
    // If overlay is visible, update the content
    if (overlayVisible && overlayFrame) {
      sendExtractedPageContent();
    }
  }
}, 1000); // Check every second

// Clean up interval when extension is unloaded
window.addEventListener('unload', () => {
  window.clearInterval(urlChangeDetector);
});

/**
 * Create and add the overlay iframe to the page
 */
function createOverlay(): HTMLIFrameElement {
  // Create iframe for isolated React environment
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('overlay-ui/index.html');
  iframe.style.position = 'fixed';
  iframe.style.bottom = '20px';
  iframe.style.right = '20px';
  iframe.style.width = '400px';
  iframe.style.height = '550px';
  iframe.style.border = '1px solid #ccc';
  iframe.style.borderRadius = '10px';
  iframe.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  iframe.style.zIndex = '9999';
  iframe.style.backgroundColor = 'white';
  iframe.style.transition = 'all 0.3s ease-in-out';
  iframe.allow = 'clipboard-read; clipboard-write';
  iframe.id = 'chatgpt-assistant-iframe';
  
  // Add to the DOM
  document.body.appendChild(iframe);
  
  // Set up message communication with iframe
  window.addEventListener('message', handleIframeMessage);
  
  return iframe;
}

/**
 * Handle messages from the React overlay
 */
function handleIframeMessage(event: MessageEvent): void {
  // Only process messages from our iframe
  if (!overlayFrame || event.source !== overlayFrame.contentWindow) {
    return;
  }
  
  if (event.data.action === 'closeOverlay') {
    handleToggleOverlay(false);
  } else if (event.data.action === 'getPageText') {
    // Extract text from the page and send it back to the iframe
    sendExtractedPageContent();
  } else if (event.data.action === 'sendToChatGPT') {
    // Send the message to ChatGPT and return the response
    handleChatGPTRequest(event.data.query, event.data.context);
  } else if (event.data.action === 'saveApiKey') {
    // Save the API key
    saveApiKey(event.data.apiKey);
  } else if (event.data.action === 'checkApiKey') {
    // Check if API key is configured
    checkApiKey();
  } else if (event.data.action === 'refreshPageContent') {
    // Force refresh the page content extraction
    extractedPageContent = null;
    sendExtractedPageContent();
  }
}

/**
 * Save the OpenAI API key
 */
async function saveApiKey(apiKey: string): Promise<void> {
  try {
    await openAIService.saveApiKey(apiKey);
    overlayFrame?.contentWindow?.postMessage({
      action: 'apiKeySaved',
      success: true
    }, '*');
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Error saving API key:', errorMessage);
    overlayFrame?.contentWindow?.postMessage({
      action: 'apiKeySaved',
      success: false,
      error: errorMessage
    }, '*');
  }
}

/**
 * Check if API key is configured
 */
function checkApiKey(): void {
  const hasApiKey = openAIService.hasApiKey();
  overlayFrame?.contentWindow?.postMessage({
    action: 'apiKeyStatus',
    hasApiKey
  }, '*');
}

/**
 * Send a message to ChatGPT and handle the response
 */
async function handleChatGPTRequest(query: string, context: string): Promise<void> {
  try {
    // Notify the UI that we're processing
    overlayFrame?.contentWindow?.postMessage({
      action: 'chatGptProcessing',
      processing: true
    }, '*');
    
    // Make sure we have the latest content extraction
    if (!extractedPageContent) {
      extractedPageContent = extractContent();
    }
    
    // Send to OpenAI API
    const response = await openAIService.sendMessage(query, context);
    
    // Send the response back to the iframe
    overlayFrame?.contentWindow?.postMessage({
      action: 'chatGptResponse',
      response,
      success: true
    }, '*');
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    // Send error to the iframe
    overlayFrame?.contentWindow?.postMessage({
      action: 'chatGptResponse',
      response: `Error: ${errorMessage}`,
      success: false
    }, '*');
  } finally {
    // Notify that processing is complete
    overlayFrame?.contentWindow?.postMessage({
      action: 'chatGptProcessing',
      processing: false
    }, '*');
  }
}

/**
 * Send the extracted page content to the iframe
 */
function sendExtractedPageContent(): void {
  try {
    // Extract content if we haven't already
    if (!extractedPageContent) {
      extractedPageContent = extractContent();
      const extractedResult = contentExtractor.extractContent();
      const wordCount = extractedResult.wordCount;
      
      // Send the content to the iframe
      overlayFrame?.contentWindow?.postMessage({
        action: 'pageTextExtracted',
        text: extractedPageContent,
        wordCount: wordCount,
        metadata: extractedResult.metadata
      }, '*');
    } else {
      // Use cached content
      const extractedResult = contentExtractor.extractContent();
      overlayFrame?.contentWindow?.postMessage({
        action: 'pageTextExtracted',
        text: extractedPageContent,
        wordCount: extractedResult.wordCount,
        metadata: extractedResult.metadata
      }, '*');
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    // Send a fallback text
    const fallbackText = document.body.innerText.substring(0, 5000) + '... (truncated)';
    overlayFrame?.contentWindow?.postMessage({
      action: 'pageTextExtracted',
      text: fallbackText,
      wordCount: fallbackText.split(/\s+/).length,
      error: errorMessage
    }, '*');
  }
}

/**
 * Extract and format content from the page
 */
function extractContent(): string {
  try {
    // Use our content extractor to get structured content
    const extractedContent = contentExtractor.extractContent();
    
    // Format it for ChatGPT
    const formattedContent = contentExtractor.formatContentForChatGPT(extractedContent);
    
    return formattedContent;
  } catch (err: unknown) {
    // Fallback to the simple extraction method
    return extractPageTextSimple();
  }
}

/**
 * Fallback simple text extraction from page
 */
function extractPageTextSimple(): string {
  // Simple implementation - get all visible text on the page
  const body = document.body;
  let text = body.innerText || '';
  
  // Limit to a reasonable size
  if (text.length > 10000) {
    text = text.substring(0, 10000) + '... (truncated)';
  }
  
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  
  // Add basic metadata
  return `PAGE INFORMATION:
Title: ${document.title}
URL: ${window.location.href}

PAGE CONTENT (${wordCount} words):
${text}`;
}

/**
 * Toggle the overlay visibility
 */
function handleToggleOverlay(forceState?: boolean): void {
  const newState = forceState !== undefined ? forceState : !overlayVisible;
  
  if (newState && !overlayFrame) {
    // Create the overlay if it doesn't exist
    try {
      overlayFrame = createOverlay();
      overlayVisible = true;
    } catch (err: unknown) {
      // Handle silently - no error indication needed
    }
  } else if (newState && overlayFrame) {
    // Show the existing overlay
    overlayFrame.style.display = 'block';
    overlayVisible = true;
  } else if (!newState && overlayFrame) {
    // Hide the overlay
    overlayFrame.style.display = 'none';
    overlayVisible = false;
  }
}

/**
 * Message listener for the background script
 */
function handleRuntimeMessage(
  message: Message, 
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response?: any) => void
): boolean {
  if (message && message.action === 'toggleOverlay') {
    handleToggleOverlay();
    sendResponse({success: true});
  } else {
    sendResponse({error: 'Unknown action', received: message});
  }
  
  return true; // Keep the connection open for async response
}

// Register the message listener
chrome.runtime.onMessage.addListener(handleRuntimeMessage); 