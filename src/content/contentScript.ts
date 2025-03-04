/**
 * @description
 * Content script that handles DOM manipulation and communication with the background script.
 */

import { openAIService } from '../services/openaiService';
import { contentExtractor } from '../services/contentExtractor';

// Add extensive logging for debugging
console.log('Content script loaded at ' + new Date().toISOString());

// Add a visible element to the page
const indicator = document.createElement('div');
indicator.textContent = 'ChatGPT Assistant Content Script Loaded';
indicator.style.position = 'fixed';
indicator.style.top = '0';
indicator.style.right = '0';
indicator.style.backgroundColor = 'yellow';
indicator.style.padding = '5px';
indicator.style.zIndex = '10000';
indicator.style.fontSize = '12px';
document.body.appendChild(indicator);

// Log DOM information
console.log('Page URL:', window.location.href);
console.log('DOM ready state:', document.readyState);

// Define types for message handling
interface Message {
  action: string;
  timestamp?: string;
  [key: string]: any;
}

// Keep track of if the overlay is currently shown
let overlayVisible = false;
let overlayFrame: HTMLIFrameElement | null = null;
let extractedPageContent: string | null = null;
let lastProcessedUrl: string = window.location.href;

// Set up URL change detection for SPAs like Gmail
setInterval(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastProcessedUrl) {
    console.log('URL changed from', lastProcessedUrl, 'to', currentUrl);
    lastProcessedUrl = currentUrl;
    // Clear the cache to ensure fresh content extraction on URL change
    extractedPageContent = null;
    
    // If overlay is visible, update the content
    if (overlayVisible && overlayFrame) {
      sendExtractedPageContent();
    }
  }
}, 1000); // Check every second

/**
 * Create and add the overlay iframe to the page
 */
function createOverlay(): HTMLIFrameElement {
  console.log('Creating overlay iframe');
  
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
  console.log('Overlay iframe added to DOM');
  
  // Set up message communication with iframe
  window.addEventListener('message', handleIframeMessage);
  
  return iframe;
}

/**
 * Handle messages from the React overlay
 */
function handleIframeMessage(event: MessageEvent): void {
  console.log('Content script received iframe message:', event.data);
  
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
    console.log('Sending to ChatGPT:', query);
    
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
    const response = await openAIService.sendMessage(query, extractedPageContent);
    
    // Send the response back to the iframe
    overlayFrame?.contentWindow?.postMessage({
      action: 'chatGptResponse',
      response,
      success: true
    }, '*');
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Error calling ChatGPT:', errorMessage);
    
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
    }
    
    // Extract main content (just for word count display)
    const extractedResult = contentExtractor.extractContent();
    const wordCount = extractedResult.wordCount;
    
    // Send the content to the iframe
    overlayFrame?.contentWindow?.postMessage({
      action: 'pageTextExtracted',
      text: extractedPageContent,
      wordCount: wordCount,
      metadata: extractedResult.metadata
    }, '*');
    
    console.log(`Sent extracted content to overlay (${wordCount} words)`);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Error extracting page content:', errorMessage);
    
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
  console.log('Extracting page content using ContentExtractor service');
  try {
    // Use our content extractor to get structured content
    const extractedContent = contentExtractor.extractContent();
    
    // Format it for ChatGPT
    const formattedContent = contentExtractor.formatContentForChatGPT(extractedContent);
    
    console.log(`Successfully extracted ${extractedContent.wordCount} words from page`);
    
    return formattedContent;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Error in content extraction:', errorMessage);
    
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
  console.log(`Used fallback extraction: ${wordCount} words extracted`);
  
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
      indicator.textContent = 'Overlay added at ' + new Date().toISOString();
      indicator.style.backgroundColor = 'lightgreen';
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error creating overlay:', errorMessage);
      indicator.textContent = 'Error: ' + errorMessage;
      indicator.style.backgroundColor = 'red';
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

// Debug message listener
function handleRuntimeMessage(
  message: Message, 
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response?: any) => void
): boolean {
  console.log('Content script received message:', message);
  
  // Update the indicator with the message received
  indicator.textContent = 'Received: ' + JSON.stringify(message);
  
  if (message && message.action === 'toggleOverlay') {
    console.log('Processing toggleOverlay action');
    handleToggleOverlay();
    // Send a success response
    console.log('Sending success response');
    sendResponse({success: true, time: new Date().toISOString()});
  } else {
    console.warn('Unknown message action or missing action property');
    sendResponse({error: 'Unknown action', received: message});
  }
  
  return true; // Keep the connection open for async response
}

// Register the message listener
try {
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
  console.log('Message listener registered successfully');
} catch (err: unknown) {
  const errorMessage = err instanceof Error ? err.message : String(err);
  console.error('Error registering message listener:', errorMessage);
  indicator.textContent = 'Error registering listener: ' + errorMessage;
}

// Test if we can send messages back to the extension
setTimeout(() => {
  console.log('Sending test message from content script');
  try {
    chrome.runtime.sendMessage({action: 'contentScriptTest', time: new Date().toISOString()});
    console.log('Test message sent');
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Error sending test message:', errorMessage);
  }
}, 2000);

// Log that script completed loading
console.log('Content script setup complete at ' + new Date().toISOString()); 