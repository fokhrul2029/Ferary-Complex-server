const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");

// MiddleWares
app.use(cors());

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
