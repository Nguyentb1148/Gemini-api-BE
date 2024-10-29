async function handleBotResponse(response) {
    const text = await response.text();
    console.log('Raw Response:', text); // Log the raw response text for debugging

    try {
        // Combine all the response segments into one single string
        const segments = text.match(/{"response":".*?"}/g); // Extract individual JSON objects
        const combinedResponse = segments.map(segment => JSON.parse(segment).response).join(' '); // Parse and join

        console.log('Combined Response:', combinedResponse); // Log the combined response

        const cleanedResponse = combinedResponse
            .replace(/(\*\*.*?\*\*)/g, '<strong>$1</strong>') // Convert double asterisks to strong tags
            .replace(/```(.*?)\n([\s\S]*?)```/g, (match, lang, code) => createCodeSnippet(lang, code).outerHTML) // Convert code blocks
            .replace(/\*\s*(.*?)\s*\*/g, '<code>$1</code>') // Convert single asterisks to code tags for inline code
            .replace(/\n/g, '<br>') // Replace newlines with HTML line breaks
            .trim(); // Trim leading and trailing whitespace

        console.log('Cleaned Response:', cleanedResponse); // Log cleaned response
        appendMessage(cleanedResponse, 'bot'); // Use the cleaned HTML directly
    } catch (error) {
        console.error('Error parsing response:', error);
        appendMessage("Sorry, there was an error retrieving the response.", 'bot');
    }
}
function createCodeSnippet(language, code) {
    // Create a div for the code snippet
    const codeSnippetContainer = document.createElement('div');
    codeSnippetContainer.classList.add('code-snippet');

    // Create a pre and code element for highlight.js
    const pre = document.createElement('pre');
    const codeElement = document.createElement('code');
    
    // Set the language class for highlight.js
    codeElement.className = `language-${language}`;
    codeElement.textContent = code; // Set the code text

    // Append code to pre, then pre to the container
    pre.appendChild(codeElement);
    codeSnippetContainer.appendChild(pre);

    // Highlight the code
    hljs.highlightElement(codeElement);

    return codeSnippetContainer;
}


function formatGeminiResponse(responseText) {
    const responseContainer = document.createElement('div');
    responseContainer.classList.add('bot-message');

    // Split the response into sections based on formatting markers
    const sections = responseText.split(/(?=<strong>|<li>)/g); // Match bold and list items

    sections.forEach(section => {
        section = section.trim();

        if (section.startsWith('<li>')) {
            const listItem = document.createElement('li');
            listItem.innerHTML = section.replace('<li>', '').replace('</li>', ''); // Use innerHTML to allow HTML tags
            responseContainer.appendChild(listItem);
        } else {
            if (section.startsWith('<strong>') && section.endsWith('</strong>')) {
                const boldElement = document.createElement('p');
                boldElement.innerHTML = section; // Use innerHTML to allow HTML tags
                responseContainer.appendChild(boldElement);
            } else if (section) {
                const textElement = document.createElement('p');
                textElement.innerHTML = section; // Use innerHTML to render any HTML tags
                responseContainer.appendChild(textElement);
            }
        }
    });

    // Create a styled unordered list if there are list items
    if (responseContainer.querySelector('li')) {
        const ul = document.createElement('ul');
        responseContainer.childNodes.forEach(child => {
            if (child.tagName === 'LI') {
                ul.appendChild(child);
            }
        });
        responseContainer.innerHTML = ''; // Clear the container
        responseContainer.appendChild(ul); // Append the list to the container
    }

    return responseContainer;
}

function appendMessage(message, type) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');

    if (type === 'user') {
        messageElement.classList.add('user-message');
        messageElement.textContent = message; // For user messages, keep as textContent for safety
    } else {
        messageElement.classList.add('bot-message');
        messageElement.innerHTML = message; // Use innerHTML for bot messages to render HTML
    }

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to the bottom
}
async function fetchConversations(userId) {
    try {
        console.log('Start fetching data from MongoDB');
        const response = await fetch(`/api/conversations/${userId}`); // Use a relative URL
        const conversations = await response.json();
        console.log('Fetched conversations:', conversations); // Log the fetched conversations for debugging

        const conversationHistory = document.getElementById('conversationHistory');
        conversationHistory.innerHTML = ''; // Clear previous history

        // Check if conversations is an array
        if (Array.isArray(conversations)) {
            // Iterate through the conversations and create elements for each
            conversations.forEach(conversation => {
                // Ensure each conversation object has the expected properties
                if (conversation.input && conversation.response) {
                    const messageElement = document.createElement('div');
                    messageElement.classList.add('conversation-message'); // Optional class for styling
                    messageElement.innerHTML = `<strong>You:</strong> ${conversation.input}<br /><strong>Bot:</strong> ${conversation.response}`;
                    conversationHistory.appendChild(messageElement);
                } else {
                    console.warn('Invalid conversation object:', conversation);
                }
            });
        } else {
            console.error('Expected an array of conversations, but received:', conversations);
        }

        // Update session list
        updateSessionList(conversations);
    } catch (error) {
        console.error('Error fetching conversation history:', error);
    }
}



function updateSessionList(conversations) {
    const sessionList = document.getElementById('sessionList');
    sessionList.innerHTML = ''; // Clear previous sessions

    // Create a unique list of session IDs
    const sessionIds = new Set(conversations.map(conversation => conversation.sessionId));

    sessionIds.forEach(sessionId => {
        const sessionElement = document.createElement('div');
        sessionElement.classList.add('session-item'); // Optional class for styling
        sessionElement.textContent = sessionId; // Display session ID
        sessionList.appendChild(sessionElement);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const userId = 'tranbaonguyen'; // Set the userId for fetching conversations
    await fetchConversations(userId); // Fetch and display conversation history on page load
});

// Update the event listener for sending messages
document.getElementById('sendButton').addEventListener('click', async function (event) {
    event.preventDefault(); // Prevent the default button behavior

    const userInput = document.getElementById('userInput');
    const message = userInput.value;
    
    if (message.trim() !== "") {
        appendMessage('You: ' + message, 'user'); // Display user's message
        userInput.value = ''; // Clear the input

        try {
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ input: message }),
            });

            await handleBotResponse(response); // Handle bot response
        } catch (error) {
            console.error('Error:', error);
            appendMessage('Sorry, there was an error.', 'bot'); // Display error message
        }
    }
});
