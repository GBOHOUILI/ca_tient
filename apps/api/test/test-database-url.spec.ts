import { describe, expect, it } from "vitest";
import { resolveTestDatabaseUrl } from "./test-database-url.js";

describe("resolveTestDatabaseUrl", () => {
  it("uses DATABASE_URL_TEST when it is set", () => {
    expect(
      resolveTestDatabaseUrl({
        DATABASE_URL: "postgresql://u:p@localhost:5433/ca_tient?schema=public",
        DATABASE_URL_TEST: "postgresql://u:p@localhost:5433/autre_base",
      }),
    ).toBe("postgresql://u:p@localhost:5433/autre_base");
  });

  it("derives a _test database from DATABASE_URL, keeping credentials and query", () => {
    expect(resolveTestDatabaseUrl({ DATABASE_URL: "postgresql://u:p@localhost:5433/ca_tient?schema=public" })).toBe(
      "postgresql://u:p@localhost:5433/ca_tient_test?schema=public",
    );
  });

  it("does not append the suffix twice", () => {
    expect(resolveTestDatabaseUrl({ DATABASE_URL: "postgresql://u:p@localhost:5433/ca_tient_test" })).toBe(
      "postgresql://u:p@localhost:5433/ca_tient_test",
    );
  });

  it("refuses to run when the test database would be the dev database", () => {
    expect(() =>
      resolveTestDatabaseUrl({
        DATABASE_URL: "postgresql://u:p@localhost:5433/ca_tient",
        DATABASE_URL_TEST: "postgresql://u:p@localhost:5433/ca_tient",
      }),
    ).toThrow(/base de dev/);
  });

  it("throws when no database URL is configured", () => {
    expect(() => resolveTestDatabaseUrl({})).toThrow(/DATABASE_URL/);
  });
});
