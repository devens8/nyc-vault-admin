// Google Gemini client (direct REST call, no SDK). Free tier — get a key at
// https://aistudio.google.com/apikey and set GEMINI_API_KEY. Server-only: the
// key must never reach the browser, so this is imported only from Server
// Actions / Route Handlers.
//
// Uses the current **Interactions API** (POST /v1beta/interactions). The older
// `:generateContent` endpoint is deprecated and now 404s for new keys.
// Docs: https://ai.google.dev/gemini-api/docs/get-started

// Default to a *lite* model: it's cheaper and fast (~1-2s, no heavy "thinking"
// latency) unlike the full flash models, which stall for 10s+ on reasoning.
// "-latest" is a stable alias that survives Google's version bumps.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MAX_ATTEMPTS = 4;
// Hard cap so a request can never hang forever. The free tier routinely takes
// 15-30s per call, so a 30s cap aborted healthy requests and doubled the wait.
const REQUEST_TIMEOUT_MS = 50000;

// Build the natural-language prompt we send to the model. This exact string is
// also stored in the DB (assignment requirement: save the prompt).
export function buildPrompt({ neighborhood, category, notes }) {
  return [
    `You are a sharp, chronically-online New Yorker writing a single "dossier"`,
    `entry for a vault of under-the-radar NYC spots.`,
    ``,
    `Recommend ONE specific, real place to visit in ${neighborhood}, New York`,
    `that fits the vibe: "${category}".`,
    notes ? `Extra constraints from the user: "${notes}".` : ``,
    `Pick a genuinely specific, nameable place (not a generic "a cafe in the area").`,
    ``,
    `Return ONLY a JSON object with exactly these keys:`,
    `  "place_name": the name of the spot (string)`,
    `  "blurb": a punchy pitch of 2-3 sentences and UNDER 60 words — what it is,`,
    `           why it's worth the trip, and one insider tip. Confident, a little`,
    `           witty, no hashtags, no emoji.`,
    `Do not wrap the JSON in markdown or code fences.`,
  ]
    .filter(Boolean)
    .join("\n");
}

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
function parseDossier(text) {
  let t = text;
  if (t.startsWith("```")) {
    t = t.replace(/^```(json)?/i, "");
    const close = t.lastIndexOf("```");
    if (close !== -1) t = t.slice(0, close);
    t = t.trim();
  }
  return JSON.parse(t);
}

// Calls Gemini and returns { place_name, blurb, prompt, model }. Retries the
// transient "high demand" (503) responses the free tier throws under load.
export async function generateDossier({ neighborhood, category, notes }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY. Add it to .env.local and your Vercel env."
    );
  }

  const prompt = buildPrompt({ neighborhood, category, notes });
  const body = JSON.stringify({ model: MODEL, input: prompt });

  let lastErr = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
      if (attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 1000);
        continue;
      }
      throw new Error(lastErr);
    }
    clearTimeout(timer);

    // Transient overload → back off and retry.
    const errCode = data?.error?.code;
    const overloaded =
      res.status === 503 ||
      res.status === 429 ||
      errCode === "service_unavailable" ||
      errCode === "resource_exhausted";

    if (!res.ok || data?.error) {
      lastErr = data?.error?.message || `Gemini request failed (${res.status}).`;
      if (overloaded && attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 2000); // 2s, 4s, 6s
        continue;
      }
      throw new Error(lastErr);
    }

    const text = extractText(data);
    if (!text) {
      lastErr = "Gemini returned an empty response.";
      if (attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 1000);
        continue;
      }
      throw new Error(lastErr);
    }

    let parsed;
    try {
      parsed = parseDossier(text);
    } catch {
      throw new Error("Could not parse Gemini response as JSON.");
    }

    const place_name = parsed.place_name?.toString().trim();
    const blurb = parsed.blurb?.toString().trim();
    if (!place_name || !blurb) {
      throw new Error("Gemini response was missing a place name or blurb.");
    }

    return { place_name, blurb, prompt, model: MODEL };
  }

  throw new Error(lastErr || "Gemini request failed after retries.");
}
