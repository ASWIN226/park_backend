require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const passSchema = new mongoose.Schema({
  visitorName: String,
  email: String,
  passId: String,
  createdAt: { type: Date, expires: 3600, default: Date.now }
});

const Pass = mongoose.model("Pass", passSchema);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.post("/generate-pass", async (req, res) => {
  try {
    const { visitorName, email } = req.body;
    const passId = crypto.randomBytes(6).toString("hex");
    const pass = new Pass({ visitorName, email, passId });
    await pass.save();

    const passLink = `${process.env.FRONTEND_URL}/pass/${passId}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Entry Pass",
      html: `<h2>Your Entry Pass</h2>
             <p>Visitor: ${visitorName}</p>
             <p>Pass ID: ${passId}</p>
             <p><a href='${passLink}'>Click here to view your pass</a></p>
             <p>This pass is valid for 1 hour.</p>`
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Pass generated and email sent!" });
  } catch (error) {
    res.status(500).json({ message: "Error generating pass" });
  }
});

app.get("/pass/:passId", async (req, res) => {
  try {
    const pass = await Pass.findOne({ passId: req.params.passId });
    if (!pass) return res.status(404).json({ message: "Pass expired or not found" });
    res.json(pass);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving pass" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
