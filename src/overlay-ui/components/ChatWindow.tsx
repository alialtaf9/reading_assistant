/**
 * @description
 * ChatWindow component manages the overall chat interface.
 * It maintains the message history, handles sending messages,
 * and displays loading states.
 * 
 * @props
 * - onClose: Function to call when closing the window
 * - onSendMessage: Function to call when sending a message
 * - isLoading: Whether the assistant is currently processing
 * - pageContext: The extracted text from the page for context
 */

import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ApiKeyForm from './ApiKeyForm';

export interface ChatWindowProps {
  onClose: () => void;
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  pageContext: string;
  selectedText?: string;
}

interface Message {
  text: string;
  role: 'user' | 'assistant';
}

interface PageMetadata {
  title?: string;
  url?: string;
  siteName?: string;
  description?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  onClose, 
  onSendMessage, 
  isLoading, 
  pageContext,
  selectedText = '' 
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hello! I can help answer questions about this page. What would you like to know?' }
  ]);
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [processingMessage, setProcessingMessage] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null); // null means "loading"
  const [wordCount, setWordCount] = useState<number>(0);
  const [pageMetadata, setPageMetadata] = useState<PageMetadata>({});
  const [refreshingContent, setRefreshingContent] = useState(false);
  const [inputText, setInputText] = useState(selectedText);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Check if API key is set
  useEffect(() => {
    window.parent.postMessage({ action: 'checkApiKey' }, '*');
  }, []);
  
  // Set up message listener for API responses
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('ChatWindow received message:', event.data);
      
      if (event.data.action === 'apiKeyStatus') {
        setHasApiKey(event.data.hasApiKey);
        setShowApiKeyForm(!event.data.hasApiKey);
      } else if (event.data.action === 'apiKeySaved') {
        if (event.data.success) {
          setHasApiKey(true);
          setShowApiKeyForm(false);
        } else {
          // Show error to user
          alert(`Failed to save API key: ${event.data.error}`);
        }
      } else if (event.data.action === 'chatGptProcessing') {
        setProcessingMessage(event.data.processing);
      } else if (event.data.action === 'chatGptResponse') {
        // Add the assistant response to the message list
        if (event.data.success) {
          addAssistantResponse(event.data.response);
        } else {
          addAssistantResponse(`Error: ${event.data.response}`);
        }
      } else if (event.data.action === 'pageTextExtracted') {
        // Update page context information
        if (event.data.wordCount) {
          setWordCount(event.data.wordCount);
        } else {
          // Estimate word count if not provided
          setWordCount(event.data.text.split(/\s+/).filter(Boolean).length);
        }
        
        // Store metadata if available
        if (event.data.metadata) {
          setPageMetadata(event.data.metadata);
        }
        
        // Content refresh is complete
        setRefreshingContent(false);
      } else if (event.data.action === 'addSelectedText') {
        // Handle selected text from right-click context menu
        setInputText(event.data.selectedText || '');
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [messages]);
  
  // Handle sending a message
  const handleSendMessage = (text: string) => {
    // Check if API key is set
    if (!hasApiKey) {
      setShowApiKeyForm(true);
      return;
    }
    
    // Add user message to chat
    const newMessages = [...messages, { text, role: 'user' as const }];
    setMessages(newMessages);
    
    // Send to parent for API processing
    onSendMessage(text);
    
    // Show "thinking" message while loading
    setProcessingMessage(true);
  };
  
  // Handle API key save
  const handleSaveApiKey = (apiKey: string) => {
    window.parent.postMessage({ 
      action: 'saveApiKey',
      apiKey 
    }, '*');
  };
  
  // Add a new assistant response
  const addAssistantResponse = (text: string) => {
    setMessages(prevMessages => [...prevMessages, { text, role: 'assistant' as const }]);
  };
  
  // Handle refreshing content
  const handleRefreshContent = () => {
    setRefreshingContent(true);
    window.parent.postMessage({ action: 'refreshPageContent' }, '*');
  };
  
  if (showApiKeyForm) {
    return (
      <div className="chat-window">
        <div className="chat-header">
          <h3>ChatGPT Assistant</h3>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="api-key-container">
          <ApiKeyForm 
            onSave={handleSaveApiKey} 
            onCancel={onClose} 
          />
        </div>
      </div>
    );
  }
  
  // Render page title info if available
  const renderPageInfo = () => {
    if (pageMetadata.title) {
      return (
        <div className="page-info">
          <span className="page-title" title={pageMetadata.url || ''}>
            {pageMetadata.title}
          </span>
          {pageMetadata.siteName && (
            <span className="site-name">
              {` • ${pageMetadata.siteName}`}
            </span>
          )}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="header-content">
          <h3>ChatGPT Assistant</h3>
          {renderPageInfo()}
        </div>
        <div className="header-buttons">
          <button 
            className="refresh-button" 
            onClick={handleRefreshContent}
            disabled={refreshingContent || isLoading}
            title="Refresh page content"
          >
            {refreshingContent ? '↻' : '↻'}
          </button>
          <button 
            className="settings-button" 
            onClick={() => setShowApiKeyForm(true)}
            title="Configure API Key"
          >
            ⚙️
          </button>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}
        
        {(isLoading || processingMessage) && (
          <div className="loading-indicator">
            <div className="loading-spinner"></div>
            <div className="loading-text">Thinking...</div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-wrapper">
        <ChatInput 
          onSubmit={handleSendMessage} 
          isDisabled={isLoading || processingMessage || hasApiKey === null}
          initialText={inputText}
        />
      </div>
      
      <div className="chat-footer">
        <div className="context-info">
          {refreshingContent ? 
            'Refreshing page content...' :
            (wordCount > 0 ? 
              `${wordCount.toLocaleString()} words of context from this page` : 
              'Extracting page content...'
            )
          }
          {!refreshingContent && wordCount > 0 && (
            <button 
              className="mini-refresh-button" 
              onClick={handleRefreshContent}
              title="Refresh page content"
            >
              ↻
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatWindow; 