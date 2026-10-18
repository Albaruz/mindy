// Evaluate the running recommender endpoint against stable representative cases.
// The endpoint keeps its normal authentication, filtering, validation, repair
// and fallback behavior. Set EVAL_COOKIE to a session cookie; never print it.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const endpoint = process.env.EVAL_RECOMMENDER_URL ?? "http://localhost:3000/api/recommender";
const cookie = process.env.EVAL_COOKIE;
const outputPath = process.env.EVAL_OUTPUT;

if (!cookie) {
  console.error("EVAL_COOKIE is required. It is read only from the environment and never logged.");
  process.exit(2);
}

const cases = JSON.parse(
  await readFile(new URL("./recommender-evaluation-cases.json", import.meta.url), "utf8"),
);

function categoryOf(garment) {
  return garment.garmentType;
}

function validateOption(option, scenario) {
  if (!option || !Array.isArray(option.garmentIds)) return false;
  const garments = scenario.body.garments;
  const byId = new Map(garments.map((garment) => [garment.id, garment]));
  const selected = option.garmentIds.map((id) => byId.get(id));
  if (selected.some((garment) => garment === undefined)) return false;
  if (new Set(option.garmentIds).size !== option.garmentIds.length) return false;
  if ((scenario.body.lockedGarmentIds ?? []).some((id) => !option.garmentIds.includes(id))) return false;
  const categories = new Set(selected.map(categoryOf));
  const onePiece = selected.some((garment) => garment.garmentType === "dress");
  if (!onePiece && (!categories.has("top") || !categories.has("bottom"))) return false;
  if (scenario.body.expected?.requiresOuterwear && !categories.has("outerwear")) return false;
  return true;
}

const rows = [];
for (const scenario of cases) {
  const started = Date.now();
  let response;
  let body = null;
  let error = null;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify(scenario.body),
    });
    body = await response.json();
  } catch (requestError) {
    error = requestError instanceof Error ? requestError.message : String(requestError);
  }

  const options = Array.isArray(body?.options) ? body.options : [];
  const validOptions = options.filter((option) => validateOption(option, scenario));
  rows.push({
    case: scenario.name,
    status: response?.status ?? null,
    latencyMs: Date.now() - started,
    model: body?.model ?? response?.headers.get("x-groq-model") ?? null,
    fallback: body?._isFallback === true,
    repairAttempted: body?.repairAttempted === true,
    options: options.length,
    validOptions: validOptions.length,
    passed: response?.ok === true && options.length > 0 && validOptions.length === options.length,
    error,
  });
}

const summary = {
  endpoint,
  generatedAt: new Date().toISOString(),
  totalCases: rows.length,
  passedCases: rows.filter((row) => row.passed).length,
  fallbackCases: rows.filter((row) => row.fallback).length,
  repairedCases: rows.filter((row) => row.repairAttempted).length,
  averageLatencyMs: rows.length
    ? Math.round(rows.reduce((total, row) => total + row.latencyMs, 0) / rows.length)
    : 0,
  rows,
};

const serialized = JSON.stringify(summary, null, 2);
console.log(serialized);
if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${serialized}\n`, "utf8");
}

if (summary.passedCases !== summary.totalCases) process.exitCode = 1;
