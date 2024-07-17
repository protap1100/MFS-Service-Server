require("dotenv").config();
const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcrypt");
const port = process.env.PORT || 5000;

// Middleware
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

    // Register user with hashed PIN
    app.post("/users", async (req, res) => {
      const userData = req.body;
      try {
        const hashedPin = await bcrypt.hash(userData.pin, 10);
        userData.pin = hashedPin;
        const result = await registerCollection.insertOne(userData);
        res.send(result);
      } catch (error) {
        console.error("Error registering user:", error);
        res
          .status(500)
          .json({ message: "An error occurred during registration" });
      }
    });

    // Login user with hashed PIN
    app.post("/login", async (req, res) => {
      const { identifier, pin } = req.body;
      // console.log(identifier,pin)
      try {
        const user = await registerCollection.findOne({
          $or: [{ email: identifier }, { number: identifier }],
        });
        if (!user) {
          console.log("User not found with identifier:", identifier);
          return res.status(401).json({ message: "Invalid login credentials" });
        }
        const isValidPin = await bcrypt.compare(pin, user.pin);
        if (!isValidPin) {
          console.log("Invalid PIN for user:", identifier);
          return res.status(401).json({ message: "Invalid login credentials" });
        }
        res.json({ user });
      } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "An error occurred during login" });
      }
    });

    // Get all users
    app.get("/users", async (req, res) => {
      try {
        const result = await registerCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching users:", error);
        res
          .status(500)
          .json({ message: "An error occurred while fetching users" });
      }
    });

    // Update user status
    app.put("/users/:id", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;
      try {
        const query = { _id: new ObjectId(id) };
        const updateDocument = {
          $set: { status: status },
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
        console.error("Error updating user status:", error);
        res.status(500).json({
          message: "An error occurred while updating the user status",
        });
      }
    });

    app.get("/users/:email", async (req, res) => {
      const userEmail = req.params.email;
      let query = {};
      if (req.params?.email) {
        query = { email: userEmail };
      }
      const cursor = await registerCollection.findOne(query);
      res.send(cursor);
    });

    // Delete user
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const query = { _id: new ObjectId(id) };
        const result = await registerCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Error deleting user:", error);
        res
          .status(500)
          .json({ message: "An error occurred while deleting the user" });
      }
    });

    // Send Money
    app.post("/send-money", async (req, res) => {
      const { sendNumber, sendAmount, sendPin, senderNumber } = req.body;
      try {
        const sender = await registerCollection.findOne({
          number: senderNumber,
        });
        const receiver = await registerCollection.findOne({
          number: sendNumber,
        });
        if (!sender) {
          return res
            .status(404)
            .json({ message: "Sender number not found in the database" });
        }
        if (!receiver) {
          return res
            .status(404)
            .json({ message: "Receiver number not found in the database" });
        }
        const isValidPin = await bcrypt.compare(sendPin, sender.pin);
        if (!isValidPin) {
          return res.status(401).json({ message: "Invalid PIN" });
        }
        if (sender.taka < sendAmount) {
          return res.status(400).json({ message: "Insufficient balance" });
        }
        const session = client.startSession();
        session.startTransaction();
        try {
          await registerCollection.updateOne(
            { number: senderNumber },
            { $inc: { taka: -parseFloat(sendAmount) } },
            { session }
          );
          await registerCollection.updateOne(
            { number: sendNumber },
            { $inc: { taka: parseFloat(sendAmount) } },
            { session }
          );
          await session.commitTransaction();
          res.json({ message: "Money sent successfully" });
        } catch (error) {
          await session.abortTransaction();
          console.error("Error during transaction:", error);
          res
            .status(500)
            .json({ message: "An error occurred while sending money" });
        } finally {
          session.endSession();
        }
      } catch (error) {
        console.error("Error sending money:", error);
        res
          .status(500)
          .json({ message: "An error occurred while sending money" });
      }
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run();

app.get("/", (req, res) => {
  res.send("MFS Service Is Running");
});

app.listen(port, () => {
  console.log(`MFS Service Is Running On ${port}`);
});
