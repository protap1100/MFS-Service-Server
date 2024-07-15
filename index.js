require("dotenv").config();
const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcrypt");
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
    const database = client.db("Job-Task");
    const registerCollection = database.collection("userCollections");

    app.post("/users", async (req, res) => {
      const userData = req.body;
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      userData.password = hashedPassword;
      const result = await registerCollection.insertOne(userData);
      res.send(result);
    });

    app.post("/login", async (req, res) => {
      const { identifier, password } = req.body;
      const user = await registerCollection.findOne({
        $or: [{ email: identifier }, { number: identifier }],
      });
      if (!user) {
        return res.status(401).json({ message: "Invalid login credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid login credentials" });
      }

      res.json({ user });
    });

    app.get("/users", async (req, res) => {
      const result = await registerCollection.find().toArray();
      res.send(result);
    });

    app.put("/users/:id", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      try {
        const query = { _id: new ObjectId(id) };
        const updateDocument = {
          $set: {
            status: status,
          },
        };
        const result = await registerCollection.updateOne(
          query,
          updateDocument
        );
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "User not found" });
        }
        res.json({ message: "User status updated to verified" });
      } catch (error) {
        res.status(500).json({
          message: "An error occurred while updating the user status",
        });
      }
    });

    
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await registerCollection.deleteOne(query);
      res.send(result);
    });
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
