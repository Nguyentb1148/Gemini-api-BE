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
async function fetchConversations() {
    try {
        console.log('Start fetching conversation summaries from MongoDB');
        const response = await fetch('http://localhost:3000/api/conversations/summary');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const conversations = await response.json();
        console.log('Fetched conversation summaries:', conversations);

        const conversationHistory = document.getElementById('sessionList');
        conversationHistory.innerHTML = ''; // Clear previous history

        // Update the session list with the fetched conversations
        updateSessionList(conversations);
    } catch (error) {
        console.error('Error fetching conversation summaries:', error);
    }
}

function updateSessionList(conversations) {
    const sessionList = document.getElementById('sessionList');
    sessionList.innerHTML = ''; // Clear previous sessions

    console.log('Conversations to display:', conversations); // Check the data

    // Ensure conversations is an array
    if (Array.isArray(conversations)) {
        conversations.forEach(conversation => {
            const sessionElement = document.createElement('li');
            sessionElement.textContent = conversation._id || 'No ID'; // Ensure something is displayed

            // Optional: Log for each session element created
            console.log('Creating session element:', sessionElement.textContent);

            sessionList.appendChild(sessionElement);
        });
    } else {
        console.warn('Conversations is not an array:', conversations);
    }
}
document.addEventListener('DOMContentLoaded', async () => {
    await fetchConversations(); // Fetch and display conversation history on page load

    // Update the event listener for sending messages
    document.getElementById('sendButton').addEventListener('click', async function (event) {
        event.preventDefault(); // Prevent the default button behavior

        const userInput = document.getElementById('userInput');
        const message = userInput.value.trim(); // Trim whitespace

        if (message !== "") {
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

    // Get all session items and add click event listeners after fetching conversations
    const sessionListItems = document.querySelectorAll('.session-list li');
    sessionListItems.forEach(item => {
        item.addEventListener('click', logSessionClick);
    });
});
