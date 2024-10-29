const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const tiktoken = require("tiktoken");
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

// Function to check and initialize MongoDB database and collection
async function connectDB() {
    try {
        console.log("Connecting to MongoDB at:", mongoUrl);
        await client.connect();
        console.log("Connected to MongoDB");

        // Check if the database and collection exist, and create if necessary
        const database = client.db("conversationHistory");
        const collection = database.collection("conversation");

        // Check if collection exists by listing collections
        const collections = await database.listCollections().toArray();
        const collectionExists = collections.some(coll => coll.name === "conversation");

        if (!collectionExists) {
            await database.createCollection("conversation");
            console.log("Collection 'conversation' created in MongoDB.");
        } else {
            console.log("Collection 'conversation' already exists in MongoDB.");
        }

        // Log all existing conversations
        await logAllConversations();

    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

async function logAllConversations() {
    const database = client.db("conversationHistory");
    const collection = database.collection("conversation");

    try {
        const conversations = await collection.find({}).toArray();
        console.log("Existing conversations in the 'conversation' collection:");
        
        // Log each conversation with expanded messages
        conversations.forEach(conversation => {
            console.log(`Session ID: ${conversation.sessionId}`);
            console.log(`User ID: ${conversation.userId}`);
            console.log(`Timestamp: ${conversation.timestamp}`);
            console.log("Messages:");
            conversation.messages.forEach(message => {
                console.log(` - [${message.role}] ${message.text}`);
            });
            console.log(); // Add a blank line for better readability
        });
    } catch (error) {
        console.error("Error fetching conversations:", error);
    }
}


// Function to generate a random 8-character string
function generateRandomString(length) {
    return Math.random().toString(36).substr(2, length);
}

// Function to insert data into MongoDB with structured format
async function insertData(userId, sessionId, userInput, modelResponse) {
    const database = client.db("conversationHistory");
    const collection = database.collection("conversation");

    // Format message structure
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

app.post("/api/chat", async (req, res) => {
    const userInput = req.body.input;
    const userId = 'defaultUser'; // Default userId
    const sessionId = 'defaultSession'; // Default sessionId
    let responseText = "";

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContentStream([userInput]);

        // Accumulate response text from the model
        for await (const chunk of result.stream) {
            responseText += chunk.text();
        }

        // Insert structured data into MongoDB
        await insertData(userId, sessionId, userInput, responseText);

        // Send the response to the client
        res.json({ response: responseText });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    connectDB(); // Connect to MongoDB when server starts
});
