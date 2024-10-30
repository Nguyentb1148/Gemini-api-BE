const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion } = require("mongodb");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// MongoDB connection setup
const mongoUrl = "mongodb+srv://nguyentb1148:PPhCj6Vm7DDQWatq@geminichatboxclonedb.q6ybh.mongodb.net/?retryWrites=true&w=majority&appName=GeminiChatboxCloneDb";
const client = new MongoClient(mongoUrl, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Function to connect to MongoDB
async function connectDB() {
    try {
        console.log("Connecting to MongoDB.");
        await client.connect();
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Function to fetch conversation history for a given sessionId
async function fetchConversationHistory(sessionId) {
    const database = client.db("conversationHistory");
    const collection = database.collection("conversation");
    
    try {
        // Use find() to get all conversations with the specified sessionId
        const conversations = await collection.find({ sessionId }).toArray();
        // Log all conversations fetched from MongoDB
        // console.log("Fetched conversations:", JSON.stringify(conversations, null, 2));
        
        // Combine messages from all conversations
        return conversations.flatMap(conversation => conversation.messages);
    } catch (error) {
        console.error("Error fetching conversation history:", error);
        return [];
    }
}

// Function to insert or update conversation data in MongoDB
async function insertData(userId, sessionId, userInput, modelResponse) {
    const database = client.db("conversationHistory");
    const collection = database.collection("conversation");

    const newMessages = [
        { id: generateRandomString(8), role: "user", text: userInput },
        { id: generateRandomString(8), role: "model", text: modelResponse },
    ];

    try {
        const result = await collection.updateOne(
            { sessionId, userId }, // Find the document with matching sessionId and userId
            {
                $push: { messages: { $each: newMessages } }, // Append new messages to the messages array
                $setOnInsert: { timestamp: new Date().toISOString() } // Set timestamp only if a new document is created
            },
            { upsert: true } // Create a new document if no match is found
        );
        
        if (result.upsertedId) {
            console.log("New session created with id:", result.upsertedId);
        } else {
            console.log("Existing session updated");
        }
    } catch (error) {
        console.error("Error inserting or updating data:", error);
    }
}


// Function to generate a random 8-character string
function generateRandomString(length) {
    return Math.random().toString(36).substr(2, length);
}
app.get('/api/conversations/summary', async (req, res) => {
    try {
        const Conversation = client.db("conversationHistory").collection("conversation");

        const summaries = await Conversation.aggregate([
            {
                $group: {
                    _id: "$sessionId",
                    userId: { $first: "$userId" },
                    messageCount: { $sum: { $size: "$messages" } },
                    timestamp: { $first: "$timestamp" },
                }
            }
        ]).toArray(); // Add .toArray() to aggregate results

        if (summaries.length === 0) {
            console.warn("No summaries found.");
        }

        // console.log('Aggregated summaries:', summaries);
        res.json(summaries);
    } catch (error) {
        console.error('Error fetching conversation summaries:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

app.post("/api/chat", async (req, res) => {
    const userInput = req.body.input; // User input from the request
    const userId = 'defaultUser456';
    const sessionId = 'defaultSession456';
    let responseText = "";

    try {
        // Fetch conversation history
        const conversationHistory = await fetchConversationHistory(sessionId);
        
        // Prepare the history for the chat model
        const history = conversationHistory.map(message => ({
            role: message.role,
            parts: [{ text: message.text }]
        }));

        // Add the new user input to the history
        history.push({
            role: "user",
            parts: [{ text: userInput }]
        });

        // Start chat with the combined history
        const chat = model.startChat({
            history, // Use the modified history
            generationConfig: { maxOutputTokens: 1000 },
        });

        const result = await chat.sendMessage(userInput); // Send message

        // Access the response text correctly
        if (result && result.response && result.response.candidates) {
            responseText = result.response.candidates[0].content.parts[0].text || "No response text found.";
        } else {
            responseText = "I'm not sure how to respond.";
        }

        // Insert data into MongoDB
        await insertData(userId, sessionId, userInput, responseText);
        res.json({ response: responseText });
    } catch (error) {
        console.error("Error:", error.message);
        console.error(error.stack);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    connectDB(); // Connect to MongoDB when server starts
});
