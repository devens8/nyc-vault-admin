// Google Gemini client (direct REST call, no SDK). Free tier — get a key at
// https://aistudio.google.com/apikey and set GEMINI_API_KEY. Server-only: the
// key must never reach the browser, so this is imported only from Server
// Actions / Route Handlers.
//
// Uses the current **Interactions API** (POST /v1beta/interactions). The older
// `:generateContent` endpoint is deprecated and now 404s for new keys.
// Docs: https://ai.google.dev/gemini-api/docs/get-started

// The pipeline (lib/pipeline.js) passes the model chosen in the DB; this is
// only the fallback. Default to a *lite* model: it's cheaper and fast (~1-2s,
// no heavy "thinking" latency) unlike the full flash models, which stall for 10s+ on reasoning.
// "-latest" is a stable alias that survives Google's version bumps.
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MAX_ATTEMPTS = 4;
// Hard cap so a request can never hang forever. The free tier routinely takes
// 15-30s per call, so a 30s cap aborted healthy requests and doubled the wait.
const REQUEST_TIMEOUT_MS = 50000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Pull the assistant's text out of the Interactions response. Output lives in
// the step whose type is "model_output"; we ignore the "thought" step.
function extractText(data) {
  const steps = data?.steps ?? [];
  let text = "";
  for (const step of steps) {
    if (step.type !== "model_output") continue;
    for (const part of step.content ?? []) {
      if (part.type === "text" && part.text) text += part.text;
    }
  }
  return text.trim();
}

// Strip accidental ```json fences and parse.
export function parseDossier(text) {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(json)?/i, "");
    const close = t.lastIndexOf("```");
    if (close !== -1) t = t.slice(0, close);
    t = t.trim();
  }
  try {
    return JSON.parse(t);
  } catch {
    throw new Error("Could not parse the model's answer as JSON.");
  }
}

// Calls one Gemini model and returns its text. Retries the transient "high
// demand" (503/429) responses the free tier throws under load. `onAttempt`
// receives a log row for EVERY attempt (success or failure) so the pipeline can
// record it in llm_responses.
export async function callModel({ model = DEFAULT_MODEL, temperature, prompt, onAttempt }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY. Add it to .env.local and your Vercel env."
    );
  }

  const body = JSON.stringify({
    model,
    input: prompt,
    ...(temperature != null && { generation_config: { temperature: Number(temperature) } }),
  });
  const log = (row) => (onAttempt ? onAttempt(row) : null);

  let lastErr = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const t0 = Date.now();

    let res, data;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body,
        cache: "no-store",
        signal: controller.signal,
      });
      data = await res.json().catch(() => null);
    } catch (err) {
      clearTimeout(timer);
      lastErr =
        err.name === "AbortError"
          ? "Gemini took too long to respond — please try again."
          : err.message;
      await log({ attempt, status: "failed", error: lastErr, duration_ms: Date.now() - t0 });
      if (attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 1000);
        continue;
      }
      throw new Error(lastErr);
    }
    clearTimeout(timer);

    const meta = {
      attempt,
      http_status: res.status,
      duration_ms: Date.now() - t0,
      input_tokens: data?.usage?.total_input_tokens ?? null,
      output_tokens: data?.usage?.total_output_tokens ?? null,
    };

    // Transient overload → back off and retry.
    const errCode = data?.error?.code;
    const overloaded =
      res.status === 503 ||
      res.status === 429 ||
      errCode === "service_unavailable" ||
      errCode === "resource_exhausted";

    if (!res.ok || data?.error) {
      lastErr = data?.error?.message || `Gemini request failed (${res.status}).`;
      await log({ ...meta, status: "failed", error: lastErr });
      if (overloaded && attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 2000); // 2s, 4s, 6s
        continue;
      }
      throw new Error(lastErr);
    }

    const text = extractText(data);
    if (!text) {
      lastErr = "Gemini returned an empty response.";
      await log({ ...meta, status: "failed", error: lastErr });
      if (attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 1000);
        continue;
      }
      throw new Error(lastErr);
    }

    await log({ ...meta, status: "succeeded", response_text: text });
    return text;
  }

  throw new Error(lastErr || "Gemini request failed after retries.");
}
