// copilot/background.js
import { actualAvailableLanguages, getCode } from './languages.js';

// No longer need this line as actualAvailableLanguages is imported directly
// const availableLanguages = actualAvailableLanguages; 

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getLanguages') {
    // Reorder languages for the UI
    const preferredOrder = ['english', 'bengali', 'arabic', 'hindi', 'japanese'];
    let sortedLanguages = [...actualAvailableLanguages]; // Create a copy to sort

    sortedLanguages.sort((a, b) => {
      const aIndex = preferredOrder.indexOf(a.toLowerCase());
      const bIndex = preferredOrder.indexOf(b.toLowerCase());

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex; // Both are in preferred, sort by preferred order
      }
      if (aIndex !== -1) {
        return -1; // a is preferred, b is not
      }
      if (bIndex !== -1) {
        return 1; // b is preferred, a is not
      }
      return a.localeCompare(b); // Neither is preferred, sort alphabetically
    });

    sendResponse({ languages: sortedLanguages });
    return true;
  } else if (request.action === 'translateText') {
    const { text, targetLang } = request.data; // targetLang is language name, e.g., "spanish"

    // getCode is imported from './languages.js'. It must convert name to code.
    // e.g., getCode('spanish') should return 'es'. It should handle case-insensitivity.
    const toLangCode = getCode(targetLang); // Assuming getCode handles case or targetLang is already lowercase

    if (!toLangCode) {
      const errorMsg = `Unsupported language or code not found: ${targetLang}`;
      console.error(errorMsg);
      sendResponse({ error: errorMsg, translatedText: `[${errorMsg}] ${text}` });
      return true; // Asynchronous response
    }

    fetch('https://manfromexistence-api.vercel.app/translate', { // Updated URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Accept': 'application/json', // Good practice, though often not strictly needed
      },
      body: JSON.stringify({ text: text, target_language: toLangCode })
    })
      .then(response => {
        if (!response.ok) {
          // Attempt to get more detailed error information from the response body
          return response.text().then(errorBodyText => {
            let detail = errorBodyText;
            try {
              // Check if the error body is JSON
              const errorJson = JSON.parse(errorBodyText);
              detail = errorJson.detail || errorJson.message || errorBodyText; // Common error fields
            } catch (e) {
              // Not JSON, or parsing failed, use the raw text
            }
            throw new Error(`HTTP error ${response.status}: ${detail}`);
          });
        }
        return response.json(); // Expecting JSON like {"translated_text": "..."}
      })
      .then(data => {
        // The API is expected to return something like: {"translated_text": "Hola, mundo!"}
        if (data && typeof data.translated_text === 'string') {
          sendResponse({ translatedText: data.translated_text });
        } else {
          // Handle cases where translated_text is missing or not a string
          console.warn('Unexpected translation API response structure. Data:', data);
          sendResponse({
            translatedText: `[Translation format error. Received: ${JSON.stringify(data)}] ${text}`,
            error: 'Unexpected API response format from translation server.'
          });
        }
      })
      .catch(error => {
        console.error('Error during translation API call:', error);
        sendResponse({ translatedText: `[Error translating: ${error.message}] ${text}`, error: error.message });
      });
    return true; // Indicates that the response is sent asynchronously.
  } else if (request.action === 'fetchTTS') {
    const { text } = request.data;
    fetch('https://manfromexistence-api.vercel.app/tts', { // Updated URL
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

