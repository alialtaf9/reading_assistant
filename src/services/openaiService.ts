/**
 * @description
 * Service for communicating with the OpenAI API.
 * Handles sending messages and receiving responses.
 */

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: OpenAIMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Default system prompt that provides context for the assistant
const DEFAULT_SYSTEM_PROMPT = 
  "You are an AI assistant embedded in a web browser. You help the user understand the content of the web page they're currently viewing. " +
  "You'll be provided with text extracted from the page as context. " +
  "Keep your responses concise and directly relevant to the user's question about the page content. " +
  "If you're unable to answer based on the provided context, clearly state that and suggest what information might help.";

export class OpenAIService {
  private apiKey: string | null = null;
  private apiUrl = 'https://api.openai.com/v1/chat/completions';
  private model = 'gpt-4o-mini';

  constructor() {
    // Try to load API key from storage when service is instantiated
    this.loadApiKey();
  }

  /**
   * Load API key from Chrome storage
   */
  private async loadApiKey(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['openai_api_key'], (result) => {
        if (result.openai_api_key) {
          this.apiKey = result.openai_api_key;
          console.log('API key loaded from storage');
        } else {
          console.log('No API key found in storage');
        }
        resolve();
      });
    });
  }

  /**
   * Save API key to Chrome storage
   */
  public async saveApiKey(apiKey: string): Promise<void> {
    this.apiKey = apiKey;
    return new Promise((resolve) => {
      chrome.storage.sync.set({ openai_api_key: apiKey }, () => {
        console.log('API key saved to storage');
        resolve();
      });
    });
  }

  /**
   * Check if API key is set
   */
  public hasApiKey(): boolean {
    return this.apiKey !== null && this.apiKey.trim() !== '';
  }

  /**
   * Send a message to the OpenAI API
   * @param userMessage The user's message
   * @param pageContext The context from the page
   * @returns A promise that resolves to the assistant's response text
   */
  public async sendMessage(userMessage: string, pageContext: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('No API key set. Please configure your OpenAI API key in the extension settings.');
    }

    try {
      // Prepare the messages for the API
      const messages: OpenAIMessage[] = [
        { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
        { role: 'system', content: `Page content for context: ${pageContext}` },
        { role: 'user', content: userMessage }
      ];

      // Make the API request
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json() as OpenAIResponse;
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      if (error instanceof Error) {
        return `Error: ${error.message}`;
      }
      return 'An unknown error occurred when calling the OpenAI API';
    }
  }
}

// Create and export a singleton instance
export const openAIService = new OpenAIService(); 