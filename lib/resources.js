// Registry of the simple tables the admin edits with generic CRUD screens
// (lib/resourceActions.js + app/components/ResourcePage.js). The server actions
// only ever touch tables and columns listed here, so a forged form can't write
// anything else.
//
// Field types: text | textarea | number | bool | select (options come from
// `ref`, another table, loaded at render time).

export const RESOURCES = {
  terms: {
    table: "terms",
    path: "/terms",
    title: "Terms",
    blurb:
      "NYC slang glossary. Every term is injected into generation prompts as {{terms}}, so the AI can use local language.",
    order: ["term", true],
    touch: "updated_at",
    fields: [
      { name: "term", label: "Term", type: "text", required: true, max: 60 },
      { name: "definition", label: "Definition", type: "textarea", required: true, max: 400 },
      { name: "example", label: "Example sentence", type: "textarea", max: 400 },
    ],
    search: ["term", "definition", "example"],
  },
  generation_examples: {
    table: "generation_examples",
    path: "/examples",
    title: "AI generation examples",
    blurb:
      "Few-shot examples of great dossiers. Active ones are injected into prompts as {{examples}} to steer tone and length.",
    order: ["created_at", false],
    touch: "updated_at",
    fields: [
      { name: "place_name", label: "Place name", type: "text", required: true, max: 120 },
      { name: "neighborhood", label: "Neighborhood", type: "text", required: true, max: 60 },
      { name: "category", label: "Vibe / category", type: "text", required: true, max: 40 },
      { name: "blurb", label: "Blurb", type: "textarea", required: true, max: 1200 },
      { name: "is_active", label: "Active (used in prompts)", type: "bool" },
    ],
    search: ["place_name", "neighborhood", "category", "blurb"],
  },
  llm_providers: {
    table: "llm_providers",
    path: "/providers",
    title: "LLM providers",
    blurb:
      "APIs the pipeline can call. The slug is what the code dispatches on; only \"gemini\" is wired up today.",
    order: ["name", true],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 80 },
      { name: "slug", label: "Slug", type: "text", required: true, max: 40, pattern: "^[a-z0-9-]+$" },
      { name: "base_url", label: "Base URL", type: "text", max: 300 },
      { name: "notes", label: "Notes", type: "textarea", max: 600 },
    ],
    search: ["name", "slug", "notes"],
    inUse: "Models still use this provider. Delete or move them first.",
  },
  llm_models: {
    table: "llm_models",
    path: "/models",
    title: "LLM models",
    blurb:
      "Models that prompt chain steps can run on. Deactivating a model makes any step that uses it fail fast instead of calling the API.",
    order: ["name", true],
    fields: [
      { name: "name", label: "Display name", type: "text", required: true, max: 80 },
      { name: "provider_id", label: "Provider", type: "select", required: true, ref: { table: "llm_providers", label: "name" } },
      { name: "api_model_id", label: "API model ID", type: "text", required: true, max: 120 },
      { name: "temperature", label: "Temperature (0–2, blank = default)", type: "number", min: 0, max: 2, step: 0.05 },
      { name: "is_active", label: "Active", type: "bool" },
    ],
    search: ["name", "api_model_id"],
    inUse: "Prompt chain steps still use this model. Point them at another model first.",
  },
  allowed_signup_domains: {
    table: "allowed_signup_domains",
    path: "/domains",
    title: "Allowed signup domains",
    blurb:
      "Anyone with an email at one of these domains can sign in to Little Spots NYC. Everyone else needs a whitelisted email.",
    order: ["domain", true],
    fields: [
      {
        name: "domain", label: "Domain (e.g. columbia.edu)", type: "text", required: true, max: 120,
        lower: true, pattern: "^[a-z0-9.-]+\\.[a-z]{2,}$",
      },
    ],
    search: ["domain"],
  },
  whitelisted_emails: {
    table: "whitelisted_emails",
    path: "/whitelist",
    title: "Whitelisted emails",
    blurb:
      "Individual addresses allowed to sign in even when their domain isn't allowed. Existing members were backfilled so nobody got locked out.",
    order: ["email", true],
    fields: [
      { name: "email", label: "Email", type: "text", required: true, max: 200, lower: true, pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$" },
      { name: "note", label: "Note", type: "text", max: 200 },
    ],
    search: ["email", "note"],
  },
};
