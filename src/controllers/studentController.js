import { sendError, sendSuccess } from "../utils/apiResponse.js";
import * as studentRepository from "../repositories/studentRepository.js";
import * as departmentRepository from "../repositories/departmentRepository.js";

const getAllStudents = (req, res) => {
  const students = studentRepository.findAll();
  return sendSuccess(res, 200, students);
};

const getStudentById = (req, res) => {
  const studentId = Number(req.params.id);

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return sendError(
      res,
      400,
      "INVALID_ID",
      "Student id must be a positive integer",
    );
  }

  const studentData = studentRepository.findById(studentId);

  if (!studentData) {
    return sendError(
      res,
      404,
      "STUDENT_NOT_FOUND",
      `Student with id: ${studentId} not found`,
    );
  }

  return sendSuccess(res, 200, studentData);
};

const createStudent = async (req, res) => {
  // req.body is undefined when the request isn't JSON
  const { name, email, departmentId } = req.body ?? {};

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim()
  ) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "name and email are required",
    );
  }

  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Department id must be a positive integer",
    );
  }

  const department = await departmentRepository.findById(departmentId);

  if (!department) {
    return sendError(
      res,
      422,
      "INVALID_DEPARTMENT",
      `Department with id: ${departmentId} does not exist`,
    );
  }

  const newStudent = studentRepository.create({
    name: name.trim(),
    email: email.trim(),
    departmentId,
  });

  return sendSuccess(res, 201, newStudent);
};

export { getAllStudents, getStudentById, createStudent };
