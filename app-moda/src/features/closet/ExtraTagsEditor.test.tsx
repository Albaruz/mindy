import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExtraTagsEditor, toEditableTags } from "./ExtraTagsEditor";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("toEditableTags", () => {
  it("keeps strings as-is and stringifies primitives", () => {
    expect(
      toEditableTags({ a: "x", b: 3, c: true, d: null, e: undefined }),
    ).toEqual({ a: "x", b: "3", c: "true" });
  });

  it("serializes nested objects as JSON", () => {
    expect(toEditableTags({ nested: { shade: "navy" } })).toEqual({
      nested: JSON.stringify({ shade: "navy" }),
    });
  });
});

describe("ExtraTagsEditor", () => {
  it("renders existing tags as chips", () => {
    render(
      <ExtraTagsEditor
        tags={{ color_base: "blue", specificType: "sneakers" }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("color_base")).toBeInTheDocument();
    expect(screen.getByText("blue")).toBeInTheDocument();
    expect(screen.getByText("specificType")).toBeInTheDocument();
  });

  it("shows an empty message when there are no tags", () => {
    render(<ExtraTagsEditor tags={{}} onChange={() => {}} />);
    expect(screen.getByText("form.tagsEmpty")).toBeInTheDocument();
  });

  it("adds a tag from the key/value inputs", async () => {
    const onChange = vi.fn();
    render(<ExtraTagsEditor tags={{}} onChange={onChange} />);
    await userEvent.type(
      screen.getByLabelText("form.tagKeyPh"),
      "color_base",
    );
    await userEvent.type(screen.getByLabelText("form.tagValuePh"), "blue");
    await userEvent.click(screen.getByLabelText("addTag"));
    expect(onChange).toHaveBeenCalledWith({ color_base: "blue" });
  });

  it("adds a tag with the Enter key", async () => {
    const onChange = vi.fn();
    render(<ExtraTagsEditor tags={{}} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("form.tagKeyPh"), "fit");
    await userEvent.type(screen.getByLabelText("form.tagValuePh"), "slim{enter}");
    expect(onChange).toHaveBeenCalledWith({ fit: "slim" });
  });

  it("shows a hint for empty key/value instead of calling onChange", async () => {
    const onChange = vi.fn();
    render(<ExtraTagsEditor tags={{}} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText("addTag"));
    expect(screen.getByRole("status")).toHaveTextContent("form.tagHintEmpty");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows a hint for duplicate keys instead of overwriting", async () => {
    const onChange = vi.fn();
    render(<ExtraTagsEditor tags={{ a: "1" }} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("form.tagKeyPh"), "a");
    await userEvent.type(screen.getByLabelText("form.tagValuePh"), "2");
    await userEvent.click(screen.getByLabelText("addTag"));
    expect(screen.getByRole("status")).toHaveTextContent(
      "form.tagHintDuplicate",
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("removes a tag when its chip button is clicked", async () => {
    const onChange = vi.fn();
    render(
      <ExtraTagsEditor tags={{ a: "1", b: "2" }} onChange={onChange} />,
    );
    await userEvent.click(screen.getAllByLabelText("removeTag")[0]);
    expect(onChange).toHaveBeenCalledWith({ b: "2" });
  });
});
