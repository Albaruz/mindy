import { afterEach, describe, expect, it, vi } from "vitest";
import {
  generateRequestId,
  logger,
} from "./logger";

function captureConsole(method: "debug" | "log" | "warn" | "error") {
  const calls: string[] = [];
  const spy = vi
    .spyOn(console, method)
    .mockImplementation((message: string) => {
      calls.push(message);
    });
  return { calls, spy };
}

describe("logger branch coverage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("emits debug output in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const { calls, spy } = captureConsole("debug");
    logger.debug("debug message", { route: "/closet" });
    expect(spy).toHaveBeenCalledOnce();
    const payload = JSON.parse(calls[0] ?? "{}") as Record<string, unknown>;
    expect(payload["level"]).toBe("debug");
    expect(payload["route"]).toBe("/closet");
  });

  it("skips debug output outside development", () => {
    vi.stubEnv("NODE_ENV", "production");
    const { spy } = captureConsole("debug");
    logger.debug("silent message");
    expect(spy).not.toHaveBeenCalled();
  });

  it("serializes error instances with name and message", () => {
    const { calls } = captureConsole("error");
    logger.error("failure", { error: new TypeError("broken") });
    const payload = JSON.parse(calls[0] ?? "{}") as {
      error: { name: string; message: string };
    };
    expect(payload.error.name).toBe("TypeError");
    expect(payload.error.message).toBe("broken");
  });

  it("stringifies non-error context values", () => {
    const { calls } = captureConsole("warn");
    logger.warn("odd failure", { error: 42 });
    const payload = JSON.parse(calls[0] ?? "{}") as Record<string, unknown>;
    expect(payload["error"]).toBe("42");
  });

  it("logs request completion with warn level for client errors", () => {
    const { calls } = captureConsole("warn");
    logger.requestComplete("/api/closet", "request-1", 404, 12);
    const payload = JSON.parse(calls[0] ?? "{}") as Record<string, unknown>;
    expect(payload["statusCode"]).toBe(404);
    expect(payload["durationMs"]).toBe(12);
  });

  it("logs request completion with error level for server errors", () => {
    const { calls } = captureConsole("error");
    logger.requestComplete("/api/closet", "request-2", 500, 30);
    const payload = JSON.parse(calls[0] ?? "{}") as Record<string, unknown>;
    expect(payload["statusCode"]).toBe(500);
  });

  it("logs request start and external calls", () => {
    const { calls: startCalls } = captureConsole("log");
    logger.requestStart("/api/closet", "request-3", "user-1");
    const started = JSON.parse(startCalls[0] ?? "{}") as Record<string, unknown>;
    expect(started["requestId"]).toBe("request-3");
    logger.externalCall("groq", "chat.completions", 25, true);
    expect(startCalls).toHaveLength(2);
  });

  it("generates unique request identifiers", () => {
    const first = generateRequestId();
    const second = generateRequestId();
    expect(typeof first).toBe("string");
    expect(first).not.toBe(second);
  });
});
