import api from "../../lib/api.js";

export default (request) => api.handleDetect(request);

export const config = { path: "/api/fall-detection" };
