// copilot/background.js
import translate from './index.js';
import actualAvailableLanguages, { getCode } from './languages.js';

// Use the actual languages from the package
const availableLanguages = actualAvailableLanguages;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getLanguages') {
    sendResponse({ languages: availableLanguages });
    return true; 
  } else if (request.action === 'translateText') {
    const { text, targetLang } = request.data;
    
    // Prepare options for the translate function
    // Ensure targetLang is a valid code. 'auto' for source is usually fine.
    const toLangCode = getCode(targetLang) || targetLang; // Use getCode to be safe

    translate(text, { from: 'auto', to: toLangCode })
      .then(translatedText => {
        sendResponse({ translatedText: translatedText });
      })
      .catch(error => {
        console.error('Error during translation:', error);
        // Send back the original text or an error message
        sendResponse({ translatedText: `[Error translating: ${error.message}] ${text}` });
      });
    return true; // Indicates that the response is sent asynchronously.
  } else if (request.action === 'fetchTTS') {
    const { text } = request.data;
    fetch('https://friday-backend.vercel.app/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Origin will be set by the browser, but you can be explicit if needed
        // 'Origin': sender.origin || (sender.tab ? new URL(sender.tab.url).origin : 'null') 
      },
      body: JSON.stringify({ text })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return response.blob();
    })
    .then(audioBlob => {
      // Cannot send Blob directly, convert to data URL or object URL in content script
      // For simplicity, let's send blob as is and handle in content script if possible,
      // or convert to data URL here if needed (more complex for service worker without DOM APIs like FileReader directly)
      // A common pattern is to create an Object URL in the content script from the blob.
      // Here, we will try to send the blob. If it fails, data URL is the fallback.
      sendResponse({ audioBlob: audioBlob, error: null });
    })
    .catch(error => {
      console.error('Error fetching TTS:', error);
      sendResponse({ audioBlob: null, error: error.message });
    });
    return true; // Indicates asynchronous response
  }
});

console.log('GitHub Copilot Chat Enhancer background script loaded and attempting to use actual translate package.');
console.warn('Reminder: The translate package (especially its use of "got" and other Node.js modules) may need adaptation (e.g., using "fetch") or bundling to work correctly in this service worker environment.');
