import type { Locale } from "../locales";
import { en } from "./en";
import { fr, type Dictionary } from "./fr";

export type { Dictionary };

export const DICTIONARIES: Record<Locale, Dictionary> = { fr, en };
