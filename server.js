const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve static files from the 'public' directory

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

app.post("/api/chat", async (req, res) => {
    const userInput = req.body.input;
    const context = req.body.context; // Get context from request
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const start = Date.now();
    let responseText = "";

    try {
        const prompt = `${context}\nYou: ${userInput}\n`; // Create a prompt with context
        const result = await model.generateContentStream([prompt]);

        for await (const chunk of result.stream) {
            responseText += chunk.text();
        }

        // Format the response to avoid repeating previous answers
        const formattedResponse = formatResponse(responseText);
        res.json({ response: formattedResponse });

        console.log("Full Response:", formattedResponse);
        const end = Date.now();
        console.log("Response time (ms):", end - start);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

let lastResponse = ""; // Tracks the previous response to avoid repetition

function formatResponse(responseText) {
    const cleanedResponse = responseText
        .replace(lastResponse, "") // Remove any repeated text from the last response
        .replace(/You:/g, "") // Optionally remove the "You:" text in responses
        .trim(); // Clean up extra spaces

    lastResponse = cleanedResponse; // Update last response
    return cleanedResponse;
}


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});