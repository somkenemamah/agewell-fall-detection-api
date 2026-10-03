const { getModelMetadata } = require("../lib/model");

getModelMetadata().then((metadata) => console.log(JSON.stringify(metadata, null, 2))).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
