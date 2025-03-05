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

// Handle extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Could open an onboarding page or instructions here
  } else if (details.reason === 'update') {
    const thisVersion = chrome.runtime.getManifest().version;
    // Possibly notify user of updates
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
      return;
    }
    
    // Send a message to the content script to toggle the overlay
    chrome.tabs.sendMessage(tab.id, { action: 'toggleOverlay' });
  } catch (error) {
    // Silently handle error
  }
};

// Handle icon clicks
chrome.action.onClicked.addListener((tab) => {
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { 
      action: 'toggleOverlay'
    });
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === '_execute_action') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'toggleOverlay'
        });
      }
    });
  }
});

// Listen for any messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  sendResponse({ received: true });
  return true;
});

// Clean up any existing resources when the extension is unloaded or reloaded
chrome.runtime.onSuspend.addListener(() => {
  // Get any registered interval IDs and clear them
  chrome.storage.local.get(['urlChangeDetectorId'], (result) => {
    if (result.urlChangeDetectorId) {
      clearInterval(result.urlChangeDetectorId);
    }
    chrome.storage.local.remove(['urlChangeDetectorId', 'overlayVisible']);
  });
}); 