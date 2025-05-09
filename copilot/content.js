function addCustomButtonsToToolbar(actionsToolbar) {
    // Prevent adding buttons multiple times to the same toolbar
    if (actionsToolbar.querySelector('.copilot-enhancer-button-speak')) {
        return;
    }

    // 1. Create "Change Language" button
    const changeLangButton = document.createElement('button');
    changeLangButton.innerHTML = `<img src="${chrome.runtime.getURL('languages.png')}" alt="Language">&nbsp;Lang`; // Image icon and text
    changeLangButton.title = 'Change Language (Not Implemented)';
    changeLangButton.className = 'copilot-enhancer-button copilot-enhancer-button-lang';
    // Apply GitHub's base button classes for styling
    changeLangButton.classList.add('prc-Button-ButtonBase-c50BI', 'prc-Button-IconButton-szpyj');
    changeLangButton.dataset.size = "medium";
    changeLangButton.dataset.variant = "invisible";

    changeLangButton.onclick = (event) => {
        // Prevent the click from propagating to document body if we add a global click listener later
        event.stopPropagation();
        const existingMenu = actionsToolbar.querySelector('.copilot-language-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        chrome.runtime.sendMessage({ action: 'getLanguages' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error getting languages:', chrome.runtime.lastError.message);
                alert('Could not load languages.');
                return;
            }
            if (response && response.languages) {
                const messageTurnElement = actionsToolbar.closest('div[data-testid^="chat-message-content-turn-"]');
                showLanguageMenu(response.languages, changeLangButton, messageTurnElement, actionsToolbar);
            }
        });
    };

    // 2. Create "Speak aloud" button
    const speakButton = document.createElement('button');
    speakButton.innerHTML = `<img src="${chrome.runtime.getURL('volume-2.png')}" alt="Speak">&nbsp;Speak`; // Image icon and text
    speakButton.title = 'Speak Aloud';
    speakButton.className = 'copilot-enhancer-button copilot-enhancer-button-speak';
    // Apply GitHub's base button classes
    speakButton.classList.add('prc-Button-ButtonBase-c50BI', 'prc-Button-IconButton-szpyj');
    speakButton.dataset.size = "medium";
    speakButton.dataset.variant = "invisible";

    speakButton.onclick = () => {
        let textToSpeak = '';
        // Find the parent element of the entire message turn
        const messageTurnElement = actionsToolbar.closest('div[data-testid^="chat-message-content-turn-"]');

        if (messageTurnElement) {
            // Find the element containing the rendered markdown response
            const markdownBody = messageTurnElement.querySelector('.markdown-body');
            if (markdownBody) {
                textToSpeak = markdownBody.innerText;
            } else {
                // Fallback if '.markdown-body' is not found (structure might vary)
                const contentContainer = messageTurnElement.querySelector('div[class*="ChatMessageContent-module__container"]');
                if (contentContainer) {
                    textToSpeak = contentContainer.innerText;
                    // Basic cleanup: remove text from the actions bar itself if it got included
                    const actionsText = actionsToolbar.innerText;
                    if (textToSpeak.includes(actionsText)) {
                        textToSpeak = textToSpeak.replace(actionsText, '').trim();
                    }
                }
                console.warn('Copilot Enhancer: ".markdown-body" not found, used fallback selector.');
            }
        }

        if (textToSpeak && textToSpeak.trim()) {
            const utterance = new SpeechSynthesisUtterance(textToSpeak.trim());
            // You can add language selection logic here if "Change Language" is implemented
            // utterance.lang = 'es-ES'; // Example for Spanish
            speechSynthesis.cancel(); // Stop any currently playing speech
            speechSynthesis.speak(utterance);
        } else {
            alert('Copilot Enhancer: Could not find text to speak for this message.');
            console.warn('Copilot Enhancer: No text found. Message Turn Element:', messageTurnElement);
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
    // Basic styling - this should be improved in styles.css
    menu.style.position = 'absolute';
    menu.style.backgroundColor = 'white';
    menu.style.border = '1px solid #ccc';
    menu.style.padding = '5px';
    menu.style.zIndex = '1000';
    menu.style.maxHeight = '200px';
    menu.style.overflowY = 'auto';
    // Position it near the button
    menu.style.top = (button.offsetTop + button.offsetHeight) + 'px';
    menu.style.left = button.offsetLeft + 'px';


    Object.entries(languages).forEach(([code, name]) => {
        const langOption = document.createElement('div');
        langOption.textContent = name;
        langOption.style.padding = '5px';
        langOption.style.cursor = 'pointer';
        langOption.onmouseover = () => langOption.style.backgroundColor = '#f0f0f0';
        langOption.onmouseout = () => langOption.style.backgroundColor = 'white';
        langOption.dataset.langCode = code;

        langOption.onclick = (event) => {
            event.stopPropagation(); // Prevent menu from closing immediately if it's part of actionsToolbar
            const targetLangCode = langOption.dataset.langCode;
            let originalText = '';

            if (messageTurnElement) {
                const markdownBody = messageTurnElement.querySelector('.markdown-body');
                if (markdownBody) {
                    originalText = markdownBody.innerText;
                } else {
                    const contentContainer = messageTurnElement.querySelector('div[class*="ChatMessageContent-module__container"]');
                    if (contentContainer) {
                        originalText = contentContainer.innerText;
                        const actionsText = actionsToolbar.innerText;
                        if (originalText.includes(actionsText)) {
                            originalText = originalText.replace(actionsText, '').trim();
                        }
                    }
                }
            }

            if (originalText && originalText.trim()) {
                chrome.runtime.sendMessage({
                    action: 'translateText',
                    data: { text: originalText.trim(), targetLang: targetLangCode }
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error translating text:', chrome.runtime.lastError.message);
                        alert('Could not translate text.');
                        return;
                    }
                    if (response && response.translatedText) {
                        const markdownBody = messageTurnElement.querySelector('.markdown-body');
                        if (markdownBody) {
                            markdownBody.innerText = response.translatedText;
                        } else {
                             const contentContainer = messageTurnElement.querySelector('div[class*="ChatMessageContent-module__container"]');
                             if(contentContainer){
                                // Attempt to preserve some structure if possible, though innerText replacement is simpler
                                // For now, just replace the most likely content holder
                                contentContainer.innerText = response.translatedText;
                             }
                        }
                    }
                });
            } else {
                alert('Copilot Enhancer: Could not find text to translate.');
            }
            menu.remove(); // Close menu after selection
        };
        menu.appendChild(langOption);
    });

    // Add menu to the actions toolbar (or a more suitable parent if actionsToolbar clips content)
    // Using button.offsetParent or a specific container might be better for positioning.
    // For now, let's append to actionsToolbar and rely on absolute positioning.
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

console.log('GitHub Copilot Chat Enhancer content script loaded.');

