import "server-only";
import { callModel, parseDossier } from "@/lib/gemini";

// Database-driven generation pipeline (Week 7). Everything the model sees is
// configured in the admin app: which prompt chain runs (prompt_chain_mix
// weights), each chain's steps and model, the slang glossary (terms) and the
// few-shot examples. Every run is logged to generation_requests, and every LLM
// call to llm_responses, so the admin app can show exactly what happened.
//
// `db` must be a service-role client: the log tables have no client grants.

function fill(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

// Weighted random pick over chains with weight > 0.
function pickChain(mix) {
  const live = mix.filter((m) => m.weight > 0);
  const total = live.reduce((s, m) => s + m.weight, 0);
  if (!total) throw new Error("No prompt chain has a mix weight above 0.");
  let r = Math.random() * total;
  for (const m of live) {
    r -= m.weight;
    if (r < 0) return m.chain_id;
  }
  return live[live.length - 1].chain_id;
}

async function loadConfig(db) {
  const [mix, terms, examples] = await Promise.all([
    db.from("prompt_chain_mix").select("chain_id, weight"),
    db.from("terms").select("term, definition").order("term"),
    db.from("generation_examples").select("neighborhood, category, place_name, blurb").eq("is_active", true),
  ]);
  const error = mix.error || terms.error || examples.error;
  if (error) throw new Error(error.message);

  const chainId = pickChain(mix.data);
  const { data: steps, error: stepsErr } = await db
    .from("prompt_chain_steps")
    .select("id, step_order, name, prompt_template, expects_json, llm_model_id, llm_models(api_model_id, temperature, is_active, llm_providers(slug))")
    .eq("chain_id", chainId)
    .order("step_order");
  if (stepsErr) throw new Error(stepsErr.message);
  if (!steps.length) throw new Error(`Prompt chain ${chainId} has no steps.`);

  return {
    chainId,
    steps,
    terms: terms.data.map((t) => `- ${t.term}: ${t.definition}`).join("\n") || "(none)",
    examples:
      examples.data
        .map((e) => `${e.place_name} (${e.neighborhood}, ${e.category}): ${e.blurb}`)
        .join("\n\n") || "(none)",
  };
}

// Runs one generation end-to-end and returns
// { requestId, place_name, blurb, prompt, model, finish }. The caller saves the
// dossier, then calls finish({ status: "succeeded", generation_id }) to close
// out the request log. Throws on failure (the request is marked failed first).
export async function runGeneration(db, { userId, source, neighborhood, category, notes }) {
  const started = Date.now();
  const { data: request, error: reqErr } = await db
    .from("generation_requests")
    .insert({ user_id: userId, source, neighborhood, category, notes })
    .select("id")
    .single();
  if (reqErr) throw new Error(`Couldn't log the request: ${reqErr.message}`);

  const finish = (fields) =>
    db
      .from("generation_requests")
      .update({ ...fields, duration_ms: Date.now() - started, completed_at: new Date().toISOString() })
      .eq("id", request.id);

  try {
    const cfg = await loadConfig(db);
    await db.from("generation_requests").update({ chain_id: cfg.chainId }).eq("id", request.id);

    const vars = {
      neighborhood,
      category,
      notes: notes ? `Extra constraints from the user: "${notes}".` : "",
      terms: cfg.terms,
      examples: cfg.examples,
      previous_output: "",
    };

    let output = "";
    let lastPrompt = "";
    let lastModel = "";
    for (const step of cfg.steps) {
      const model = step.llm_models;
      if (!model?.is_active) throw new Error(`Step "${step.name}" uses an inactive model.`);
      if (model.llm_providers?.slug !== "gemini") {
        throw new Error(`Provider "${model.llm_providers?.slug}" isn't wired up in code yet.`);
      }

      lastPrompt = fill(step.prompt_template, vars);
      lastModel = model.api_model_id;
      output = await callModel({
        model: model.api_model_id,
        temperature: model.temperature,
        prompt: lastPrompt,
        onAttempt: (a) =>
          db.from("llm_responses").insert({
            request_id: request.id,
            step_id: step.id,
            llm_model_id: step.llm_model_id,
            step_order: step.step_order,
            api_model_id: model.api_model_id,
            prompt: lastPrompt,
            ...a,
          }),
      });
      vars.previous_output = output;
    }

    const parsed = parseDossier(output);
    const place_name = parsed.place_name?.toString().trim();
    const blurb = parsed.blurb?.toString().trim();
    if (!place_name || !blurb) throw new Error("The model's answer was missing a place name or blurb.");

    return { requestId: request.id, place_name, blurb, prompt: lastPrompt, model: lastModel, finish };
  } catch (err) {
    await finish({ status: "failed", error: err.message });
    throw err;
  }
}
