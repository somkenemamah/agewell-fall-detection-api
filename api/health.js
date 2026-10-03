const { handleHealth } = require("../lib/api");

module.exports = async function handler(req, res) {
  const request = new Request(`https://${req.headers.host || "localhost"}${req.url || "/api/health"}`, { method: req.method, headers: req.headers });
  const response = await handleHealth(request);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.status(response.status).send(await response.text());
};
