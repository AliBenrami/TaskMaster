import type { DoclingBackend } from "./contracts";

export function isDoclingTestEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_DOCLING_TEST === "true";
}

export function getDoclingBackend(): DoclingBackend {
  const backend = process.env.DOCLING_BACKEND ?? "local-python";

  if (backend === "local-python" || backend === "remote-api") {
    return backend;
  }

  throw new Error(`Unsupported DOCLING_BACKEND "${backend}".`);
}

export function getDoclingPythonBin() {
  return process.env.DOCLING_PYTHON_BIN ?? "python";
}

export function getDoclingTimeoutMs() {
  const value = process.env.DOCLING_TIMEOUT_MS;
  if (!value) {
    return 120_000;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 120_000;
}
