export function isParseTestEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_PARSE_TEST === "true";
}

export function getParseTestModel() {
  return process.env.GEMINI_PARSE_MODEL ?? "gemini-2.5-flash-lite";
}
