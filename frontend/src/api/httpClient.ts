export class ApiError extends Error {
  status?: number;
  details?: unknown;
  isNetworkError: boolean;

  constructor(message: string, options: { status?: number; details?: unknown; isNetworkError?: boolean } = {}) {
    super(message);
    this.status = options.status;
    this.details = options.details;
    this.isNetworkError = Boolean(options.isNetworkError);
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const DEFAULT_TIMEOUT_MS = 10000;

function debugLog(payload: {
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
}) {
  // #region agent log
  fetch("http://127.0.0.1:7242/ingest/b059efa1-b0a0-4c8f-848d-af5db46f8072", {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "debug-session",
      timestamp: Date.now(),
      ...payload,
    }),
  }).catch(() => { });
  // #endregion
}

export async function httpPost<TResponse>(
  path: string,
  body: unknown,
  options: { timeoutMs?: number; headers?: Record<string, string> } = {}
): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const requestUrl = `${API_BASE_URL}${path}`;
  debugLog({
    runId: "pre-fix",
    hypothesisId: "A",
    location: "src/api/httpClient.ts:httpPost",
    message: "httpPost start",
    data: { path, requestUrl, timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS },
  });

  try {
    const adminPin = localStorage.getItem("admin_pin");
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(adminPin ? { "x-admin-pin": adminPin } : {}),
        ...options.headers
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      credentials: "include",
    });

    const text = await response.text();
    debugLog({
      runId: "pre-fix",
      hypothesisId: "C",
      location: "src/api/httpClient.ts:httpPost",
      message: "httpPost response received",
      data: {
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get("content-type"),
        textLen: text.length,
        textHead: text.slice(0, 80),
      },
    });

    const contentType = response.headers.get("content-type") ?? "";
    const expectsJson = contentType.includes("application/json");
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/b059efa1-b0a0-4c8f-848d-af5db46f8072", {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "post-fix",
        hypothesisId: "C",
        location: "src/api/httpClient.ts:httpPost",
        message: "content type classified",
        data: { contentType, expectsJson },
        timestamp: Date.now(),
      }),
    }).catch(() => { });
    // #endregion

    let data: unknown = undefined;
    if (text && expectsJson) {
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        debugLog({
          runId: "pre-fix",
          hypothesisId: "C",
          location: "src/api/httpClient.ts:httpPost",
          message: "httpPost JSON.parse failed",
          data: {
            parseErrorName: parseError instanceof Error ? parseError.name : typeof parseError,
            parseErrorMessage: parseError instanceof Error ? parseError.message : undefined,
          },
        });
        throw new ApiError("Invalid server response", {
          status: response.status,
          details: { contentType, textHead: text.slice(0, 120) },
        });
      }
    }

    if (!response.ok) {
      const message =
        expectsJson && typeof data === "object" && data !== null && "error" in data
          ? String((data as { error?: unknown }).error ?? "Request failed")
          : text || "Request failed";

      const details =
        expectsJson && typeof data === "object" && data !== null && "details" in data
          ? (data as { details?: unknown }).details
          : { contentType, textHead: text.slice(0, 120) };

      throw new ApiError(message, {
        status: response.status,
        details,
      });
    }

    return data as TResponse;
  } catch (error) {
    if (error instanceof ApiError) {
      debugLog({
        runId: "pre-fix",
        hypothesisId: "E",
        location: "src/api/httpClient.ts:httpPost",
        message: "httpPost ApiError thrown",
        data: { status: error.status, isNetworkError: error.isNetworkError },
      });
      throw error;
    }

    const isAbort = error instanceof DOMException && error.name === "AbortError";
    debugLog({
      runId: "pre-fix",
      hypothesisId: isAbort ? "D" : "B",
      location: "src/api/httpClient.ts:httpPost",
      message: "httpPost non-ApiError thrown",
      data: {
        isAbort,
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : undefined,
      },
    });
    throw new ApiError("Network error", { isNetworkError: true, status: isAbort ? 0 : undefined });
  } finally {
    clearTimeout(timeout);
  }
}

export async function httpGet<TResponse>(
  path: string,
  options: { timeoutMs?: number; headers?: Record<string, string> } = {}
): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const adminPin = localStorage.getItem("admin_pin");
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(adminPin ? { "x-admin-pin": adminPin } : {}),
        ...options.headers
      },
      signal: controller.signal,
      credentials: "include",
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : undefined;

    if (!response.ok) {
      throw new ApiError(data?.error || "Request failed", {
        status: response.status,
        details: data?.details,
      });
    }

    return data as TResponse;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const isAbort = error instanceof DOMException && error.name === "AbortError";
    throw new ApiError("Network error", { isNetworkError: true, status: isAbort ? 0 : undefined });
  } finally {
    clearTimeout(timeout);
  }
}
