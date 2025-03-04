document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup script loaded - ' + new Date().toISOString());
  
  const toggleBtn = document.getElementById('toggleBtn');
  
  if (!toggleBtn) {
    console.error('Toggle button not found in popup!');
    return;
  }
  
  // Add a status message to the popup
  const statusDiv = document.createElement('div');
  statusDiv.id = 'status';
  statusDiv.style.marginTop = '10px';
  statusDiv.style.padding = '5px';
  statusDiv.style.border = '1px solid #ccc';
  statusDiv.style.borderRadius = '4px';
  statusDiv.textContent = 'Ready';
  document.body.appendChild(statusDiv);
  
  toggleBtn.addEventListener('click', function() {
    console.log('Toggle button clicked - ' + new Date().toISOString());
    statusDiv.textContent = 'Button clicked, finding tabs...';
    
    // Send message to the active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      console.log('Tabs query result:', tabs);
      statusDiv.textContent = 'Found tabs: ' + (tabs ? tabs.length : 0);
      
      if (tabs && tabs.length > 0 && tabs[0].id) {
        console.log('Sending message to tab:', tabs[0].id);
        statusDiv.textContent = 'Sending message to tab ' + tabs[0].id;
        
        try {
          chrome.tabs.sendMessage(
            tabs[0].id,
            {action: 'toggleOverlay', timestamp: new Date().toISOString()},
            function(response) {
              console.log('Response received:', response);
              statusDiv.textContent = response 
                ? 'Response: ' + JSON.stringify(response) 
                : 'No response or error';
              
              // Check for error
              if (chrome.runtime.lastError) {
                console.error('Error:', chrome.runtime.lastError);
                statusDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
              }
            }
          );
        } catch (e) {
          console.error('Exception sending message:', e);
          statusDiv.textContent = 'Exception: ' + e.message;
        }
      } else {
        console.error('No valid tab found');
        statusDiv.textContent = 'No valid tab found';
      }
    });
  });
});

// Log that the script ran completely
console.log('Popup script initialization complete');
