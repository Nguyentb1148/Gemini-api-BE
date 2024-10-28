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
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const start = Date.now();
    let responseText = ""; // Initialize an empty string to accumulate responses

    try {
        // Using generateContentStream to collect all parts into one string
        const result = await model.generateContentStream([userInput]);

        // Collect all chunks into responseText
        for await (const chunk of result.stream) {
            responseText += chunk.text(); // Concatenate text from each chunk
        }

        // Send the complete response once all chunks are processed
        res.json({ response: responseText });

        console.log("Full Response:", responseText);

        const end = Date.now();
        console.log("Response time (ms):", end - start);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" }); // hi
    }
});
