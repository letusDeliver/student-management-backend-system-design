import { Router } from "express";
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
} from "../controllers/departmentController.js";

const router = Router();

router.get("/", getDepartments);
router.get("/:id", getDepartmentById);
router.post("/", createDepartment);

export default router;
