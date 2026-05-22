import express from "express";
import path from "path";
import { config } from "dotenv";
import { fileURLToPath } from "url";
const app = express();
const PORT = process.env.PORT || 3002;
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import https from "https";
import { ApiError } from "../shared/utils/ApiError.js";
import {
  globalError,
  unmatchedRouteHandler,
} from "../shared/middlewares/errorMiddleware.js";
import { dbConnection } from "../config/database.js";
import { mountRoutes } from "./routes.js";
import { i18nMiddleware } from "../shared/middlewares/i18nMiddleware.js";
import { startBookingExpiryJob } from "../shared/jobs/bookingExpiryJob.js";
import { startPaymentReconciliationJob } from "../shared/jobs/paymentReconciliationJob.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "../../.env") });

// CORS – accept all origins (with credentials support)
app.use(cors({ origin: true, credentials: true }));

// middlewares
app.set("trust proxy", 1);
app.use(express.urlencoded({ extended: false }));
app.use(express.json({
  verify: (req, _res, buf) => {
    // Preserve raw body for webhook signature verification
    if (req.originalUrl?.includes("/webhook")) {
      req.rawBody = buf.toString("utf8");
    }
  },
}));
app.use(express.static(path.join(__dirname, "uploads")));
app.use(cookieParser());
app.use(compression());
app.use(i18nMiddleware);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode: ${process.env.NODE_ENV}`);
}

//helmet
app.use(helmet());
// DB connecetion
dbConnection();

// Mount Routes
mountRoutes(app);

// Start background jobs
startBookingExpiryJob();
startPaymentReconciliationJob();

app.get("/", (req, res) => {
  res.send("Charlie Hotel API is running.");
});

app.use(unmatchedRouteHandler);

// Global error handling middleware
app.use(globalError);

const server = app.listen(PORT, () =>
  console.log(`Example app listening on port ${PORT}!`),
);

// UnhandledRejections event handler (rejection outside express)
process.on("unhandledRejection", (err) => {
  console.error(
    `unhandledRejection Errors: ${err.name} | ${err.message} | ${err.stack}`,
  );
  server.close(() => {
    console.log("server shutting down...");
    process.exit(1);
  });
});
