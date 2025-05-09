// copilot/offscreen.js
let audio = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'playTTS') {
    if (!request.data || !request.data.audioDataUrl) {
      console.error('Offscreen: Play request received without audioDataUrl.');
      sendResponse({ success: false, error: 'No audioDataUrl provided.' });
      return true;
    }

    console.log('Offscreen: Received playTTS request with audioDataUrl.');
    playAudio(request.data.audioDataUrl, request.data.textKey); // Pass textKey for context
    sendResponse({ success: true }); // Acknowledge receipt
    return true; // Keep message channel open for async response if needed later
  } else if (request.action === 'pauseTTS') {
    if (audio && !audio.paused) {
      console.log('Offscreen: Pausing audio.');
      audio.pause();
      // Inform background/content script that audio is paused
      chrome.runtime.sendMessage({
        action: 'ttsStateChanged',
        data: { state: 'paused', textKey: audio.textKey }
      });
    }
    sendResponse({ success: true });
    return true;
  } else if (request.action === 'stopTTS') { // Could be useful for immediate stop
    if (audio) {
      console.log('Offscreen: Stopping audio.');
      audio.pause();
      audio.currentTime = 0; // Reset
      // Inform background/content script that audio is stopped/idle
      chrome.runtime.sendMessage({
        action: 'ttsStateChanged',
        data: { state: 'idle', textKey: audio.textKey }
      });
      audio = null; // Release the audio object
    }
    sendResponse({ success: true });
    return true;
  }
  return false; // For synchronous messages, or if this handler doesn't handle the message
});

function playAudio(audioDataUrl, textKey) {
  if (audio) {
    console.log('Offscreen: Stopping previous audio before playing new one.');
    audio.pause();
    // Optionally inform that previous audio stopped if it was playing for a different textKey
    if (audio.textKey && audio.textKey !== textKey) {
         chrome.runtime.sendMessage({
            action: 'ttsStateChanged',
            data: { state: 'idle', textKey: audio.textKey, reason: 'new_playback_request' }
        });
    }
  }

  console.log('Offscreen: Creating new Audio object.');
  audio = new Audio(audioDataUrl);
  audio.textKey = textKey; // Store textKey for context in events

  audio.play()
    .then(() => {
      console.log('Offscreen: Audio playback started.');
      // Inform background/content script that audio is playing
      chrome.runtime.sendMessage({
        action: 'ttsStateChanged',
        data: { state: 'playing', textKey: audio.textKey }
      });
    })
    .catch(error => {
      console.error('Offscreen: Error playing audio:', error);
      // Inform background/content script about the error
      chrome.runtime.sendMessage({
        action: 'ttsStateChanged',
        data: { state: 'error', error: error.message, textKey: audio.textKey }
      });
      audio = null; // Clear on error
    });

  audio.onended = () => {
    console.log('Offscreen: Audio playback ended.');
    // Inform background/content script that audio has ended
    chrome.runtime.sendMessage({
      action: 'ttsStateChanged',
      data: { state: 'idle', textKey: audio.textKey, reason: 'ended' }
    });
    audio = null; // Clear after playback
  };

  audio.onerror = (e) => {
    // This might be redundant if the play().catch() handles it, but good for robustness
    console.error('Offscreen: Audio element error event:', e);
    chrome.runtime.sendMessage({
      action: 'ttsStateChanged',
      data: { state: 'error', error: 'Audio element error', textKey: audio.textKey }
    });
    audio = null;
  };

  // Handle pause event (e.g., if paused via browser controls, though less likely in offscreen)
  audio.onpause = () => {
    // Only send 'paused' state if it's not at the end (onended handles that)
    // and if it wasn't explicitly stopped (which would set audio to null or send 'idle')
    if (audio && !audio.ended && audio.currentTime > 0) {
        console.log('Offscreen: Audio playback paused.');
        chrome.runtime.sendMessage({
            action: 'ttsStateChanged',
            data: { state: 'paused', textKey: audio.textKey }
        });
    }
  };
}

console.log('Offscreen script loaded.');
