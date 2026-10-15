import { afterEach, describe, expect, it, vi } from "vitest";
import { callRecommenderStream, type RecommenderRequest } from "./generatorApi";

function eventFrame(value: unknown): string {
  return `data: ${JSON.stringify(value)}\r\n\r\n`;
}

describe("callRecommenderStream", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses chunk-split SSE frames and returns the final response", async () => {
    const option = { garmentIds: ["top-1", "bottom-1"], suitabilityRatio: 90 };
    const frames = [
      eventFrame({ type: "progress", stage: "generating" }),
      eventFrame({ type: "preview", option }),
      eventFrame({
        type: "complete",
        payload: { options: [option], _isFallback: false },
      }),
    ].join("");
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(frames.slice(0, 17)));
        controller.enqueue(encoder.encode(frames.slice(17, 63)));
        controller.enqueue(encoder.encode(frames.slice(63)));
        controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(stream, {
          headers: { "Content-Type": "text/event-stream" },
        }),
      ),
    );
    const onOption = vi.fn();
    const onReset = vi.fn();

    const response = await callRecommenderStream(
      {} as RecommenderRequest,
      onOption,
      onReset,
    );

    expect(onOption).toHaveBeenCalledWith(option);
    expect(onReset).not.toHaveBeenCalled();
    expect(response.ok).toBe(true);
    expect(response.headers.get("content-type")).toBe("application/json");
    await expect(response.json()).resolves.toMatchObject({
      options: [option],
      _isFallback: false,
    });
  });

  it("clears partial previews and returns streamed errors as normal responses", async () => {
    const frames = [
      eventFrame({ type: "preview", option: { garmentIds: ["top-1"] } }),
      eventFrame({ type: "reset" }),
      eventFrame({ type: "error", error: "STYLIST_UNAVAILABLE", status: 502 }),
    ].join("");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(frames, {
          headers: { "Content-Type": "text/event-stream" },
        }),
      ),
    );
    const onReset = vi.fn();

    const response = await callRecommenderStream(
      {} as RecommenderRequest,
      vi.fn(),
      onReset,
    );

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "STYLIST_UNAVAILABLE" });
  });
});
