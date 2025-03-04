/**
 * @description
 * Main entry point for the overlay UI.
 * Sets up the React application and mounts it to the DOM.
 * 
 * Key responsibilities:
 * - Initialize the React application
 * - Render the ChatWindow component
 * - Handle communication with the content script
 */

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import ChatWindow from './components/ChatWindow';
import './overlay.css';
import './components/chat.css';  // Import the new CSS

interface PageMetadata {
  title?: string;
  url?: string;
  siteName?: string;
  description?: string;
}

/**
 * Main Overlay component
 * Acts as the container for the entire chat interface
 */
const Overlay: React.FC = () => {
  // State to store the extracted page text
  const [pageText, setPageText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [wordCount, setWordCount] = useState<number>(0);
  const [pageMetadata, setPageMetadata] = useState<PageMetadata>({});
  
  // Set up message listener to receive text from content script
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Overlay received message:', event.data);
      
      if (event.data.action === 'pageTextExtracted') {
        setPageText(event.data.text);
        setIsLoading(false);
        
        // Store word count if available
        if (event.data.wordCount) {
          setWordCount(event.data.wordCount);
        }
        
        // Store metadata if available
        if (event.data.metadata) {
          setPageMetadata(event.data.metadata);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Request page text from content script
    window.parent.postMessage({ action: 'getPageText' }, '*');
    setIsLoading(true);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);
  
  /**
   * Handle closing the overlay
   */
  const handleClose = () => {
    window.parent.postMessage({ action: 'closeOverlay' }, '*');
  };
  
  /**
   * Handle sending a message to ChatGPT
   */
  const handleSendMessage = (message: string) => {
    console.log('Sending message to ChatGPT:', message);
    window.parent.postMessage({
      action: 'sendToChatGPT',
      query: message,
      context: pageText
    }, '*');
  };
  
  return (
    <div className="overlay-container">
      <ChatWindow 
        onClose={handleClose}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        pageContext={pageText}
      />
    </div>
  );
};

// Mount the React application
ReactDOM.render(
  <React.StrictMode>
    <Overlay />
  </React.StrictMode>,
  document.getElementById('chat-root')
); 