// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockCheckRateLimit } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCheckRateLimit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

import { POST } from "./route";

function buildRequest(body: unknown): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyze", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCheckRateLimit.mockReturnValue({ limited: false, retryAfterSec: 0 });
  });

  it("returns 401 without session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await POST(buildRequest({}));
    expect(response.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockCheckRateLimit.mockReturnValue({ limited: true, retryAfterSec: 30 });
    const response = await POST(buildRequest({}));
    expect(response.status).toBe(429);
  });

  it("returns 503 without api key", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const previous = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    try {
      const response = await POST(buildRequest({}));
      expect(response.status).toBe(503);
    } finally {
      if (previous !== undefined) process.env.GROQ_API_KEY = previous;
    }
  });

  it("returns 400 on invalid image payload", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    process.env.GROQ_API_KEY = "test-key";
    const response = await POST(buildRequest({ imageBase64: "invalid" }));
    expect(response.status).toBe(400);
    delete process.env.GROQ_API_KEY;
  });
});

const { mockGroqCreate } = vi.hoisted(() => ({ mockGroqCreate: vi.fn() }));

vi.mock("groq-sdk", () => ({
  default: class MockGroq {
    chat = { completions: { create: mockGroqCreate } };
  },
}));

describe("POST /api/analyze vision success and failures", () => {
  const validImage = "data:image/png;base64,iVBORw0KGgo=";

  beforeEach(() => {
    vi.resetAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockCheckRateLimit.mockReturnValue({ limited: false, retryAfterSec: 0 });
    process.env.GROQ_API_KEY = "test-key";
  });

  function groqResolves(content: unknown) {
    mockGroqCreate.mockResolvedValue({
      choices: [{ message: { content } }],
    });
  }

  it("maps closed tags and passes free-text detail through", async () => {
    groqResolves(
      JSON.stringify({
        category: "top",
        garmentType: "top",
        color: "turquoise",
        colorDetail: "Turquoise bright",
        shade: "ignored",
        season: "summer",
        style: "casual",
        material: "cotton",
        cutLength: "slim",
        typeDetail: "Crew neck",
      }),
    );
    const response = await POST(buildRequest({ imageBase64: validImage }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.skipped).toBe(false);
    expect(body.garmentType).toBe("top");
    expect(body.color).toBeNull();
    expect(body.colorDetail).toBe("Turquoise bright");
    expect(body.season).toBe("summer");
    expect(body.typeDetail).toBe("Crew neck");
  });

  it("returns validated cutout assessment and garment description", async () => {
    groqResolves(
      JSON.stringify({
        category: "top",
        garmentType: "top",
        cutoutDifficulty: "hard",
        qualityNote: "The dark fabric blends into the background.",
        visualDescription: "A relaxed black cotton tee with short sleeves.",
      }),
    );
    const response = await POST(buildRequest({ imageBase64: validImage }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      cutoutDifficulty: "hard",
      qualityNote: "The dark fabric blends into the background.",
      visualDescription: "A relaxed black cotton tee with short sleeves.",
    });
  });

  it("asks Vision for localized user-facing text", async () => {
    groqResolves(JSON.stringify({ qualityNote: "El fondo se parece a la prenda." }));
    const response = await POST(
      buildRequest({ imageBase64: validImage, locale: "es" }),
    );
    expect(response.status).toBe(200);
    const visionPrompt = mockGroqCreate.mock.calls[0][0].messages[0].content[0]
      .text as string;
    expect(visionPrompt).toContain("in Spanish");
  });

  it("resolves legacy alias keys type, shade and specificType", async () => {
    groqResolves(
      JSON.stringify({
        type: "bottom",
        shade: "Navy shade",
        season: "winter",
        style: "formal",
        material: "denim",
        cutLength: "regular",
        specificType: "Straight jeans",
      }),
    );
    const response = await POST(buildRequest({ imageBase64: validImage }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.garmentType).toBe("bottom");
    expect(body.colorDetail).toBe("Navy shade");
    expect(body.typeDetail).toBe("Straight jeans");
  });

  it("returns 502 on empty vision content", async () => {
    groqResolves("");
    const response = await POST(buildRequest({ imageBase64: validImage }));
    expect(response.status).toBe(502);
  });

  it("returns 502 on missing vision content", async () => {
    mockGroqCreate.mockResolvedValue({ choices: [{}] });
    const response = await POST(buildRequest({ imageBase64: validImage }));
    expect(response.status).toBe(502);
  });

  it("returns 502 on invalid vision JSON", async () => {
    groqResolves("{not valid json");
    const response = await POST(buildRequest({ imageBase64: validImage }));
    expect(response.status).toBe(502);
  });

  it("returns 502 on non-object vision JSON", async () => {
    groqResolves('"hello"');
    const response = await POST(buildRequest({ imageBase64: validImage }));
    expect(response.status).toBe(502);
  });

  it("returns 502 when Groq throws", async () => {
    mockGroqCreate.mockRejectedValue(new Error("upstream down"));
    const response = await POST(buildRequest({ imageBase64: validImage }));
    expect(response.status).toBe(502);
  });
});

describe("POST /api/analyze residual validation", () => {
  const validImage = "data:image/png;base64,iVBORw0KGgo=";

  beforeEach(() => {
    vi.resetAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockCheckRateLimit.mockReturnValue({ limited: false, retryAfterSec: 0 });
    process.env.GROQ_API_KEY = "test-key";
  });

  it("returns 400 on invalid JSON body", async () => {
    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{invalid json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 on non-object JSON body", async () => {
    const response = await POST(buildRequest("just a string"));
    expect(response.status).toBe(400);
  });

  it("nulls missing free-text details", async () => {
    mockGroqCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              garmentType: "top",
              season: "summer",
              style: "casual",
              material: "cotton",
              cutLength: "slim",
            }),
          },
        },
      ],
    });
    const response = await POST(buildRequest({ imageBase64: validImage }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.colorDetail).toBeNull();
    expect(body.typeDetail).toBeNull();
  });

  it("nulls empty and oversized tags", async () => {
    mockGroqCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              category: 42,
              garmentType: "top",
              color: "",
              colorDetail: "",
              season: "x".repeat(61),
              style: "casual",
              material: "cotton",
              cutLength: "slim",
              typeDetail: "y".repeat(61),
            }),
          },
        },
      ],
    });
    const response = await POST(buildRequest({ imageBase64: validImage }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.category).toBeNull();
    expect(body.color).toBeNull();
    expect(body.colorDetail).toBeNull();
    expect(body.season).toBeNull();
    expect(body.typeDetail).toBeNull();
  });

  it("nulls invalid quality values and oversized descriptions", async () => {
    mockGroqCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              cutoutDifficulty: "impossible",
              qualityNote: "x".repeat(141),
              visualDescription: "y".repeat(401),
            }),
          },
        },
      ],
    });
    const response = await POST(buildRequest({ imageBase64: validImage }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      cutoutDifficulty: null,
      qualityNote: null,
      visualDescription: null,
    });
  });
});
