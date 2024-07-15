require("dotenv").config();
const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const port = process.env.PORT || 5000;

// MiddleWare
app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // Define the collections
    const database = client.db("Village-Management");
    const registerCollection = database.collection("Projects");






  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run();

app.get("/", (req, res) => {
  res.send("Village Management Is Running");
});

app.listen(port, () => {
  console.log(`Village Management is running on port ${port}`);
});
