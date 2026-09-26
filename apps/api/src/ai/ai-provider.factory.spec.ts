import { describe, expect, it } from "vitest";
import { createAiProvider } from "./ai-provider.factory.js";

describe("createAiProvider", () => {
  it("chains Gemini, Groq then Mistral when all have keys", () => {
    const provider = createAiProvider({ GEMINI_API_KEY: "g", GROQ_API_KEY: "q", MISTRAL_API_KEY: "m" });

    expect(provider.backends.map((backend) => backend.name)).toEqual(["gemini", "groq", "mistral"]);
  });

  it("skips providers without any key", () => {
    const provider = createAiProvider({ GEMINI_API_KEY: "", GROQ_API_KEY_2: "q2", MISTRAL_API_KEY: "m" });

    expect(provider.backends.map((backend) => backend.name)).toEqual(["groq", "mistral"]);
  });

  it("has no backend when no key is configured", () => {
    expect(createAiProvider({}).backends).toEqual([]);
  });
});
