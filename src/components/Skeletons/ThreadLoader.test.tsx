import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ThreadLoader } from "./ThreadLoader";

const PATH = "M14 50 V14 L32 36 L50 14 V50";

describe("ThreadLoader", () => {
  it("renders the thread path", () => {
    const { container } = render(<ThreadLoader path={PATH} />);
    const path = container.querySelector("path");
    expect(path).not.toBeNull();
    expect(path).toHaveAttribute("d", PATH);
  });
});
