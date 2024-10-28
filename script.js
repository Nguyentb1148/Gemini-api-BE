function formatGeminiResponse(data) {
    // Check if data and data.response are defined
    if (!data || !data.response) {
        const errorContainer = document.createElement('div');
        errorContainer.textContent = "Invalid response from the server.";
        return errorContainer; // Return an error message
    }

    // Extract the response string
    const responseText = data.response;

    // Create a container for the formatted response
    const responseContainer = document.createElement('div');
    responseContainer.classList.add('bot-message');

    // Split the text into sections based on code blocks
    const sections = responseText.split(/(?=\`\`\`c#)/g); // Match code blocks starting with '```c#'

    sections.forEach(section => {
        // Trim whitespace
        section = section.trim();

        if (section.startsWith('```c#')) {
            // Detect code block for C#
            const codeBlock = section.replace(/```c#/g, '').replace(/```/g, '').trim();
            const codeElement = document.createElement('pre');
            codeElement.classList.add('code-block');

            // Format the code
            codeElement.innerHTML = formatCode(codeBlock);
            responseContainer.appendChild(codeElement);
        } else {
            // Regular text handling can be added here if needed
            const textElement = document.createElement('p');
            textElement.textContent = section;
            responseContainer.appendChild(textElement);
        }
    });

    return responseContainer;
}

// Function to format code with specific styles
function formatCode(code) {
    // Replace keywords, methods, data types, and comments with span elements
    return code
        .replace(/(class|static|void|int|string|using|namespace|if|else|return|while|for|foreach)/g, '<span class="keyword">$1</span>')
        .replace(/(\w+\s*\([^)]*\)\s*{)/g, '<span class="method">$1</span>') // Match methods/functions
        .replace(/(int|string|double|float|bool)/g, '<span class="datatype">$1</span>') // Match data types
        .replace(/(\/\/.*?$)/gm, '<span class="comment">$1</span>'); // Match comments
}


function appendMessage(message, type) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');

    if (type === 'user') {
        messageElement.classList.add('user-message');
        messageElement.textContent = message;
    } else {
        messageElement.classList.add('bot-message');
        const formattedResponse = formatGeminiResponse(message);
        messageElement.appendChild(formattedResponse);
    }

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to the bottom
}
// Update the user and bot message calls
async function handleBotResponse(response) {
    const data = await response.json();
    console.log(data); // Log the response for debugging

    // Check if the response property exists
    if (data && data.response) {
        appendMessage(data, 'bot'); // Send as bot message
    } else {
        appendMessage("Sorry, there was an error retrieving the response.", 'bot');
    }
}


document.getElementById('sendButton').addEventListener('click', async function () {
    const userInput = document.getElementById('userInput');
    const message = userInput.value;

    if (message.trim() !== "") {
        appendMessage('You: ' + message, 'user'); // Send as user message
        userInput.value = ''; // Clear the input

        try {
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ input: message }),
            });

            await handleBotResponse(response); // Handle the bot response
        } catch (error) {
            console.error('Error:', error);
            appendMessage('Sorry, there was an error.', 'bot'); // Send error message
        }
    }
});

