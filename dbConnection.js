const { MongoClient } = require("mongodb");

const mongoUrl = "mongodb+srv://GeminiChatbotaccount:LagHStFp9ufGwXg3@geminichatboxclone.u13na.mongodb.net/?retryWrites=true&w=majority&appName=GeminiChatboxClone"; // replace with your MongoDB URL
const client = new MongoClient(mongoUrl);

// Add this function to fetch conversations for a specific user

connectDB();
