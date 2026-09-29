import http from "node:http";
import "dotenv/config";

const PORT = Number(process.env.PORT) || 3000;

let students = [{ id: 1, name: "Kunal", email: "kunal@example.com" }];
let nextId = 2;

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function errorPayload(code, message) {
  return {
    success: false,
    error: { code, message },
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const { pathname } = url;
  const method = req.method;

  // GET /health
  if (method === "GET" && pathname === "/health") {
    return sendJson(res, 200, { status: "ok" });
  }

  // GET /api/students
  if (method === "GET" && pathname === "/api/students") {
    return sendJson(res, 200, {
      success: true,
      data: students,
    });
  }

  // GET /api/students/:id
  if (method === "GET" && pathname.startsWith("/api/students/")) {
    const parts = pathname.split("/").filter(Boolean); // ["api", "students", "1"]

    if (parts.length !== 3) {
      return sendJson(
        res,
        404,
        errorPayload("ROUTE_NOT_FOUND", `Route ${method} ${req.url} not found`),
      );
    }

    const id = Number(parts[2]);

    if (!Number.isInteger(id)) {
      return sendJson(
        res,
        400,
        errorPayload("INVALID_ID", "Student id must be an integer"),
      );
    }

    const student = students.find((student) => student.id === id);

    if (!student) {
      return sendJson(
        res,
        404,
        errorPayload("STUDENT_NOT_FOUND", "Student not found"),
      );
    }

    return sendJson(res, 200, {
      success: true,
      data: student,
    });
  }

  // POST /api/students
  if (method === "POST" && pathname === "/api/students") {
    const chunks = [];
    const MAX_BODY_BYTES = 100 * 1024; // 100kb
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        sendJson(
          res,
          413,
          errorPayload("PAYLOAD_TOO_LARGE", "Request body too large"),
        );
        req.destroy(); // stop reading the stream
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      const rawBody = Buffer.concat(chunks).toString("utf8");

      let body;

      try {
        body = JSON.parse(rawBody);
      } catch {
        return sendJson(
          res,
          400,
          errorPayload("INVALID_JSON", "Request body contains invalid JSON"),
        );
      }

      const { name, email } = body ?? {};

      if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof email !== "string" ||
        !email.trim()
      ) {
        return sendJson(
          res,
          400,
          errorPayload("VALIDATION_ERROR", "name and email are required"),
        );
      }

      const newStudent = {
        id: nextId++,
        name: name.trim(),
        email: email.trim(),
      };

      students.push(newStudent);

      return sendJson(res, 201, {
        success: true,
        data: newStudent,
      });
    });

    return;
  }

  // Anything else
  return sendJson(
    res,
    404,
    errorPayload("ROUTE_NOT_FOUND", `Route ${method} ${req.url} not found`),
  );
});

server.listen(PORT, () => {
  console.log(`server is running on http://localhost:${PORT}`);
});
