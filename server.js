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
        console.log("Fetched conversations:", JSON.stringify(conversations, null, 2));
        
        // Combine messages from all conversations
        return conversations.flatMap(conversation => conversation.messages);
    } catch (error) {
        console.error("Error fetching conversation history:", error);
        return [];
    }
}


// Function to insert data into MongoDB with structured format
async function insertData(userId, sessionId, userInput, modelResponse) {
    const database = client.db("conversationHistory");
    const collection = database.collection("conversation");

    const messageData = {
        sessionId,
        userId,
        messages: [
            { id: generateRandomString(8), role: "user", text: userInput },
            { id: generateRandomString(8), role: "model", text: modelResponse },
        ],
        timestamp: new Date().toISOString(),
    };

    try {
        const result = await collection.insertOne(messageData);
        console.log("Data inserted with id:", result.insertedId);
    } catch (error) {
        console.error("Error inserting data:", error);
    }
}

// Function to generate a random 8-character string
function generateRandomString(length) {
    return Math.random().toString(36).substr(2, length);
}

app.post("/api/chat", async (req, res) => {
    const userInput = req.body.input; // User input from the request
    const userId = 'defaultUser';
    const sessionId = 'defaultSession';
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
            generationConfig: { maxOutputTokens: 100 },
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
