# AgeWell Fall Detection API

A small serverless API that runs the supplied Edge Impulse WebAssembly model. It can deploy to Netlify or Vercel.

## Model input

The model expects a 2-second accelerometer window:

- 125 readings
- 62.5 Hz (one reading every 16 ms)
- x, y and z values for each reading
- 375 numeric features in total

Send readings in chronological order. The sensor units and phone/watch orientation must match the data used to train the Edge Impulse project.

## API

### `POST /api/fall-detection`

Recommended request:

```json
{
  "samples": [
    { "x": -0.14, "y": 0.52, "z": 9.71 },
    { "x": -0.11, "y": 0.48, "z": 9.75 }
  ]
}
```

The `samples` array must contain exactly 125 readings. Each reading may also be an array such as `[x, y, z]`. Advanced clients can send `{ "features": [375 numbers] }`.

Example response:

```json
{
  "fallDetected": false,
  "fallScore": 0.03,
  "threshold": 0.6,
  "predictedActivity": "Standing",
  "confidence": 0.91,
  "scores": {
    "Dropping": 0.01,
    "Falling Down": 0.03,
    "Standing": 0.91
  },
  "inferenceMs": 18.4,
  "modelWindow": { "samples": 125, "frequencyHz": 62.5, "durationSeconds": 2 }
}
```

`fallDetected` is true when the `Falling Down` score is at least `FALL_DETECTION_THRESHOLD` (default `0.60`). A mobile app should confirm the event with the user before notifying trusted contacts whenever possible; this API does not send alerts or store sensor data.

### `GET /api/health`

Checks that the WebAssembly model can initialize and reports its labels and required input size.

## Configuration

Copy `.env.example` settings into the hosting provider's environment-variable dashboard. If `FALL_DETECTION_API_KEY` is set, clients must include it as an `x-api-key` header. Do not embed a permanent secret in a publicly distributed mobile app; use proper user authentication before production.

## Test locally

```sh
npm install
npm test
npx netlify dev
```

Then call `http://localhost:8888/api/health`.

## Deploy to Netlify

```sh
npx netlify login
npx netlify init
npx netlify deploy
npx netlify deploy --prod
```

Use the preview deployment first. The included `netlify.toml` packages the model files with each function.

## Deploy to Vercel

```sh
npx vercel
npx vercel --prod
```

The included `vercel.json` packages the model files with each function.

## Important safety note

Fall detection is probabilistic and can produce false positives or miss real falls. Test with data collected from the intended device and placement, add a user-cancellation countdown, and do not present this prototype as a medical device or as a substitute for emergency services.

During API smoke testing, an artificial all-zero input was classified as `Falling Down` with high confidence. This is a reminder that missing sensor data must not be represented as zeroes. The mobile app should reject incomplete windows and the model should be evaluated with held-out, real-device recordings before field use.
