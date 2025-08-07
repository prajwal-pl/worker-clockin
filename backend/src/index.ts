import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { auth, ConfigParams, requiresAuth } from "express-openid-connect";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

const config: ConfigParams = {
  authRequired: false,
  auth0Logout: true,
  baseURL: process.env.BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  secret: process.env.AUTH0_SECRET,
  clientSecret: process.env.CLIENT_SECRET,
  authorizationParams: {
    response_type: "code id_token",
  },
};

app.use(cors());
app.use(express.json());
app.use(auth(config));

app.get("/", async (req, res) => {
  const token = req.oidc.accessToken;

  if (token) {
    console.log("Access Token:", token.access_token);
    try {
      const userInfo = await req.oidc.fetchUserInfo();
      console.log(
        `Logged In: ${
          req.oidc.user?.name
        }. User authenticated: ${JSON.stringify(userInfo)}`
      );
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  } else {
    console.log("No Access Token available");
  }

  res.send(
    req.oidc.isAuthenticated()
      ? `Logged In: ${req.oidc.user?.name}.`
      : "Logged out"
  );
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
