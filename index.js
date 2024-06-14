const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");

// MiddleWares
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://building-management-app-d8c65.web.app",
      "https://building-management-app-d8c65.firebaseapp.com",
    ],
  })
);
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

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    // await client.connect();
    // await client.db("admin").command({ ping: 1 });

    const database = client.db("Ferary-Complex");
    const slides = database.collection("slides");
    const apartments = database.collection("apartments");
    const coupons = database.collection("coupons");
    const users = database.collection("users");
    const bookedApartments = database.collection("bookedApartments");

    //creating Token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);

      res.send({ token });
    });

    //clearing Token
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

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

    app.post("/bookedApartments", async (req, res) => {
      const apartmentInfo = req.body;
      const doc = {
        apartment_id: apartmentInfo.apartment_id,
        userInfo: apartmentInfo.userInfo,
        status: "pending",
      };
      // console.log(doc);

      const userEmail = apartmentInfo.userInfo.email;

      const query = { "userInfo.email": userEmail };

      const isExist = await bookedApartments.findOne(query);

      if (isExist) {
        res.send({ message: "User has already booked an apartment." });
      } else {
        const result = await bookedApartments.insertOne(doc);
        res.send({ result, message: "Apartment booking success" });
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
