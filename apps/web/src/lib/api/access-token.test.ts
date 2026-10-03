import { describe, expect, it } from "vitest";
import { ideaIdsFromStorageKeys } from "./access-token";

describe("ideaIdsFromStorageKeys", () => {
  it("keeps only the ideas this browser has an access token for", () => {
    expect(
      ideaIdsFromStorageKeys([
        "ca-tient:access:cmabc123",
        "ca-tient:visitor",
        "ca-tient:access:cmdef456",
        "theme",
        "ca-tient:access:",
      ]),
    ).toEqual(["cmabc123", "cmdef456"]);
  });
});
