/**
 * @description
 * ApiKeyForm component allows users to enter their OpenAI API key.
 * This is shown when no API key is configured or when the user wants to update it.
 */

import React, { useState, useEffect } from 'react';

export interface ApiKeyFormProps {
  onSave: (apiKey: string) => void;
  onCancel: () => void;
  initialApiKey?: string;
}

const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ 
  onSave, 
  onCancel,
  initialApiKey = ''
}) => {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    
    setIsSubmitting(true);
    
    // Call the onSave callback with the API key
    onSave(apiKey);
    
    setIsSubmitting(false);
  };

  return (
    <div className="api-key-form">
      <h3>OpenAI API Key Required</h3>
      <p>
        To use this assistant, you need to provide your OpenAI API key. 
        Your key is stored locally in your browser and is never sent anywhere except to OpenAI.
      </p>
      <p>
        <a 
          href="https://platform.openai.com/api-keys" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          Get your API key from OpenAI →
        </a>
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="api-key">API Key</label>
          <input
            id="api-key"
            type="password"
            className="api-key-input"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            autoComplete="off"
            required
          />
        </div>
        
        <div className="form-buttons">
          <button 
            type="button" 
            className="cancel-button" 
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="save-button" 
            disabled={!apiKey.trim() || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save API Key'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ApiKeyForm; 