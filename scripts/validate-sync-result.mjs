import { readFileSync } from "node:fs";

const allowedActions = new Set(["promoted", "skipped", "error", "batch"]);
const requiredFields = ["action", "status", "importedCount", "skippedCount", "failedCount"];

function fail(message) {
  console.error(`Invalid synchronization result: ${message}`);
  process.exit(1);
}

const filePath = process.argv[2];
if (!filePath) fail("a JSON file path is required");

let result;
try {
  result = JSON.parse(readFileSync(filePath, "utf8"));
} catch {
  fail("file is missing or does not contain valid JSON");
}

if (!result || typeof result !== "object" || Array.isArray(result)) {
  fail("result must be a JSON object");
}

for (const field of requiredFields) {
  if (!(field in result)) fail(`missing required property '${field}'`);
}

if (typeof result.action !== "string" || !allowedActions.has(result.action)) {
  fail("action must be one of promoted, skipped, error, or batch");
}
if (typeof result.status !== "string" || result.status.trim() === "") {
  fail("status must be a non-empty string");
}
for (const field of ["importedCount", "skippedCount", "failedCount"]) {
  if (!Number.isInteger(result[field]) || result[field] < 0) {
    fail(`${field} must be a non-negative integer`);
  }
}

console.log(`Synchronization result is valid (${result.action}).`);
