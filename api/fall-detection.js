const { handleDetect } = require("../lib/api");

module.exports = async function handler(req, res) {
  const url = `https://${req.headers.host || "localhost"}${req.url || "/api/fall-detection"}`;
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body)
  });
  const response = await handleDetect(request);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.status(response.status).send(await response.text());
};
