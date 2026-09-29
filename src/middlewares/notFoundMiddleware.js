import { sendError } from "../utils/apiResponse.js";

const notFoundMiddleware = (req, res) => {
  return sendError(
    res,
    404,
    "ROUTE_NOT_FOUND",
    `Route ${req.method} ${req.originalUrl} not found`,
  );
};

export default notFoundMiddleware;
