let conversationText = "";
let turnsHtml = "";

// Listen for messages from content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message in background script:", message);

  if (message.action === 'pageLoaded') {
    console.log("received pageLoaded");
    // Check if this is the tab we're waiting for
    browser.storage.local.get('newWindowId').then(result => {
      if (sender.tab.windowId === result.newWindowId) {
        // This is the new window we opened, inject the text
        console.log("This is the new window we opened");
        browser.tabs.sendMessage(sender.tab.id, {
          action: 'injectText',
          text: conversationText,
          turns: turnsHtml
        });
        // Clear the stored window id
        browser.storage.local.remove('newWindowId');
      }
    });
  } else if (message.action === 'openNewWindow') {
    console.log("received openNewWindow");
    // First, extract the conversation from the current tab
    browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
      browser.tabs.sendMessage(tabs[0].id, {action: 'extractConversation'}).then(response => {
        conversationText = response.conversationText;
        turnsHtml = response.turns;

        // Now open a new window
        browser.windows.create({
          url: "https://chatgpt.com/",
          type: "popup",
          width: 800,
          height: 600
        }).then(windowInfo => {
          // Store the newly created window's id
          browser.storage.local.set({newWindowId: windowInfo.id});
        });
      });
    });
  }
});