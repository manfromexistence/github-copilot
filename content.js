function addCustomButtonsToToolbar(actionsToolbar) {
    // Prevent adding buttons multiple times to the same toolbar
    if (actionsToolbar.querySelector('.copilot-enhancer-button-speak')) {
        return;
    }

    // 1. Create "Change Language" button
    const changeLangButton = document.createElement('button');
    changeLangButton.innerHTML = '🌐&nbsp;Lang'; // Emoji and text
    changeLangButton.title = 'Change Language (Not Implemented)';
    changeLangButton.className = 'copilot-enhancer-button copilot-enhancer-button-lang';
    // Apply GitHub's base button classes for styling
    changeLangButton.classList.add('prc-Button-ButtonBase-c50BI', 'prc-Button-IconButton-szpyj');
    changeLangButton.dataset.size = "medium";
    changeLangButton.dataset.variant = "invisible";
    changeLangButton.style.padding = '0 8px'; // Adjust padding to match other icon buttons
    changeLangButton.style.marginRight = '4px'; // Spacing

    changeLangButton.onclick = () => {
        alert('Change Language functionality is not yet implemented.');
        // TODO: Implement language selection logic
    };

    // 2. Create "Speak aloud" button
    const speakButton = document.createElement('button');
    speakButton.innerHTML = '🗣️&nbsp;Speak'; // Emoji and text
    speakButton.title = 'Speak Aloud';
    speakButton.className = 'copilot-enhancer-button copilot-enhancer-button-speak';
    // Apply GitHub's base button classes
    speakButton.classList.add('prc-Button-ButtonBase-c50BI', 'prc-Button-IconButton-szpyj');
    speakButton.dataset.size = "medium";
    speakButton.dataset.variant = "invisible";
    speakButton.style.padding = '0 8px';
    speakButton.style.marginRight = '4px';

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
