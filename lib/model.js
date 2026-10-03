const Module = require("../model/edge-impulse-standalone.js");

let initialization;

function plainObject(value, prototype) {
  const result = {};
  for (const key of Object.getOwnPropertyNames(prototype)) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
    if (descriptor && typeof descriptor.get === "function") result[key] = value[key];
  }
  return result;
}

function initialize() {
  if (initialization) return initialization;

  initialization = new Promise((resolve, reject) => {
    const finish = () => {
      try {
        const code = Module.init();
        if (typeof code === "number" && code !== 0) throw new Error(`Model initialization failed (${code})`);
        resolve();
      } catch (error) {
        initialization = undefined;
        reject(error);
      }
    };

    if (Module.calledRun) finish();
    else Module.onRuntimeInitialized = finish;
  });

  return initialization;
}

async function getModelMetadata() {
  await initialize();
  const project = plainObject(Module.get_project(), Module.emcc_classification_project_t.prototype);
  const properties = plainObject(Module.get_properties(), Module.emcc_classification_properties_t.prototype);
  return { project, properties };
}

async function classify(features) {
  await initialize();
  const typed = new Float32Array(features);
  const bytes = typed.length * typed.BYTES_PER_ELEMENT;
  const pointer = Module._malloc(bytes);

  try {
    new Uint8Array(Module.HEAPU8.buffer, pointer, bytes).set(new Uint8Array(typed.buffer));
    const inference = Module.run_classifier(pointer, features.length, false);
    if (inference.result !== 0) throw new Error(`Classification failed (${inference.result})`);

    const results = [];
    for (let index = 0; index < inference.size(); index += 1) {
      const item = inference.get(index);
      results.push({ label: item.label, value: item.value });
      item.delete();
    }
    inference.delete();
    return results;
  } finally {
    Module._free(pointer);
  }
}

module.exports = { classify, getModelMetadata };
