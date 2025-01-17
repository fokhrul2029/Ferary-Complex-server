const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { default: axios } = require("axios");

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
app.use(express.urlencoded());

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

const api_urls = {
  dev: "http://localhost:3000",
  prod: "https://b9-battle-for-supremacy-server-flame.vercel.app",
};

const client_urls = {
  dev: "http://localhost:5173",
  prod: "https://building-management-app-d8c65.web.app",
};

const api_url =
  process.env.RUNNING_ON === "development" ? api_urls.dev : api_urls.prod;

const client_url =
  process.env.RUNNING_ON === "development" ? client_urls.dev : client_urls.prod;

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
    const payments = database.collection("payments");

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

    // payment related routes

    app.post("/create-payment", async (req, res) => {
      const paymentInfo = req.body;

      const trx_id = new ObjectId();

      const initialPayment = {
        store_id: process.env.STORE_ID,
        store_passwd: process.env.STORE_PASS,
        total_amount: paymentInfo.apartmentRent,
        currency: "BDT",
        tran_id: trx_id,
        success_url: `${api_url}/success-payment`,
        fail_url: `${api_url}/fail-payment`,
        cancel_url: `${api_url}/cancel-payment`,
        cus_name: paymentInfo.userInfo.name,
        cus_email: paymentInfo.userInfo.email,
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: paymentInfo.userInfo.name,
        shipping_method: "NO",
        product_name: "Apartment",
        product_category: "Apartment",
        product_profile: "general",
        multi_card_name: "mastercard,visacard,amexcard",
        value_a: "ref001_A",
        value_b: "ref002_B",
        value_c: "ref003_C",
        value_d: "ref004_D",
      };

      const response = await axios.post(
        "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
        initialPayment,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      // console.log(response.data);

      const savePaymentData = {
        transactionID: trx_id,
        bank_tran_id: "",
        card_issuer: "",
        currency: "",
        amount: paymentInfo.apartmentRent,
        store_amount: "",
        userInfo: paymentInfo.userInfo,
        paymentCreatedDate: Date.now,
        tran_date: "",
        card_brand: "",
        month: paymentInfo.month,
        status: "pending",
      };

      const payment = await payments.insertOne(savePaymentData);

      if (payment) {
        res.send(response.data);
      } else {
        res.send({ message: "Something went wrong! Try later." });
      }
    });

    app.post("/success-payment", async (req, res) => {
      const body = req.body;

      if (body.status === "VALID") {
        const filter = {
          transactionID: new ObjectId(body.tran_id),
        };

        const updateDoc = {
          $set: {
            bank_tran_id: body.bank_tran_id,
            card_issuer: body.card_issuer,
            currency: body.currency,
            store_amount: body.store_amount,
            tran_date: body.tran_date,
            card_brand: body.card_brand,
            status: "success",
          },
        };

        await payments.updateOne(filter, updateDoc);

        res.redirect(`${client_url}/dashboard/success-payment`);
      } else {
        res.send({ message: "Error Found" });
      }

      // console.log("payment success", body);
    });

    app.post("/fail-payment", async (req, res) => {
      res.redirect(`${client_url}/dashboard/fail-payment`);
    });

    app.post("/cancel-payment", async (req, res) => {
      res.redirect(`${client_url}/dashboard/cancel-payment`);
    });

    // Normal Routes

    app.get("/", (req, res) => {
      res.send({ message: "Hello World" });
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

    app.get("/members", async (req, res) => {
      const query = { role: "member" };
      const result = (await users.find(query).toArray()).reverse();
      res.send(result);
    });

    app.put("/members/:id", async (req, res) => {
      const id = req.params;
      const filter = { _id: new ObjectId(id) };
      const doc = {
        $set: {
          role: "",
        },
      };
      await users.updateOne(filter, doc);
      res.send({ message: "Member successfully removed." });
    });

    app.get("/usersRole", async (req, res) => {
      const query = req.query;

      if (!query.email) {
        return res.status(400).send({ message: "Unauthorized" });
      }

      if (req?.query) {
        const result = await users.findOne({ email: query.email });
        res.send(result);
      } else {
        res.status(404).send({ message: "User not found" });
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
              _id: pendingApartment._id,
              name: pendingApartment.userInfo.name,
              email: pendingApartment.userInfo.email,
              floor_no: result.floor_no,
              block_name: result.block_name,
              apartment_no: result.apartment_no,
              request_date: pendingApartment.request_date,
              rent: result.rent,
            });
          }
        }
        res.send(apartmentDetails);
      } else {
        res.send([]);
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
          request_date: booked_apartment.request_date,
        };

        res.status(200).send(result);
      } else {
        res.send("You do not agreement to book.");
      }
    });

    app.get("/payment-history", async (req, res) => {
      const query = req.query;
      // console.log(query);
      if (!query.email) {
        res.send({ message: "Unauthorized" });
      }
      if (query.email) {
        const filter = { "userInfo.email": query.email, status: "success" };
        const result = await payments.find(filter).toArray();
        if (result.length > 0) {
          res.send(result);
        } else {
          res.send({ message: "No payment history available" });
        }
      }
    });

    app.patch("/bookedApartments/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const body = req.body;
        const userRole = body?.role === "member" ? "member" : "";

        const filter = { _id: new ObjectId(id) };

        const apartment = await bookedApartments.findOne(filter);

        const userEmail = apartment.userInfo.email;

        const filter2 = { email: userEmail };

        const today = new Date();
        const day = String(today.getDate()).padStart(2, "0");
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const year = today.getFullYear();

        const formattedDate = `${day}/${month}/${year}`;

        const updateDoc = {
          $set: {
            status: "checked",
            accept_date: userRole === "member" ? formattedDate : "rejected",
          },
        };
        const updateDoc2 = {
          $set: {
            role: userRole,
          },
        };
        await bookedApartments.updateMany(filter, updateDoc);
        await users.updateOne(filter2, updateDoc2);

        res.send({ status: 200, message: "Agreement Accept Success" });
      } catch (error) {
        res.send({ status: 400, message: "Something went wrong! try later." });
      }
    });

    app.post("/bookedApartments", async (req, res) => {
      const apartmentInfo = req.body;

      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      const requestDate = `${day}/${month}/${year}`;

      const doc = {
        apartment_id: apartmentInfo.apartment_id,
        userInfo: apartmentInfo.userInfo,
        status: "pending",
        request_date: requestDate,
      };
      // console.log(doc);

      const userEmail = apartmentInfo.userInfo.email;

      const query = { "userInfo.email": userEmail };

      const userRole = await users.findOne({ email: userEmail });

      if (userRole.role === "admin") {
        res.send({ message: "It's not available for you. Sorry!" });
      } else {
        const isExist = await bookedApartments.findOne(query);

        if (isExist) {
          res.send({ message: "User has already booked an apartment." });
        } else {
          await bookedApartments.insertOne(doc);
          res.send({ status: 200, message: "Apartment booking success" });
        }
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

app.listen(PORT);
