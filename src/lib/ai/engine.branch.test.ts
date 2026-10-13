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
  BadRequestError,
  RateLimitError,
} from "groq-sdk";
import { generateOutfitRecommendation } from "./engine";

function rateLimitWithHeaders(headers: unknown, message: string) {
  const error = new RateLimitError(message);
  error.headers = headers;
  return error;
}

describe("generateOutfitRecommendation branch coverage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.GROQ_API_KEY = "test-key";
  });

  it("honors the retry-after response header", async () => {
    mockCreate
      .mockRejectedValueOnce(
        rateLimitWithHeaders(new Headers({ "retry-after": "0" }), "limited"),
      )
      .mockResolvedValueOnce({
        choices: [{ message: { content: "recovered" } }],
      });
    const result = await generateOutfitRecommendation("system", {});
    expect(result).toBe("recovered");
    expect(mockCreate).toHaveBeenCalledTimes(2);
  }, 15000);

  it("falls back to the message hint when the header value is invalid", async () => {
    mockCreate
      .mockRejectedValueOnce(
        rateLimitWithHeaders(
          new Headers({ "retry-after": "not-a-number" }),
          "limited, try again in 0s",
        ),
      )
      .mockResolvedValueOnce({
        choices: [{ message: { content: "hinted" } }],
      });
    const result = await generateOutfitRecommendation("system", {});
    expect(result).toBe("hinted");
  }, 15000);

  it("survives a throwing header reader via the message hint", async () => {
    const throwingHeaders = {
      get: () => {
        throw new Error("header reader down");
      },
    };
    mockCreate
      .mockRejectedValueOnce(
        rateLimitWithHeaders(throwingHeaders, "limited, try again in 0s"),
      )
      .mockResolvedValueOnce({
        choices: [{ message: { content: "survived" } }],
      });
    const result = await generateOutfitRecommendation("system", {});
    expect(result).toBe("survived");
  }, 15000);

  it("retries json validation failures from the model", async () => {
    mockCreate
      .mockRejectedValueOnce(
        new BadRequestError("bad request", {
          failed_generation: "x",
          message: "json_validate_failed: schema mismatch",
        }),
      )
      .mockResolvedValueOnce({
        choices: [{ message: { content: "valid" } }],
      });
    const result = await generateOutfitRecommendation("system", {});
    expect(result).toBe("valid");
  }, 15000);

  it("fails fast on plain bad requests without retrying", async () => {
    mockCreate.mockRejectedValue(
      new BadRequestError("bad request", { message: "other failure" }),
    );
    await expect(generateOutfitRecommendation("s", {})).rejects.toThrow(
      "bad request",
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("throws the last error after exhausting retries", async () => {
    mockCreate.mockRejectedValue(new RateLimitError("limited"));
    await expect(generateOutfitRecommendation("s", {})).rejects.toThrow(
      "limited",
    );
    expect(mockCreate).toHaveBeenCalledTimes(3);
  }, 30000);
});
