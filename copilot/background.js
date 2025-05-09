// copilot/background.js
import { actualAvailableLanguages, getCode } from './languages.js';

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
let lastTTSTabId = null; // Store the tab ID that initiated the TTS
let creatingOffscreenDocument = null; // Promise to prevent multiple creation attempts

// Function to check if an offscreen document is currently active.
async function hasOffscreenDocument() {
    // @ts-ignore
    if (chrome.runtime.getContexts) { // Check for getContexts API availability
        // @ts-ignore
        const contexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
        });
        return contexts && contexts.length > 0;
    } else {
        // Fallback or alternative check if getContexts is not available (less reliable)
        // This part might need adjustment based on Chrome version or specific API levels.
        // For simplicity, we'll assume if creatingOffscreenDocument is null and no error, it might not exist.
        console.warn('chrome.runtime.getContexts API not available. Offscreen document check might be less reliable.');
        // A more robust fallback might involve trying to send a message and seeing if it fails,
        // but that's complex. For now, we rely on the creation promise.
        return false; 
    }
}

// Function to create the offscreen document if it doesn't already exist.
async function setupOffscreenDocument() {
    if (await hasOffscreenDocument()) {
        console.log('Background: Offscreen document already exists.');
        return;
    }

    if (creatingOffscreenDocument) {
        console.log('Background: Offscreen document creation already in progress.');
        await creatingOffscreenDocument;
        return;
    }

    console.log('Background: Creating offscreen document.');
    // @ts-ignore
    creatingOffscreenDocument = chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        // @ts-ignore
        reasons: [chrome.offscreen.Reason.USER_MEDIA, chrome.offscreen.Reason.AUDIO_PLAYBACK],
        justification: 'Audio playback for Text-to-Speech functionality'
    });

    try {
        await creatingOffscreenDocument;
        console.log('Background: Offscreen document created successfully.');
    } catch (error) {
        console.error('Background: Error creating offscreen document:', error);
    } finally {
        creatingOffscreenDocument = null;
    }
}

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
    lastTTSTabId = sender.tab?.id; // Store the tab ID for later communication
    console.log(`Background: Received fetchTTS request for text: "${text ? text.substring(0, 50) + '...' : 'empty'}" from tab ${lastTTSTabId}`);

    fetch('https://manfromexistence-api.vercel.app/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({ text })
    })
    .then(response => {
      console.log(`Background: TTS fetch response status: ${response.status}, ok: ${response.ok}`);
      if (!response.ok) {
        return response.text().then(errorText => {
          console.error(`Background: TTS API Error. Status: ${response.status}. Body:`, errorText);
          throw new Error(`TTS API request failed: ${response.status} - ${errorText || 'No error text from server'}`);
        });
      }
      console.log('Background: TTS fetch response OK. Attempting to get blob.');
      return response.blob();
    })
    .then(audioBlob => {
      if (audioBlob && audioBlob.size > 0 && audioBlob.type === 'audio/mpeg') {
        console.log(`Background: Valid audioBlob received. Type: ${audioBlob.type}, Size: ${audioBlob.size}. Converting to Data URL.`);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const audioDataUrl = reader.result;
            console.log('Background: Blob converted to Data URL. Setting up offscreen document.');
            try {
                await setupOffscreenDocument();
                // @ts-ignore
                chrome.runtime.sendMessage({
                    action: 'playTTS', // This message is now targeted to offscreen.js implicitly by runtime.sendMessage when offscreen is active
                    target: 'offscreen', // Custom property to help differentiate if needed, though offscreen.js will get it directly
                    data: { audioDataUrl, textKey: text } // textKey helps content.js identify the button
                });
                console.log('Background: Sent playTTS command to offscreen document.');
                sendResponse({ success: true, message: 'TTS playback initiated via offscreen document.', textKey: text });
            } catch (e) {
                console.error('Background: Error setting up or sending to offscreen document:', e);
                sendResponse({ success: false, error: 'Failed to setup or communicate with offscreen audio player.', textKey: text });
            }
        };
        reader.onerror = () => {
            console.error('Background: FileReader error while converting blob to Data URL.');
            sendResponse({ success: false, error: 'FileReader error during blob conversion.', textKey: text });
        };
        reader.readAsDataURL(audioBlob);
        // sendResponse is now called asynchronously from onloadend/onerror, so the outer return true is still essential.
      } else {
        const errorMsg = audioBlob ? `Received invalid audio blob. Type: ${audioBlob.type}, Size: ${audioBlob.size}.` : 'TTS fetch succeeded but promise resolved with a null or undefined blob.';
        console.error(`Background: ${errorMsg}`);
        sendResponse({ audioDataUrl: null, error: errorMsg });
      }
    })
    .catch(error => {
      // This catches:
      // 1. Network errors (fetch itself fails)
      // 2. Errors thrown from !response.ok (e.g., TTS API request failed...)
      // 3. Errors from response.blob() if it rejects
      // 4. Any other unexpected errors in the promise chain before this catch.
      console.error('Background: Error in fetchTTS catch block:', error);
      sendResponse({ audioBlob: null, error: error.message || 'Unknown error during TTS fetch process.' });
    });
    return true; // Indicates asynchronous response
  } else if (request.action === 'controlTTSExtension') { // Renamed from controlTTS to avoid conflict with offscreen message
    // This message comes from content.js to control playback in offscreen.js
    (async () => {
        await setupOffscreenDocument(); // Ensure offscreen is ready
        // @ts-ignore
        chrome.runtime.sendMessage({
            action: request.subAction, // e.g., 'pauseTTS', 'stopTTS'
            target: 'offscreen',
            data: request.data // e.g., { textKey }
        });
        sendResponse({ success: true, message: `Control command '${request.subAction}' sent to offscreen.` });
    })();
    return true;
  }

  // Listener for messages from offscreen.js (e.g., state changes)
  // This needs to be outside the main onMessage if sender.url is used for filtering,
  // or ensure it doesn't interfere with other messages.
  // Let's integrate it carefully. The `sender` object helps distinguish.
  if (sender.url && sender.url.endsWith(OFFSCREEN_DOCUMENT_PATH)) {
    if (request.action === 'ttsStateChanged') {
        console.log('Background: Received ttsStateChanged from offscreen:', request.data);
        if (lastTTSTabId) {
            chrome.tabs.sendMessage(lastTTSTabId, {
                action: 'ttsStateUpdateFromBackground',
                data: request.data // { state, textKey, error?, reason? }
            }).catch(e => console.warn('Background: Error sending TTS state to content script (tab possibly closed):', e.message));
        } else {
            console.warn('Background: lastTTSTabId not set, cannot forward TTS state to content script.');
        }
        sendResponse({ success: true }); // Acknowledge message from offscreen
        return true; // Important for async handling if any
    }
  }
  // If the message wasn't handled by the above, and it's not an explicit return true,
  // it might be a synchronous message or one not meant for this handler.
  // For unhandled messages, Chrome expects sendResponse not to be called or to return false/undefined synchronously.
  // However, since all our branches return true for async, this part is tricky.
  // The default behavior if no branch matches and returns true is to close the message channel.
  // It's generally safer to have explicit returns or a final `return false;` if some messages are synchronous.
  // Given all current actions are async, this structure is mostly okay.
});

console.log('GitHub Copilot Chat Enhancer background script (v2 - offscreen) loaded.');
console.warn('Reminder: The translate package (especially its use of "got" and other Node.js modules) may need adaptation (e.g., using "fetch") or bundling to work correctly in this service worker environment.');

