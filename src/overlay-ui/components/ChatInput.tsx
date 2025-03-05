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
  initialText?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSubmit, isDisabled = false, initialText = '' }) => {
  const [message, setMessage] = useState<string>(initialText);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Focus input on mount and update if initialText changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      
      // Allow input field to auto-adjust its height
      const adjustHeight = () => {
        const el = inputRef.current;
        if (el) {
          el.style.height = 'auto';
          el.style.height = el.scrollHeight + 'px';
        }
      };
      
      // Set up auto-resizing for textarea
      inputRef.current.addEventListener('input', adjustHeight);
      
      // Initial adjustment
      adjustHeight();
      
      // Clean up event listener
      return () => {
        inputRef.current?.removeEventListener('input', adjustHeight);
      };
    }
  }, []);
  
  // Update message and focus when initialText changes
  useEffect(() => {
    if (initialText && initialText !== message) {
      setMessage(initialText);
      
      // Focus and set cursor position at the end
      if (inputRef.current) {
        inputRef.current.focus();
        const length = initialText.length;
        inputRef.current.selectionStart = length;
        inputRef.current.selectionEnd = length;
        
        // Adjust height and scroll to bottom
        setTimeout(() => {
          if (inputRef.current) {
            // Auto-adjust height
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
            
            // Scroll to bottom of textarea
            inputRef.current.scrollTop = inputRef.current.scrollHeight;
            
            // Also ensure input is visible in iframe
            inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 0);
      }
    }
  }, [initialText]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !isDisabled) {
      onSubmit(message);
      setMessage('');
      
      // Reset textarea height after submission
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter, but allow Shift+Enter for new lines
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default newline behavior when submitting
      handleSubmit(e);
    }
  };
  
  return (
    <form className="chat-input-container" onSubmit={handleSubmit}>
      <textarea
        ref={inputRef}
        className="chat-input"
        placeholder={isDisabled ? "Please wait..." : "Ask about this page..."}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        rows={message.includes("\n") ? Math.min(4, message.split("\n").length) : 1}
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