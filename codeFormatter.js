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

// Example usage (You can call this function when you receive a response)
function appendCodeSnippetToChat(language, code) {
    const chatMessages = document.getElementById('chatMessages');
    const codeSnippet = createCodeSnippet(language, code);
    
    // Append the code snippet to chat messages
    chatMessages.appendChild(codeSnippet);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to the bottom
}
// codeFormatter.js
function formatCodeSnippet(code, language) {
    // Create a code block element
    const codeBlock = document.createElement('pre');
    codeBlock.className = 'code-snippet';

    // Create a code element
    const codeElement = document.createElement('code');
    codeElement.className = `language-${language}`; // Highlight.js class for the specific language
    codeElement.textContent = code; // Set the code content

    // Append code element to code block
    codeBlock.appendChild(codeElement);

    // Highlight the code using highlight.js
    hljs.highlightBlock(codeElement);

    return codeBlock;
}

