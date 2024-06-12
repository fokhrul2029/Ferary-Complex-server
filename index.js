const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");

// MiddleWares
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zebesho.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    // await client.db("admin").command({ ping: 1 });

    const database = client.db("Ferary-Complex");
    const slides = database.collection("slides");
    const apartments = database.collection("apartments");
    const coupons = database.collection("coupons");
    const users = database.collection("users");

    app.get("/", (req, res) => {
      res.send("Hello World");
    });

    app.get("/slides", async (req, res) => {
      const result = await slides.find().toArray();
      res.send(result);
    });

    app.get("/apartments", async (req, res) => {
      const result = await apartments.find().toArray();
      res.send(result);
    });
    app.get("/coupons", async (req, res) => {
      const result = (await coupons.find().toArray()).reverse();
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = (await users.find().toArray()).reverse();
      res.send(result);
    });
    app.get("/usersRole", async (req, res) => {
      const query = req.query;

      if (!query.email) {
        return res.status(400).send({ error: "Email parameter is required" });
      }

      if (req?.query) {
        const result = await users.findOne({ email: query.email });
        res.send(result);
      } else {
        res.status(404).send({ error: "User not found" });
      }
    });

    app.post("/users", async (req, res) => {
      const data = req.body;

      // Check if the email already exists
      const existingUser = await users.findOne({ email: data.email });

      if (existingUser) {
        res.status(400).send({ error: "Email already in use" });
      } else {
        const doc = {
          name: data.name,
          email: data.email,
          role: "",
        };
        const result = await users.insertOne(doc);
        res.send(result);
      }
    });

    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(PORT, console.log(`App is running on ${PORT}`));
