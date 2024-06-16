const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    credentials: true,
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
  secure: process.env.RUNNING_ON === "production",
  sameSite: process.env.RUNNING_ON === "production" ? "none" : "strict",
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
    const announcements = database.collection("announcements");

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

    app.get("/announcements", async (req, res) => {
      const result = (await announcements.find().toArray()).reverse();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const data = req.body;

      // Check if the email already exists
      const existingUser = await users.findOne({ email: data.email });

      if (existingUser) {
        res.send({ message: "Login Success" });
      } else {
        const doc = {
          name: data.name,
          email: data.email,
          role: "",
        };
        await users.insertOne(doc);
        res.send({ message: "Registration Success" });
      }
    });

    app.get("/bookedApartments", async (req, res) => {
      const query = { status: "pending" };
      const pendingApartments = await bookedApartments.find(query).toArray();
      // res.send(pendingApartments)
      if (pendingApartments.length > 0) {
        const apartmentDetails = [];

        for (pendingApartment of pendingApartments) {
          const apartmentId = pendingApartment.apartment_id;
          const apartmentQuery = { _id: new ObjectId(apartmentId) };
          const result = await apartments.findOne(apartmentQuery);
          if (result) {
            apartmentDetails.push({
              name: pendingApartment.userInfo.name,
              email: pendingApartment.userInfo.email,
              floor_no: result.floor_no,
              block_name: result.block_name,
              apartment_no: result.apartment_no,
              rent: result.rent,
            });
          }
        }
        res.send(apartmentDetails);
      }
    });

    app.get("/bookedApartments/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "userInfo.email": email };

      const booked_apartment = await bookedApartments.findOne(query);

      if (booked_apartment) {
        const apartmentId = booked_apartment.apartment_id;

        const apartmentQuery = { _id: new ObjectId(apartmentId) };

        const apartmentInfo = await apartments.findOne(apartmentQuery);

        const result = {
          _id: booked_apartment._id,
          image: apartmentInfo.image,
          block_name: apartmentInfo.block_name,
          apartment_no: apartmentInfo.apartment_no,
          floor_no: apartmentInfo.floor_no,
          rent: apartmentInfo.rent,
          status: booked_apartment.status,
        };

        res.status(200).send(result);
      } else {
        res.send("You do not agreement to book.");
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
        await bookedApartments.insertOne(doc);
        res.send({ status: 200, message: "Apartment booking success" });
      }
    });

    app.post("/announcements", async (req, res) => {
      const body = req.body;
      await announcements.insertOne(body);
      res.send({ message: "Announcement successfully added." });
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
