import { sendError } from "../utils/apiResponse.js";

const errorMiddleware = (err, req, res, next) => {
  console.error(err);

  if (err.type === "entity.parse.failed") {
    return sendError(res, 400, "INVALID_JSON", "Request body contains invalid JSON");
  }

  if (err.type === "entity.too.large") {
    return sendError(res, 413, "PAYLOAD_TOO_LARGE", "Request body is too large");
  }

  return sendError(res, 500, "INTERNAL_ERROR", "Something went wrong");
};

export default errorMiddleware;
