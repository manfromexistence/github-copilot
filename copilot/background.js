// copilot/background.js
import translate from '../translate/index.js';
import actualAvailableLanguages, { getCode } from '../translate/languages.js';

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
  }
});

console.log('GitHub Copilot Chat Enhancer background script loaded and attempting to use actual translate package.');
console.warn('Reminder: The translate package (especially its use of "got" and other Node.js modules) may need adaptation (e.g., using "fetch") or bundling to work correctly in this service worker environment.');
