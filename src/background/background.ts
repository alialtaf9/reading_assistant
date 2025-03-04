/**
 * @description
 * Background script for the ChatGPT Browser Assistant extension.
 * Handles extension lifecycle events and messaging between components.
 * 
 * Key responsibilities:
 * - Listen for extension icon clicks
 * - Listen for keyboard shortcut commands
 * - Send messages to content scripts to toggle the chat overlay
 * - Handle extension lifecycle events (install, update)
 */

// Absolute minimum code for a service worker
console.log('Background script loaded - ' + new Date().toISOString());

// Handle extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
    // Could open an onboarding page or instructions here
  } else if (details.reason === 'update') {
    const thisVersion = chrome.runtime.getManifest().version;
    console.log(`Updated from ${details.previousVersion} to ${thisVersion}`);
  }
});

/**
 * Toggle the overlay in the active tab
 * Sends a message to the content script to show/hide the overlay
 */
const sendToggleOverlayMessage = async () => {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id) {
      console.error('No active tab found');
      return;
    }
    
    // Send a message to the content script to toggle the overlay
    chrome.tabs.sendMessage(tab.id, { action: 'toggleOverlay' });
  } catch (error) {
    console.error('Error toggling overlay:', error);
  }
};

// Handle icon clicks
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab?.id);
  
  if (tab?.id) {
    console.log('Sending toggleOverlay message to tab ' + tab.id);
    chrome.tabs.sendMessage(tab.id, { 
      action: 'toggleOverlay',
      timestamp: new Date().toISOString()
    });
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);
  
  if (command === '_execute_action') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'toggleOverlay',
          timestamp: new Date().toISOString()
        });
      }
    });
  }
});

// Listen for any messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message, 'from:', sender);
  sendResponse({ received: true });
  return true;
});

console.log('Background script initialized'); 