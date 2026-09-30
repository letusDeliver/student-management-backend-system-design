import { sendSuccess, sendError } from "../utils/apiResponse.js";
import * as departmentRepository from "../repositories/departmentRepository.js";

const getDepartments = (req, res) => {
  const departments = departmentRepository.findAll();
  return sendSuccess(res, 200, departments);
};

const getDepartmentById = (req, res) => {
  const departmentId = Number(req.params.id);

  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    return sendError(
      res,
      400,
      "INVALID_ID",
      "Department id must be a positive integer",
    );
  }

  const departmentData = departmentRepository.findById(departmentId);

  if (!departmentData) {
    return sendError(
      res,
      404,
      "DEPARTMENT_NOT_FOUND",
      `Department with id: ${departmentId} not found`,
    );
  }

  return sendSuccess(res, 200, departmentData);
};

const createDepartment = (req, res) => {
  // req.body is undefined when the request isn't JSON
  const { name, code } = req.body ?? {};

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof code !== "string" ||
    !code.trim()
  ) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "name and code are required",
    );
  }

  const normalizedCode = code.trim().toUpperCase();

  const departmentData = departmentRepository.findByCode(normalizedCode);

  if (departmentData) {
    return sendError(
      res,
      409,
      "DEPARTMENT_CODE_EXISTS",
      "Department code already exists",
    );
  }

  const newDepartment = departmentRepository.create({
    name: name.trim(),
    code: normalizedCode,
  });

  return sendSuccess(res, 201, newDepartment);
};

export { getDepartments, getDepartmentById, createDepartment };
