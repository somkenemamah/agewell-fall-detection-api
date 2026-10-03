import api from "../../lib/api.js";

export default (request) => api.handleHealth(request);

export const config = { path: "/api/health" };
