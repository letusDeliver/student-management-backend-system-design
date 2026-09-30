import { Router } from "express";
import {
  getAllStudents,
  getStudentById,
  createStudent,
} from "../controllers/studentController.js";

const router = Router();

router.get("/", getAllStudents);

router.get("/:id", getStudentById);

router.post("/", createStudent);

export default router;
