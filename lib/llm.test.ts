// Unit tests for the cached model-call boundary (D22). Run: npm test
// Dependency-free (no network, no API key) — they exercise the caching discipline + the no-key guard.
import test from "node:test";
import assert from "node:assert/strict";
import { buildRequestBody, llmEnabled, complete } from "./llm.ts";

const base = () => ({
  model: "claude-sonnet-4-6",
  system: "You are a careful assistant.",
  messages: [{ role: "user" as const, content: "hello" }],
});

test("buildRequestBody tags the static system block with an ephemeral cache breakpoint", () => {
  const body = buildRequestBody(base());
  assert.ok(Array.isArray(body.system), "system must be a content-block array, not a bare string");
  const block = (body.system as Array<Record<string, unknown>>)[0];
  assert.equal(block.type, "text");
  assert.equal(block.text, "You are a careful assistant.");
  assert.deepEqual(block.cache_control, { type: "ephemeral" });
});

test("buildRequestBody keeps per-request content in messages (after the breakpoint), not in system", () => {
  const body = buildRequestBody(base());
  assert.deepEqual(body.messages, [{ role: "user", content: "hello" }]);
  // the varying user turn must NOT leak into the cached system block
  const systemText = JSON.stringify(body.system);
  assert.ok(!systemText.includes("hello"), "user content must not be inside the cached system block");
});

test("buildRequestBody defaults max_tokens and omits temperature unless given", () => {
  const a = buildRequestBody(base());
  assert.equal(a.max_tokens, 1024);
  assert.equal("temperature" in a, false);
  const b = buildRequestBody({ ...base(), maxTokens: 512, temperature: 0.2 });
  assert.equal(b.max_tokens, 512);
  assert.equal(b.temperature, 0.2);
});

test("llmEnabled reflects whether ANTHROPIC_API_KEY is present", () => {
  assert.equal(llmEnabled({}), false);
  assert.equal(llmEnabled({ ANTHROPIC_API_KEY: "sk-ant-api03-x" } as NodeJS.ProcessEnv), true);
});

test("complete() throws a clear error with no API key instead of hanging or calling out", async () => {
  await assert.rejects(
    () => complete(base(), {} as NodeJS.ProcessEnv),
    /ANTHROPIC_API_KEY not set/,
  );
});
