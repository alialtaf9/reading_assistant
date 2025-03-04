document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup script loaded');
  
  document.getElementById('toggleBtn').addEventListener('click', function() {
    console.log('Toggle button clicked');
    
    // Send message to the active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]?.id) {
        console.log('Sending message to tab:', tabs[0].id);
        chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleOverlay'}, function(response) {
          console.log('Response:', response || 'No response');
        });
      }
    });
  });
}); 