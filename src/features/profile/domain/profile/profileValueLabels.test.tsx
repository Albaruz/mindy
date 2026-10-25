// End-to-end proof of the profile value labels: the hook is rendered inside a
// real next-intl provider with the shipped message files, so the nested
// dictionary lookup and the message/constant parity are both covered.

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import {
  COLORIMETRIES,
  LIFESTYLES,
  MORPHOLOGIES,
  PREFERRED_FITS,
} from "@/constants/profile";
import {
  PROFILE_VALUE_DICTIONARIES,
  useProfileValueLabel,
  type ProfileValueKind,
} from "./profileValueLabels";
import enMessages from "../../../../../messages/en.json";
import esMessages from "../../../../../messages/es.json";

type Messages = typeof enMessages;

function renderLabel(
  locale: "en" | "es",
  messages: Messages,
  kind: ProfileValueKind,
  value: string | null,
): string {
  function Probe() {
    const label = useProfileValueLabel();
    return <span>{label(kind, value) ?? "∅"}</span>;
  }

  const { container } = render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Probe />
    </NextIntlClientProvider>,
  );
  return container.textContent ?? "";
}

describe("useProfileValueLabel", () => {
  it("shows the Spanish label for every stored value", () => {
    expect(
      renderLabel("es", esMessages, "morphology", "inverted_triangle"),
    ).toBe("Triángulo invertido");
    expect(
      renderLabel("es", esMessages, "lifestyle", "corporate_office"),
    ).toBe("Oficina o corporativo");
    expect(renderLabel("es", esMessages, "colorimetry", "winter")).toBe(
      "Invierno",
    );
    expect(renderLabel("es", esMessages, "fit", "oversized")).toBe("Oversize");
  });

  it("shows the English label for every stored value", () => {
    expect(renderLabel("en", enMessages, "morphology", "hourglass")).toBe(
      "Hourglass",
    );
    expect(renderLabel("en", enMessages, "lifestyle", "home_remote")).toBe(
      "Remote work",
    );
    expect(renderLabel("en", enMessages, "colorimetry", "spring")).toBe("Spring");
    expect(renderLabel("en", enMessages, "fit", "mixed")).toBe("Mixed");
  });

  it("returns no label when the profile has no value", () => {
    expect(renderLabel("es", esMessages, "lifestyle", null)).toBe("∅");
    expect(renderLabel("es", esMessages, "lifestyle", "")).toBe("∅");
  });

  it("falls back to a humanized token when the dictionary has no entry", () => {
    expect(renderLabel("es", esMessages, "lifestyle", "some_new_value")).toBe(
      "Some new value",
    );
  });
});

describe("profile value dictionaries", () => {
  const valuesByKind: Record<ProfileValueKind, readonly string[]> = {
    morphology: MORPHOLOGIES,
    lifestyle: LIFESTYLES,
    colorimetry: COLORIMETRIES,
    fit: PREFERRED_FITS,
  };

  it.each(["en", "es"] as const)("cover every stored %s value", (locale) => {
    const messages = (locale === "es" ? esMessages : enMessages) as {
      Profile: Record<string, Record<string, string>>;
    };

    for (const [kind, dictionary] of Object.entries(
      PROFILE_VALUE_DICTIONARIES,
    )) {
      const entries = messages.Profile[dictionary];
      expect(entries, `${locale}.Profile.${dictionary}`).toBeDefined();
      for (const value of valuesByKind[kind as ProfileValueKind]) {
        expect(
          typeof entries[value],
          `${locale}.Profile.${dictionary}.${value}`,
        ).toBe("string");
      }
    }
  });
});
