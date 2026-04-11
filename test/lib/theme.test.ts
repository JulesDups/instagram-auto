import { describe, expect, test } from "vitest";
import { Theme as PrismaTheme } from "@prisma/client";
import { themeToDb, themeFromDb } from "@/lib/theme";

describe("theme enum conversion", () => {
  test("themeToDb maps hyphenated to underscored", () => {
    expect(themeToDb("tech-decryption")).toBe(PrismaTheme.tech_decryption);
    expect(themeToDb("build-in-public")).toBe(PrismaTheme.build_in_public);
    expect(themeToDb("human-pro")).toBe(PrismaTheme.human_pro);
  });

  test("themeFromDb maps underscored to hyphenated", () => {
    expect(themeFromDb(PrismaTheme.tech_decryption)).toBe("tech-decryption");
    expect(themeFromDb(PrismaTheme.build_in_public)).toBe("build-in-public");
    expect(themeFromDb(PrismaTheme.human_pro)).toBe("human-pro");
  });

  test("round-trip is identity", () => {
    const values = ["tech-decryption", "build-in-public", "human-pro"] as const;
    for (const v of values) {
      expect(themeFromDb(themeToDb(v))).toBe(v);
    }
  });
});
