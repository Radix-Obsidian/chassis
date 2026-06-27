// llm.ts — the chassis's cached model-call boundary (D22; see factory-core/CACHING.md). Uses the
// Anthropic Messages REST API over the built-in fetch (Node 20+), so there's no model SDK dependency
// at all — the same posture as email.ts (Brevo over fetch): the unit tests stay dependency-free and the
// bundle stays light. Every SKU that calls a model routes through here; the caching discipline lives in
// exactly one place.
//
// The cache breakpoint is baked in: complete() passes `system` as a content-block array with an explicit
// cache_control on the static block. That is the ONLY correct breakpoint for our shape — single-turn,
// no `tools` (structured output rides in the body, which is not a cacheable prefix block). Top-level
// automatic caching would instead pin the breakpoint on the per-request user message and pay a wasted
// cache-write on every call. Below a model's minimum cacheable size (1,024 tok Sonnet/Opus, 4,096 Haiku)
// this is a silent no-op — cacheW stays 0, no charge; it engages for free if a system prompt grows past
// the floor or a feature becomes multi-turn. See factory-core/CACHING.md.
//
// Guarded by design: with no ANTHROPIC_API_KEY (preview / local / tests) it does NOT hang or call out —
// it throws a clear, catchable error so the SKU degrades on its own terms.

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
// Current API version. Prompt caching is GA and needs no beta header.
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MAX_TOKENS = 1024;

export interface ChatMessage {
  role: "user" | "assistant";
  content: unknown;
}

export interface CompleteParams {
  model: string;
  /** The STATIC system prompt — this is the cached prefix. Keep per-request content in `messages`. */
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

export interface CompleteResult {
  text: string;
  usage: Usage;
  raw: unknown;
}

export function llmEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!env.ANTHROPIC_API_KEY;
}

// Build the request body with the cache breakpoint on the static system block. Exported + pure so the
// caching discipline is unit-testable without a network call or an API key.
export function buildRequestBody(params: CompleteParams): Record<string, unknown> {
  const { model, system, messages, maxTokens = DEFAULT_MAX_TOKENS, temperature } = params;
  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages,
  };
  if (temperature != null) body.temperature = temperature;
  return body;
}

// One grep-able usage line per call — the SKU log contract in CACHING.md. cacheR/cacheW make caching
// visible in Railway logs; a rising cacheR is the standard working.
function logUsage(model: string, usage: Usage): void {
  console.log(
    `[ai-usage] model=${model} in=${usage.input_tokens ?? 0} out=${usage.output_tokens ?? 0} ` +
      `cacheR=${usage.cache_read_input_tokens ?? 0} cacheW=${usage.cache_creation_input_tokens ?? 0}`,
  );
}

export async function complete(
  params: CompleteParams,
  env: NodeJS.ProcessEnv = process.env,
): Promise<CompleteResult> {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("[llm] ANTHROPIC_API_KEY not set — cannot call the model (set it in the SKU's env).");

  const res = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": ANTHROPIC_VERSION, "content-type": "application/json" },
    body: JSON.stringify(buildRequestBody(params)),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`[llm] ${res.status} ${res.statusText} — ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as { content?: Array<{ text?: string }>; usage?: Usage };
  const usage = json.usage ?? {};
  logUsage(params.model, usage);
  const text = (json.content ?? []).map((b) => b.text ?? "").join("").trim();
  return { text, usage, raw: json };
}
