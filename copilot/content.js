let currentPlayingButton = null; // Reference to the button whose audio is playing/loading/paused
let ttsCache = {}; // Cache for audio blobs: { text: blob }

// Helper function to update the speak button's icon and state
function updateSpeakButtonIcon(button, state) {
    let iconFile = 'volume-2.png';
    let altText = 'Speak';
    // Ensure button is an HTMLElement
    if (!(button instanceof HTMLElement)) {
        console.error('Invalid button element passed to updateSpeakButtonIcon', button);
        return;
    }
    button.classList.remove('copilot-enhancer-loader-spinning');

    switch (state) {
        case 'loading':
            iconFile = 'loader.png';
            altText = 'Loading TTS';
            button.classList.add('copilot-enhancer-loader-spinning');
            break;
        case 'playing':
            iconFile = 'pause.png';
            altText = 'Pause TTS';
            break;
        case 'paused':
            iconFile = 'play.png';
            altText = 'Play TTS';
            break;
        case 'error': // same as idle for now
            iconFile = 'volume-2.png';
            altText = 'Speak (error)';
            break;
        case 'idle':
        default:
            iconFile = 'volume-2.png';
            altText = 'Speak';
            break;
    }
    button.innerHTML = `<img src="${chrome.runtime.getURL(iconFile)}" alt="${altText}">`;
}

function addCustomButtonsToToolbar(actionsToolbar) {
    // Prevent adding buttons multiple times to the same toolbar
    if (actionsToolbar.querySelector('.copilot-enhancer-button-speak')) {
        return;
    }

    // 1. Create "Change Language" button
    const changeLangButton = document.createElement('button');
    changeLangButton.innerHTML = `<img src="${chrome.runtime.getURL('languages.png')}" alt="Language">`;
    changeLangButton.title = 'Change Language';
    changeLangButton.className = 'copilot-enhancer-button copilot-enhancer-button-lang';
    changeLangButton.classList.add('prc-Button-ButtonBase-c50BI', 'prc-Button-IconButton-szpyj');
    changeLangButton.dataset.size = "medium";
    changeLangButton.dataset.variant = "invisible";

    changeLangButton.onclick = (event) => {
        event.stopPropagation(); // Prevent other click handlers, e.g., closing the chat
        const existingMenu = actionsToolbar.querySelector('.copilot-language-menu');
        if (existingMenu) {
            existingMenu.remove();
            return; // Toggle behavior: click again to close
        }

        // Find the messageTurnElement associated with this button/toolbar
        const messageTurnElement = changeLangButton.closest('.ChatMessage-module__ai--WrCO3'); // Updated selector

        if (!messageTurnElement) {
            console.error("Copilot Enhancer: Could not find parent AI message container (.ChatMessage-module__ai--WrCO3) for language button. Button:", changeLangButton, "Toolbar:", actionsToolbar);
            alert("Copilot Enhancer: Could not identify the message to translate.");
            return;
        }

        chrome.runtime.sendMessage({ action: 'getLanguages' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error getting languages:', chrome.runtime.lastError.message);
                alert('Could not load languages: ' + chrome.runtime.lastError.message);
                return;
            }
            if (response && response.languages) {
                // Pass actionsToolbar as well, as showLanguageMenu uses it for appending the menu
                // and messageTurnElement to identify the text content
                showLanguageMenu(response.languages, changeLangButton, messageTurnElement, actionsToolbar);
            } else {
                alert('Could not load languages. Empty or invalid response from background script.');
            }
        });
    };

    // 2. Create "Speak aloud" button
    const speakButton = document.createElement('button');
    speakButton.innerHTML = `<img src="${chrome.runtime.getURL('volume-2.png')}" alt="Speak">`; // Initial icon
    speakButton.title = 'Speak Aloud';
    speakButton.className = 'copilot-enhancer-button copilot-enhancer-button-speak';
    speakButton.classList.add('prc-Button-ButtonBase-c50BI', 'prc-Button-IconButton-szpyj');
    speakButton.dataset.size = "medium";
    speakButton.dataset.variant = "invisible";
    speakButton.dataset.ttsState = 'idle'; // Initial state

    speakButton.onclick = () => {
        const thisButton = speakButton; // Closure for the current button
        let textToSpeak = '';
        // Find the messageTurnElement associated with this button/toolbar
        const messageTurnElement = thisButton.closest('.ChatMessage-module__ai--WrCO3'); // Updated selector

        if (!messageTurnElement) {
            console.error("Copilot Enhancer: Could not find parent AI message container (.ChatMessage-module__ai--WrCO3) for speak button. Button:", thisButton, "Toolbar:", actionsToolbar);
            alert('Copilot Enhancer: Could not find message content for speak button.');
            updateSpeakButtonIcon(thisButton, 'error'); // Reset button state if message not found
            return;
        }

        if (messageTurnElement) {
            const markdownBody = messageTurnElement.querySelector('.markdown-body');
            if (markdownBody) {
                textToSpeak = markdownBody.innerText;
            } else {
                const contentContainer = messageTurnElement.querySelector('div[class*="ChatMessageContent-module__container"]');
                if (contentContainer) {
                    textToSpeak = contentContainer.innerText;
                    const actionsText = actionsToolbar.innerText;
                    if (textToSpeak.includes(actionsText)) {
                        textToSpeak = textToSpeak.replace(actionsText, '').trim();
                    }
                }
            }
        }

        if (!textToSpeak || !textToSpeak.trim()) {
            alert('Copilot Enhancer: Could not find text to speak for this message.');
            console.warn('Copilot Enhancer: No text found. Message Turn Element:', messageTurnElement);
            return;
        }
        textToSpeak = textToSpeak.trim();

        // If another button's audio is playing/paused, stop it and reset that button.
        if (currentPlayingButton && currentPlayingButton !== thisButton) {
            chrome.runtime.sendMessage({
                action: 'controlTTSExtension',
                subAction: 'stopTTS', // Offscreen.js should handle this to stop and clear audio
                data: { textKey: currentPlayingButton.textKey } // Assuming we store textKey on button or retrieve it
            });
            // The state of currentPlayingButton will be updated via ttsStateUpdateFromBackground
        }
        currentPlayingButton = thisButton; // Set current button
        thisButton.textKey = textToSpeak; // Associate textKey with the button for state updates
        const currentState = thisButton.dataset.ttsState;

        if (currentState === 'loading') {
            // Optionally, implement cancellation here if desired
            console.log('Copilot Enhancer: TTS is already loading.');
            return;
        }

        if (currentState === 'playing') {
            chrome.runtime.sendMessage({
                action: 'controlTTSExtension',
                subAction: 'pauseTTS',
                data: { textKey: textToSpeak }
            });
        } else if (currentState === 'paused') {
            thisButton.dataset.ttsState = 'loading'; // Show loading while offscreen processes
            updateSpeakButtonIcon(thisButton, 'loading');
            if (ttsCache[textToSpeak]) {
                chrome.runtime.sendMessage({
                    action: 'playAudioInOffscreen', // This tells background to tell offscreen to play
                    data: { audioDataUrl: ttsCache[textToSpeak], textKey: textToSpeak }
                });
            } else {
                console.error('Copilot Enhancer: Cannot resume paused audio, data not in cache. Re-fetching.');
                thisButton.dataset.ttsState = 'idle'; // Reset and re-fetch
                updateSpeakButtonIcon(thisButton, 'idle');
                thisButton.click(); // Simulate a new click to fetch
            }
        } else { // State is 'idle' or 'error', fetch/play new
            thisButton.dataset.ttsState = 'loading';
            updateSpeakButtonIcon(thisButton, 'loading');

            if (ttsCache[textToSpeak]) {
                console.log('Copilot Enhancer: Playing from cache via offscreen.');
                chrome.runtime.sendMessage({
                    action: 'playAudioInOffscreen',
                    data: { audioDataUrl: ttsCache[textToSpeak], textKey: textToSpeak }
                }, (response) => {
                    if (chrome.runtime.lastError || !response || !response.success) {
                        console.error('Copilot Enhancer: Error initiating cached TTS playback:', chrome.runtime.lastError || response?.error);
                        thisButton.dataset.ttsState = 'error';
                        updateSpeakButtonIcon(thisButton, 'error');
                        // alert('Copilot Enhancer: Could not play cached TTS. ' + (chrome.runtime.lastError?.message || response?.error || 'Unknown error'));
                        if (currentPlayingButton === thisButton) currentPlayingButton = null;
                    }
                });
            } else {
                console.log('Copilot Enhancer: Fetching TTS from background (for offscreen playback).');
                chrome.runtime.sendMessage({ action: 'fetchTTS', data: { text: textToSpeak } }, (response) => {
                    if (chrome.runtime.lastError || !response) {
                        console.error('Copilot Enhancer: Error fetching TTS - No response or runtime error:', chrome.runtime.lastError);
                        thisButton.dataset.ttsState = 'error';
                        updateSpeakButtonIcon(thisButton, 'error');
                        // alert('Copilot Enhancer: Could not fetch TTS. ' + (chrome.runtime.lastError?.message || 'No response from background.'));
                        if (currentPlayingButton === thisButton) currentPlayingButton = null;
                        return;
                    }
                    if (response.success && response.audioDataUrl) {
                        console.log('Copilot Enhancer: TTS fetch successful, playback initiated via offscreen. Caching Data URL.');
                        ttsCache[textToSpeak] = response.audioDataUrl;
                    } else {
                        console.error('Copilot Enhancer: Error fetching TTS - Server/API error:', response.error);
                        thisButton.dataset.ttsState = 'error';
                        updateSpeakButtonIcon(thisButton, 'error');
                        // alert('Copilot Enhancer: Could not fetch TTS. ' + (response.error || 'Unknown error from background.'));
                        if (currentPlayingButton === thisButton) currentPlayingButton = null;
                    }
                });
            }
        }
    };

    // Insert buttons into the toolbar
    // The target HTML structure has a div wrapping the "Retry" button group.
    // We'll try to insert our buttons before that div.
    const modelPickerGroupWrapper = actionsToolbar.querySelector('div > div[class*="ModelPicker-module__messageRetryButtonGroup"]');

    if (modelPickerGroupWrapper && modelPickerGroupWrapper.parentElement.parentElement === actionsToolbar) {
        // Insert before the div that wraps the retry buttons
        actionsToolbar.insertBefore(speakButton, modelPickerGroupWrapper.parentElement);
        actionsToolbar.insertBefore(changeLangButton, modelPickerGroupWrapper.parentElement);
    } else {
        // Fallback: if the specific structure isn't found, append the buttons.
        // This might not be visually ideal but ensures they are added.
        const copyButton = actionsToolbar.querySelector('button > svg.octicon-copy');
        if (copyButton && copyButton.parentElement.nextElementSibling && copyButton.parentElement.nextElementSibling.nextElementSibling) {
            // Try to insert before the retry/model picker group if copy button is a good reference
             actionsToolbar.insertBefore(speakButton, copyButton.parentElement.nextElementSibling.nextElementSibling);
             actionsToolbar.insertBefore(changeLangButton, copyButton.parentElement.nextElementSibling.nextElementSibling);
        } else {
            actionsToolbar.appendChild(changeLangButton);
            actionsToolbar.appendChild(speakButton);
        }
        console.warn('Copilot Enhancer: Could not find preferred insertion point, appended buttons instead.');
    }
}

function showLanguageMenu(languages, button, messageTurnElement, actionsToolbar) {
    // Remove any existing menu first
    const oldMenu = actionsToolbar.querySelector('.copilot-language-menu');
    if (oldMenu) {
        oldMenu.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'copilot-language-menu';
    menu.style.top = (button.offsetTop + button.offsetHeight) + 'px';
    menu.style.left = button.offsetLeft + 'px';

    // Assuming 'languages' is an array of language names, e.g., ['english', 'spanish', 'french']
    // as derived from LANGUAGES.md via background.js
    if (Array.isArray(languages)) {
        languages.forEach(langName => {
            if (typeof langName !== 'string') {
                console.warn("Copilot Enhancer: Invalid language name in list:", langName);
                return; // Skip non-string entries
            }
            const langOption = document.createElement('div');
            // Capitalize for display: 'afrikaans' -> 'Afrikaans'
            const displayName = langName.charAt(0).toUpperCase() + langName.slice(1);
            langOption.textContent = displayName;
            langOption.className = 'copilot-language-menu-option';
            langOption.dataset.langName = langName; // Store the original name, e.g., 'afrikaans'

            langOption.onclick = (event) => {
                event.stopPropagation();
                const targetLangName = langOption.dataset.langName; // e.g., 'afrikaans'
                let originalText = '';

                // Logic to find originalText from the messageTurnElement
                if (messageTurnElement) {
                    // Prefer more specific content elements first
                    const markdownBody = messageTurnElement.querySelector('.markdown-body');
                    const responseContent = messageTurnElement.querySelector('[class*="MessageContent-module__messageContent"]');
                    const chatMessageContent = messageTurnElement.querySelector('div[class*="ChatMessageContent-module__container"]');

                    if (markdownBody) {
                        originalText = markdownBody.innerText;
                    } else if (responseContent) {
                        originalText = responseContent.innerText;
                    } else if (chatMessageContent) {
                        originalText = chatMessageContent.innerText;
                        // Clean up if it includes button text from the toolbar (less likely with specific selectors)
                        const actionsToolbarText = actionsToolbar.innerText;
                        if (originalText.includes(actionsToolbarText)) {
                            originalText = originalText.replace(actionsToolbarText, '').trim();
                        }
                    } else {
                         // Fallback to a broader search within the message turn element
                        originalText = messageTurnElement.innerText;
                        // Attempt to clean known button/toolbar text
                        const toolbarTextContent = actionsToolbar.innerText;
                        if (toolbarTextContent && originalText.includes(toolbarTextContent)) {
                            originalText = originalText.substring(0, originalText.indexOf(toolbarTextContent)).trim();
                        }
                    }
                }

                if (originalText && originalText.trim()) {
                    chrome.runtime.sendMessage({
                        action: 'translateText',
                        data: { text: originalText.trim(), targetLang: targetLangName } // Send language name
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('Error translating text:', chrome.runtime.lastError.message);
                            alert('Could not translate text: ' + chrome.runtime.lastError.message);
                            return;
                        }
                        if (response && response.translatedText) {
                            // Update the text in the UI
                            const markdownBody = messageTurnElement.querySelector('.markdown-body');
                            const responseContent = messageTurnElement.querySelector('[class*="MessageContent-module__messageContent"]');
                            const chatMessageContent = messageTurnElement.querySelector('div[class*="ChatMessageContent-module__container"]');

                            if (markdownBody) {
                                markdownBody.innerText = response.translatedText;
                            } else if (responseContent) {
                                responseContent.innerText = response.translatedText;
                            } else if (chatMessageContent) {
                                // Be careful with innerText on containers; might wipe out other elements.
                                // If possible, find the most specific text holding element.
                                // For now, this is a broad update.
                                chatMessageContent.innerText = response.translatedText;
                            } else {
                                // If no specific element found, this might be risky
                                console.warn("Copilot Enhancer: Could not find specific element to update with translated text. MessageTurnElement updated broadly.");
                                messageTurnElement.innerText = response.translatedText; // Fallback, less ideal
                            }
                        } else if (response && response.error) {
                            alert('Error from translation service: ' + response.error);
                        } else {
                            alert('Could not translate text. Unknown response from background script.');
                        }
                    });
                } else {
                    alert('Copilot Enhancer: Could not find text to translate in the message.');
                    console.warn("Copilot Enhancer: No text found for translation. MessageTurnElement:", messageTurnElement, "Toolbar:", actionsToolbar);
                }
                menu.remove(); // Close menu after selection
            };
            menu.appendChild(langOption);
        });
    } else {
        console.error('Copilot Enhancer: Languages data is not an array or is empty:', languages);
        const errorOption = document.createElement('div');
        errorOption.textContent = 'Error: Langs not loaded.';
        errorOption.className = 'copilot-language-menu-option';
        menu.appendChild(errorOption);
    }

    actionsToolbar.appendChild(menu);

    // Optional: Close menu when clicking outside
    // This can be tricky with event propagation.
    // A simple version:
    const closeMenuHandler = (event) => {
        if (!menu.contains(event.target) && event.target !== button) {
            menu.remove();
            document.body.removeEventListener('click', closeMenuHandler, true);
        }
    };
    // Use capture phase to catch clicks early
    document.body.addEventListener('click', closeMenuHandler, true);

}

// Function to find and process all relevant toolbars on the page
function processPageToolbars() {
    // Use a class selector that is likely to be stable for the actions toolbar
    const toolbars = document.querySelectorAll('div[class*="ChatMessage-module__actions"]');
    toolbars.forEach(toolbar => {
        // Further qualify by checking for a known existing button (e.g., feedback)
        if (toolbar.querySelector('button[class*="feedback-action"]')) {
            addCustomButtonsToToolbar(toolbar);
        }
    });
}

// GitHub Copilot chat UI loads content dynamically.
// Use MutationObserver to detect when new chat messages (and their toolbars) are added.
const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // If the added node itself is a toolbar we're looking for
                    if (node.matches('div[class*="ChatMessage-module__actions"]') && node.querySelector('button[class*="feedback-action"]')) {
                        addCustomButtonsToToolbar(node);
                    }
                    // Or, if the added node *contains* such toolbars
                    const newToolbars = node.querySelectorAll('div[class*="ChatMessage-module__actions"]');
                    newToolbars.forEach(toolbar => {
                        if (toolbar.querySelector('button[class*="feedback-action"]')) {
                           addCustomButtonsToToolbar(toolbar);
                        }
                    });
                }
            });
        }
    }
});

// Start observing the document body for additions of child elements, searching the whole subtree
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Initial run in case content is already present when the script loads
processPageToolbars();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ttsStateUpdateFromBackground') {
        console.log('Copilot Enhancer (Content): Received ttsStateUpdateFromBackground:', request.data);
        const { state, textKey, error, reason } = request.data;

        // Find the button associated with this TTS event
        // This requires that we've stored textKey on the button or have another way to identify it.
        // Let's assume addCustomButtonsToToolbar stores `button.textKey = textToSpeak;`
        let targetButton = null;
        const allSpeakButtons = document.querySelectorAll('.copilot-enhancer-button-speak');
        allSpeakButtons.forEach(btn => {
            if (btn.textKey === textKey) {
                targetButton = btn;
            }
        });

        if (targetButton) {
            console.log(`Copilot Enhancer (Content): Updating button for textKey: ${textKey.substring(0,30)}... to state: ${state}`);
            targetButton.dataset.ttsState = state;
            updateSpeakButtonIcon(targetButton, state);

            if (state === 'error') {
                alert('Copilot Enhancer: TTS Error - ' + (error || 'Unknown playback error.'));
            }

            if (state === 'playing') {
                // If another button was playing/paused, its state should be updated to idle by offscreen via background
                if (currentPlayingButton && currentPlayingButton !== targetButton) {
                    console.log('Copilot Enhancer (Content): Different button was active, ensuring its state is idle.');
                    currentPlayingButton.dataset.ttsState = 'idle';
                    updateSpeakButtonIcon(currentPlayingButton, 'idle');
                }
                currentPlayingButton = targetButton;
            } else if ((state === 'idle' || state === 'error') && currentPlayingButton === targetButton) {
                currentPlayingButton = null;
            } else if (state === 'paused' && currentPlayingButton !== targetButton) {
                 // This case (another button becomes paused while currentPlayingButton is set to something else)
                 // should ideally be handled by ensuring only one audio stream is 'active' (playing/paused)
                 // from the offscreen document's perspective. The offscreen.js tries to stop previous audio.
                 console.warn('Copilot Enhancer (Content): A button became paused but was not the currentPlayingButton.');
            }

        } else {
            console.warn('Copilot Enhancer (Content): Received TTS state update for an unknown button/textKey:', textKey.substring(0,30));
        }
        sendResponse({ success: true }); // Acknowledge message
        return true;
    } else if (request.action === 'translateResponse') {
        // ... (existing translation response handling, ensure it doesn't conflict)
        const { translatedText, originalText, error } = request.data;
        // ... (rest of your existing translation logic)
        // Find the response element that contains the originalText and update it
        const allResponseElements = document.querySelectorAll('.markdown-copilot-response-text-container'); // Adjust selector as needed
        allResponseElements.forEach(responseElement => {
            const currentResponseText = getCopilotResponseText(responseElement);
            if (currentResponseText === originalText) {
                const textContainer = responseElement.querySelector('div[class*="copilot-response-text--"]'); // Adjust selector
                if (textContainer) {
                    if (error) {
                        textContainer.innerHTML = `<p style="color: red;">Error translating: ${error}</p><hr><p>${originalText}</p>`;
                    } else {
                        textContainer.innerHTML = translatedText; // Assuming translatedText is HTML or safe to inject
                    }
                }
            }
        });
        sendResponse({status: 'Translation updated'});
        return true;
    }
    // Return true for async sendResponse, or false/undefined if not handling the message or handling synchronously.
    // If other listeners exist, ensure proper chaining or handling.
    return false; 
});

console.log('GitHub Copilot Chat Enhancer content script loaded and TTS logic updated.');


