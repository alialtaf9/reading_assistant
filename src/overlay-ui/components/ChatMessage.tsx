/**
 * @description
 * ChatMessage component renders individual messages in the chat interface.
 * Styles messages differently based on whether they are from the user or assistant.
 * 
 * @props
 * - message: The message object containing text and role (user or assistant)
 */

import React from 'react';

export interface ChatMessageProps {
  message: {
    text: string;
    role: 'user' | 'assistant';
  };
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`chat-message ${isUser ? 'user-message' : 'assistant-message'}`}>
      <div className="message-avatar">
        {isUser ? '👤' : '🤖'}
      </div>
      <div className="message-content">
        <div className="message-text">{message.text}</div>
      </div>
    </div>
  );
};

export default ChatMessage; 