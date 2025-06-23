import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import { registerRoutes } from "./routes.js";

// Initialize Firebase Admin
initializeApp();

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload());

// Register API routes
registerRoutes(app);

// Export the Express app as a Firebase Function
export const api = onRequest(app);