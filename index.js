const express = require("express");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const { OAuth2 } = google.auth;
// const Web3 = require("web3");

const app = express();
app.use(express.json());

const CLIENT_ID =
  "406318036210-sfqrdapda44vgaeshrbm4nma7ebguhb1.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "http://localhost:3000/auth/google/callback";
const REFRESH_TOKEN = "https://oauth2.googleapis.com/token";
//PLACEHOLDER FOR JWT_SECRET
const JWT_SECRET = "";
const ETHEREUM_PROVIDER = "";
const CONTRACT_ADDRESS = "";

// [TODO - ETHEREUM CONTRACTT OBJECY]
const CONTRACT_ABI = [];

const oAuth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: "YOUR_EMAIL",
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    refreshToken: REFRESH_TOKEN,
    accessToken: oAuth2Client.getAccessToken(),
  },
});

let users = [];

// Connect to Ethereum network
// const web3 = new Web3(ETHEREUM_PROVIDER);
// const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

app.get("/", (req, res) => {
  res.send("Hello, Web3!");
});

app.post("/login", (req, res) => {
  const { email, method } = req.body;

  const user = users.find((user) => user.email === email);
  if (!user) {
    const newUser = { email };
    users.push(newUser);
  }

  const token = jwt.sign({ email }, JWT_SECRET);

  res.cookie("token", token, { httpOnly: true });

  if (method === "otp") {
    const otp = Math.floor(100000 + Math.random() * 900000);
    const mailOptions = {
      from: "YOUR_EMAIL",
      to: email,
      subject: "OTP Verification",
      text: `Your OTP: ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to send OTP." });
      } else {
        console.log("OTP email sent:", info.response);
        res.json({ message: "OTP sent successfully." });
      }
    });
  } else if (method === "google") {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/userinfo.email"],
    });
    res.redirect(authUrl);
  }
});

app.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    const googleApi = google.people({ version: "v1", auth: oAuth2Client });
    const { data } = await googleApi.people.get({
      resourceName: "people/me",
      personFields: "emailAddresses,names",
    });

    const email = data.emailAddresses[0].value;
    const user = users.find((user) => user.email === email);

    if (!user) {
      const newUser = { email };
      users.push(newUser);
    }

    const token = jwt.sign({ email }, JWT_SECRET);

    res.cookie("token", token, { httpOnly: true });

    res.redirect("/me");
  } catch (error) {
    console.error("Google OAuth2 callback error:", error);
    res.status(500).json({ error: "Failed to log in with Google." });
  }
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully." });
});

app.get("/me", async (req, res) => {
  const token = req.cookies.token;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const email = decoded.email;

    const user = users.find((user) => user.email === email);

    if (!user) {
      res.status(404).json({ error: "User not found." });
    } else {
      //   const balance = await contract.methods.getBalance(email).call();
      user.balance = 0;

      res.json({ email, user });
    }
  } catch (error) {
    console.error("JWT verification error:", error);
    res.status(401).json({ error: "Invalid token." });
  }
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
