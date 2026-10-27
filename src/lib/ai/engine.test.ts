// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("groq-sdk", () => {
  class RateLimitError extends Error {
    headers?: unknown;
    constructor(message = "rate limited") {
      super(message);
      this.name = "RateLimitError";
    }
  }
  class BadRequestError extends Error {
    error?: unknown;
    constructor(message = "bad request", error?: unknown) {
      super(message);
      this.name = "BadRequestError";
      this.error = error;
    }
  }
  class InternalServerError extends Error {}
  class APIConnectionError extends Error {}
  class APIConnectionTimeoutError extends Error {}
  class MockGroq {
    chat = { completions: { create: mockCreate } };
    constructor() {}
    static RateLimitError = RateLimitError;
    static BadRequestError = BadRequestError;
    static InternalServerError = InternalServerError;
    static APIConnectionError = APIConnectionError;
    static APIConnectionTimeoutError = APIConnectionTimeoutError;
  }
  return {
    default: MockGroq,
    BadRequestError,
    RateLimitError,
    InternalServerError,
    APIConnectionError,
    APIConnectionTimeoutError,
  };
});

import {
  generateOutfitRecommendation,
  generateOutfitRecommendationStream,
  generateStructuredOutfitRecommendation,
  getEngineModel,
} from "./engine";
import { RateLimitError } from "groq-sdk";

describe("getEngineModel", () => {
  it("returns configured model", () => {
    expect(typeof getEngineModel()).toBe("string");
  });
});

describe("generateOutfitRecommendation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.GROQ_API_KEY = "test-key";
  });

  it("returns content on first success", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"options":[]}' } }],
    });
    const result = await generateOutfitRecommendation("system", { foo: 1 });
    expect(result).toBe('{"options":[]}');
    expect(mockCreate).toHaveBeenCalledTimes(1);
    if (getEngineModel().startsWith("openai/gpt-oss-")) {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          reasoning_effort: "low",
          include_reasoning: false,
        }),
        expect.anything(),
      );
    }
  });

  it("forwards abort signals and refuses work already cancelled", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: "ok" } }] });
    const controller = new AbortController();
    await generateOutfitRecommendation("system", {}, undefined, controller.signal);
    expect(mockCreate.mock.calls[0]?.[1]).toMatchObject({
      signal: controller.signal,
    });

    controller.abort();
    await expect(
      generateOutfitRecommendation("system", {}, undefined, controller.signal),
    ).rejects.toThrow();
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("throws without api key", async () => {
    delete process.env.GROQ_API_KEY;
    await expect(generateOutfitRecommendation("s", {})).rejects.toThrow();
  });

  it("retries rate limits then succeeds", async () => {
    // Real Groq RateLimitError takes (status, error, message, headers);
    // the message hint drives the retry-delay reader in engine.ts.
    const rateLimit = new RateLimitError(
      429,
      {},
      "rate limited, try again in 0s",
      new Headers(),
    );
    mockCreate
      .mockRejectedValueOnce(rateLimit)
      .mockResolvedValueOnce({
        choices: [{ message: { content: "ok" } }],
      });
    const result = await generateOutfitRecommendation("system", {});
    expect(result).toBe("ok");
    expect(mockCreate).toHaveBeenCalledTimes(2);
  }, 15000);

  it("fails fast on non-retryable errors", async () => {
    mockCreate.mockRejectedValue(new Error("auth failed"));
    await expect(generateOutfitRecommendation("s", {})).rejects.toThrow(
      "auth failed",
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("retries empty completions", async () => {
    mockCreate
      .mockResolvedValueOnce({ choices: [{ message: { content: null } }] })
      .mockResolvedValueOnce({
        choices: [{ message: { content: "recovered" } }],
      });
    const result = await generateOutfitRecommendation("s", {});
    expect(result).toBe("recovered");
    expect(mockCreate).toHaveBeenCalledTimes(2);
  }, 15000);
});

describe("generateOutfitRecommendationStream", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.GROQ_API_KEY = "test-key";
  });

  it("returns the full content and forwards streamed chunks", async () => {
    const chunks = [
      { choices: [{ delta: { content: '{"options":[' } }] },
      { choices: [{ delta: { content: "]}" } }] },
    ];
    mockCreate.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield* chunks;
      },
    });
    const onContent = vi.fn();

    const result = await generateOutfitRecommendationStream(
      "system",
      { foo: "bar" },
      onContent,
    );

    expect(result).toBe('{"options":[]}');
    expect(onContent.mock.calls.map(([chunk]) => chunk)).toEqual([
      '{"options":[',
      "]}",
    ]);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        stream: true,
        ...(getEngineModel().startsWith("openai/gpt-oss-")
          ? { reasoning_effort: "low", include_reasoning: false }
          : {}),
      }),
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
  });

  it("throws without api key", async () => {
    delete process.env.GROQ_API_KEY;
    await expect(
      generateOutfitRecommendationStream("system", {}, vi.fn()),
    ).rejects.toThrow("GROQ_API_KEY is not configured");
  });

  it("defers a generic streaming JSON validation failure to route recovery", async () => {
    mockCreate.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        throw new Error(
          "Failed to validate JSON. See failed_generation for details.",
        );
      },
    });

    await expect(
      generateOutfitRecommendationStream("system", {}, vi.fn()),
    ).rejects.toMatchObject({ __upstreamFailure: true });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

describe("generateStructuredOutfitRecommendation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.GROQ_API_KEY = "test-key";
  });

  it("bounds GPT-OSS reasoning while requesting a structured response", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"options":[]}' } }],
    });

    const result = await generateStructuredOutfitRecommendation("system", {});

    expect(result).toBe('{"options":[]}');
    if (getEngineModel().startsWith("openai/gpt-oss-")) {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          reasoning_effort: "low",
          include_reasoning: false,
        }),
        expect.objectContaining({ timeout: expect.any(Number) }),
      );
    }
  });
});
