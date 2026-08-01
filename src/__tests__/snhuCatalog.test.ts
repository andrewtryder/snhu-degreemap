import { describe, expect, it } from "vitest";
import {
  getPublicSnhuCatalogProgramUrl,
  resolvePublicCatalogUrl,
} from "@/lib/snhuCatalog";

describe("public SNHU catalog URLs", () => {
  it("builds the exact Computer Science public catalog URL", () => {
    expect(getPublicSnhuCatalogProgramUrl("V1S14E8tg")).toBe(
      "https://www.snhu.edu/admission/academic-catalogs#/programs/V1S14E8tg/none",
    );
  });

  it("uses the same public pattern for other source PIDs", () => {
    expect(getPublicSnhuCatalogProgramUrl("AbC123xyz")).toBe(
      "https://www.snhu.edu/admission/academic-catalogs#/programs/AbC123xyz/none",
    );
  });

  it("URL-encodes special characters in source PIDs", () => {
    expect(getPublicSnhuCatalogProgramUrl("pid/with space")).toBe(
      "https://www.snhu.edu/admission/academic-catalogs#/programs/pid%2Fwith%20space/none",
    );
  });

  it("never produces Kuali API URLs", () => {
    const url = getPublicSnhuCatalogProgramUrl("V1S14E8tg");
    expect(url).not.toMatch(/\/api\//);
    expect(url).not.toMatch(/kuali\.co/);
  });

  it("returns null for missing source PIDs instead of a malformed URL", () => {
    expect(resolvePublicCatalogUrl(undefined)).toBeNull();
    expect(resolvePublicCatalogUrl(null)).toBeNull();
    expect(resolvePublicCatalogUrl("")).toBeNull();
    expect(resolvePublicCatalogUrl("   ")).toBeNull();
  });
});
