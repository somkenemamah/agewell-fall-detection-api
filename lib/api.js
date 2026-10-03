const { classify, getModelMetadata } = require("./model");

const FALL_LABEL = "Falling Down";
const DEFAULT_THRESHOLD = 0.6;
const EXPECTED_FEATURES = 375;
const EXPECTED_SAMPLES = 125;

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function configuredThreshold() {
  const raw = Number(process.env.FALL_DETECTION_THRESHOLD ?? DEFAULT_THRESHOLD);
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : DEFAULT_THRESHOLD;
}

function toFeatures(body) {
  if (!body || typeof body !== "object") throw new ApiError(400, "The request body must be a JSON object.");

  let features;
  if (Array.isArray(body.features)) {
    features = body.features;
  } else if (Array.isArray(body.samples)) {
    if (body.samples.length !== EXPECTED_SAMPLES) {
      throw new ApiError(400, `samples must contain exactly ${EXPECTED_SAMPLES} accelerometer readings.`);
    }
    features = body.samples.flatMap((sample, index) => {
      if (Array.isArray(sample) && sample.length === 3) return sample;
      if (sample && typeof sample === "object") return [sample.x, sample.y, sample.z];
      throw new ApiError(400, `samples[${index}] must be [x, y, z] or { x, y, z }.`);
    });
  } else {
    throw new ApiError(400, "Provide either features or samples.");
  }

  if (features.length !== EXPECTED_FEATURES) {
    throw new ApiError(400, `The model requires exactly ${EXPECTED_FEATURES} numeric features.`);
  }
  const numbers = features.map(Number);
  if (numbers.some((value) => !Number.isFinite(value))) {
    throw new ApiError(400, "All accelerometer values must be finite numbers.");
  }
  return numbers;
}

function checkApiKey(headers) {
  const expected = process.env.FALL_DETECTION_API_KEY;
  if (expected && headers.get("x-api-key") !== expected) throw new ApiError(401, "Invalid or missing API key.");
}

function corsHeaders(origin) {
  const configured = (process.env.ALLOWED_ORIGINS || "*").split(",").map((item) => item.trim());
  const allowed = configured.includes("*") ? "*" : configured.includes(origin) ? origin : configured[0];
  return {
    "access-control-allow-origin": allowed,
    "access-control-allow-headers": "content-type,x-api-key",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "content-type": "application/json; charset=utf-8",
    "vary": "Origin"
  };
}

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders(origin) });
}

async function handleDetect(request) {
  const origin = request.headers.get("origin") || "";
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, origin);

  try {
    checkApiKey(request.headers);
    let body;
    try { body = await request.json(); }
    catch { throw new ApiError(400, "The request body must be valid JSON."); }

    const features = toFeatures(body);
    const started = performance.now();
    const scores = await classify(features);
    const inferenceMs = Number((performance.now() - started).toFixed(2));
    const prediction = scores.reduce((best, item) => item.value > best.value ? item : best, scores[0]);
    const fallScore = scores.find((item) => item.label === FALL_LABEL)?.value ?? 0;
    const threshold = configuredThreshold();

    return json({
      fallDetected: fallScore >= threshold,
      fallScore,
      threshold,
      predictedActivity: prediction.label,
      confidence: prediction.value,
      scores: Object.fromEntries(scores.map(({ label, value }) => [label, value])),
      inferenceMs,
      modelWindow: { samples: EXPECTED_SAMPLES, frequencyHz: 62.5, durationSeconds: 2 }
    }, 200, origin);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    if (status === 500) console.error(error);
    return json({ error: status === 500 ? "Inference failed." : error.message }, status, origin);
  }
}

async function handleHealth(request) {
  const origin = request.headers.get("origin") || "";
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405, origin);
  try {
    const { project, properties } = await getModelMetadata();
    return json({
      status: "ok",
      model: { name: project.name, version: project.deploy_version, labels: properties.labels },
      input: { features: properties.input_features_count, samples: properties.frame_sample_count, frequencyHz: properties.frequency }
    }, 200, origin);
  } catch (error) {
    console.error(error);
    return json({ status: "error" }, 503, origin);
  }
}

module.exports = { handleDetect, handleHealth, toFeatures };
