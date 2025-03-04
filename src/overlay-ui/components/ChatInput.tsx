/**
 * @description
 * ChatInput component provides a text field and send button for user input.
 * Handles input state and submission of messages.
 * 
 * @props
 * - onSubmit: Function to call when message is submitted
 * - isDisabled: Whether the input should be disabled (e.g., during loading)
 */

import React, { useState, useRef, useEffect } from 'react';

export interface ChatInputProps {
  onSubmit: (message: string) => void;
  isDisabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSubmit, isDisabled = false }) => {
  const [message, setMessage] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !isDisabled) {
      onSubmit(message);
      setMessage('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter, but allow Shift+Enter for new lines
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };
  
  return (
    <form className="chat-input-container" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        type="text"
        className="chat-input"
        placeholder={isDisabled ? "Please wait..." : "Ask about this page..."}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
      />
      <button 
        type="submit" 
        className="send-button"
        disabled={!message.trim() || isDisabled}
      >
        Send
      </button>
    </form>
  );
};

export default ChatInput; 