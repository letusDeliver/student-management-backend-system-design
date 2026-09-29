import express from "express";
import errorMiddleware from "./middlewares/errorMiddleware.js";
import notFoundMiddleware from "./middlewares/notFoundMiddleware.js";
import { sendError, sendSuccess } from "./utils/apiResponse.js";

const app = express();
app.use(
  express.json({
    limit: "100kb",
  }),
);

let students = [{ id: 1, name: "Kunal", email: "kunal@example.com" }];
let nextId = 2;

app.get("/", (req, res) => {
  return sendSuccess(res, 200, { message: "Server is up and running" });
});

app.get("/health", (req, res) => {
  return res.status(200).json({ status: "ok" });
});

app.get("/api/students", (req, res) => {
  return sendSuccess(res, 200, students);
});

app.get("/api/students/:id", (req, res) => {
  const studentId = Number(req.params.id);

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return sendError(res, 400, "INVALID_ID", "Student id must be a positive integer");
  }

  const studentData = students.find((student) => student.id === studentId);

  if (!studentData) {
    return sendError(
      res,
      404,
      "STUDENT_NOT_FOUND",
      `Student with id: ${studentId} not found`,
    );
  }

  return sendSuccess(res, 200, studentData);
});

app.post("/api/students", (req, res) => {
  // req.body is undefined when the request isn't JSON
  const { name, email } = req.body ?? {};

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim()
  ) {
    return sendError(res, 400, "VALIDATION_ERROR", "name and email are required");
  }

  const newStudent = {
    id: nextId++,
    name: name.trim(),
    email: email.trim(),
  };

  students.push(newStudent);

  return sendSuccess(res, 201, newStudent);
});

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
