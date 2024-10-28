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

    try {
        const result = await model.generateContentStream([userInput]);
        let responseText = "";

        // This part is important to send each chunk back to the client
        for await (const chunk of result.stream) {
            responseText += chunk.text();
            // Send the current chunk to the client
            res.write(JSON.stringify({ response: chunk.text() })); // Stream each chunk as it arrives
        }

        const end = Date.now();
        console.log("Response time (ms):", end - start);
        res.end(); // End the response when the stream is complete
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
