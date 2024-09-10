// content.js
console.log("ChatGPT Conversation Brancher content script loaded");

let buttonAdded = false;
let conversationText = "";
let turnsHtml = null;

function addBranchButton() {
  console.log("Attempting to add branch buttons");
  const conversationTurns = document.querySelectorAll('[data-testid^="conversation-turn-"]');
  console.log(`Found ${conversationTurns.length} conversation turns`);

  conversationTurns.forEach((turn, index) => {
    if (!turn.querySelector('[aria-label="Branch Conversation"]')) {
      console.log(`Adding button to conversation turn ${index + 1}`);
      const branchButton = document.createElement('button');
      branchButton.className = 'branch-button rounded-md p-1 text-token-text-secondary hover:bg-token-main-surface-secondary';
      branchButton.setAttribute('aria-label', 'Branch Conversation');
      branchButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="6" y1="3" x2="6" y2="15"></line>
          <circle cx="18" cy="6" r="3"></circle>
          <circle cx="6" cy="18" r="3"></circle>
          <path d="M18 9a9 9 0 0 1-9 9"></path>
        </svg>
      `;
      branchButton.addEventListener('click', handleBranchClick);

      // Find a suitable place to insert the button
      const textMessage = turn.querySelector('.text-message');
      if (textMessage) {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center mt-2';
        wrapper.appendChild(branchButton);
        textMessage.parentNode.insertBefore(wrapper, textMessage.nextSibling);
        console.log(`Branch button added successfully to conversation turn ${index + 1}`);
      } else {
        console.log(`Text message not found for conversation turn ${index + 1}`);
      }
    } else {
      console.log(`Button already exists for conversation turn ${index + 1}`);
    }
  });

  buttonAdded = conversationTurns.length > 0;
}

function handleBranchClick(event) {
  console.log('Branch button clicked');

  // Find the current message container
  const messageContainer = event.target.closest('[data-testid^="conversation-turn-"]');
  if (!messageContainer) {
    console.error('Could not find the message container');
    return;
  }

  // Get all conversation turns up to and including the current one
  const allTurns = Array.from(document.querySelectorAll('[data-testid^="conversation-turn-"]'));
  const currentIndex = allTurns.indexOf(messageContainer);
  const relevantTurns = allTurns.slice(0, currentIndex + 1);
  turnsHtml = relevantTurns.map(turn => turn.outerHTML);
  console.log(turnsHtml);
  // Extract and format the conversation content
  conversationText = 'The following is an ongoing conversation between us:\n\n';

  relevantTurns.forEach(turn => {
    const role = turn.querySelector('h5, h6')?.textContent.replace(':', '') || 'Unknown';
    const content = turn.querySelector('.text-message')?.textContent || '';
    conversationText += `${role}: ${content}\n\n`;
  });

  conversationText += "\nLet us continue naturally with the conversation.\n";

  browser.runtime.sendMessage({action: 'openNewWindow'})
}

function checkForConversationTurns() {
  //console.log("Checking for conversation turns...");
  const conversationTurns = document.querySelectorAll('[data-testid^="conversation-turn-"]');
  if (conversationTurns.length > 0) {
    //console.log(`Found ${conversationTurns.length} conversation turns. Adding branch buttons.`);
    addBranchButton();
  } else {
    //console.log("No conversation turns found. Checking again in 1 second.");
    setTimeout(checkForConversationTurns, 1000);
  }
}

function checkForTextarea() {
  const textarea = document.getElementById('prompt-textarea');
  if (textarea) {
    console.log("Textarea found. Proceeding with further actions.");
    browser.runtime.sendMessage({action: 'pageLoaded'});
  } else {
    console.log("Textarea not found. Checking again in 1 second.");
    setTimeout(checkForTextarea, 1000);
  }
}

function init() {
  console.log("Initializing ChatGPT Conversation Brancher");
  checkForConversationTurns();
  checkForTextarea();

  // Listen for new messages and add the button to them
  const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      if (mutation.type === 'childList') {
        const addedNodes = mutation.addedNodes;
        for (let node of addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && node.matches('[data-testid^="conversation-turn-"]')) {
            console.log("New conversation turn detected, adding branch button");
            addBranchButton();
            break;
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log("MutationObserver set up");
}

function checkForTurn3(message) {
  // Remove the article elements created by submitting the context
  const contextNode3 = document.querySelector('[data-testid="conversation-turn-3"]');

  if (contextNode3) {
    const contextNode2 = document.querySelector('[data-testid="conversation-turn-2"]');
    if (contextNode2) {
      contextNode2.remove();
    }
    const parentElement = contextNode3.parentNode;
    contextNode3.remove();
    console.log("Try to insertAdjacentHTML" + message.turns + " to parentNode=" + parentElement);
    setTimeout(() => parentElement.insertAdjacentHTML('beforeend', message.turnsHtml), 3000);

  } else {
    // Use setTimeout to call the function again after 1000ms (1 second)
    setTimeout(() => checkForTurn3(message), 1000);
  }
}

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'injectText') {
    console.log("Received injectText, returning response");
    const sidebarDiv = document.querySelector('div.flex-shrink-0.overflow-x-hidden[style="width: 260px;"]');
    if (sidebarDiv) {
      sidebarDiv.style.display = 'none';
    }
    const textarea = document.querySelector('#prompt-textarea');
    if (textarea) {
      textarea.value = message.text;
      // Trigger an input event to make sure ChatGPT recognizes the new text
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      // Simulate pressing Enter
      const enterKeyEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        keyCode: 13,
        which: 13,
        key: 'Enter'
      });
      textarea.dispatchEvent(enterKeyEvent);

      // Find and click the submit button (as a fallback)
      const submitButton = document.querySelector('button[data-testid="send-button"]');
      if (submitButton) {
        submitButton.click();
      }
      // Remove any visible turns and replace with conversation
      checkForTurn3(message);
    }
    sendResponse({success: true});
  } else if (message.action === 'extractConversation') {
    // Send the extracted conversation back to the background script
    console.log("Received extractConversation, returning response");
    sendResponse({conversationText: conversationText, turns: turnsHtml});

    conversationText = "";
    turnsHtml = null;
  }
  return true; // Indicates that the response will be sent asynchronously
});

init();