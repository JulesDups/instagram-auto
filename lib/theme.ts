import { Theme as PrismaTheme } from "@prisma/client";
import type { Theme } from "./content";

export function themeToDb(theme: Theme): PrismaTheme {
  switch (theme) {
    case "tech-decryption":
      return PrismaTheme.tech_decryption;
    case "build-in-public":
      return PrismaTheme.build_in_public;
    case "human-pro":
      return PrismaTheme.human_pro;
  }
}

export function themeFromDb(theme: PrismaTheme): Theme {
  switch (theme) {
    case PrismaTheme.tech_decryption:
      return "tech-decryption";
    case PrismaTheme.build_in_public:
      return "build-in-public";
    case PrismaTheme.human_pro:
      return "human-pro";
  }
}
