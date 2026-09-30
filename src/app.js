import express from "express";
import errorMiddleware from "./middlewares/errorMiddleware.js";
import notFoundMiddleware from "./middlewares/notFoundMiddleware.js";
import { sendSuccess } from "./utils/apiResponse.js";
import studentRoutes from "./routes/studentRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";

const app = express();
app.use(
  express.json({
    limit: "100kb",
  }),
);

app.get("/", (req, res) => {
  return sendSuccess(res, 200, { message: "Server is up and running" });
});

app.get("/health", (req, res) => {
  return res.status(200).json({ status: "ok" });
});

app.use("/api/students", studentRoutes);
app.use("/api/departments", departmentRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
