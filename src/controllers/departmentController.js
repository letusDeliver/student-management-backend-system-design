import { sendSuccess, sendError } from "../utils/apiResponse.js";

const departments = [{ id: 1, name: "Computer Science & Engg", code: "CSE" }];
let nextId = 2;

const getDepartments = (req, res) => {
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

  const departmentData = departments.find(
    (department) => department.id === departmentId,
  );

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

  // Clean and uppercase the code
  const normalizedCode = code.trim().toUpperCase();

  // Check if code already exists
  const codeExists = departments.some(
    (department) => department.code === normalizedCode,
  );

  if (codeExists) {
    return sendError(
      res,
      409,
      "DEPARTMENT_CODE_EXISTS",
      "Department code already exists",
    );
  }

  const newDepartment = {
    id: nextId++,
    name: name.trim(),
    code: normalizedCode,
  };

  departments.push(newDepartment);

  return sendSuccess(res, 201, newDepartment);
};

export { getDepartments, getDepartmentById, createDepartment };
