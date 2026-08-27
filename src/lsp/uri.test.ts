import { describe, expect, test } from "bun:test";
import { normalizeUri } from "./client.ts";

describe("normalizeUri drive-letter encoding", () => {
  // Roslyn's project system decodes a percent-encoded drive to "/c:/x", fails
  // to build a URI from it, and silently serves the file from a syntax-only
  // miscellaneous-files workspace — so results look plausible but are wrong.
  test("leaves a Windows drive colon literal", () => {
    expect(normalizeUri("C:\\Users\\x\\a.cs")).toBe("file:///c:/Users/x/a.cs");
  });

  test("normalizes an already-encoded file URI to the literal form", () => {
    expect(normalizeUri("file:///c%3A/Users/x/a.cs")).toBe("file:///c:/Users/x/a.cs");
  });

  // toString(true) would also un-encode these, producing an invalid URI.
  test("still encodes everything else, such as spaces", () => {
    expect(normalizeUri("C:\\Program Files\\a.cs")).toBe("file:///c:/Program%20Files/a.cs");
  });

  test("leaves POSIX paths untouched", () => {
    expect(normalizeUri("/home/x/a.ts")).toBe("file:///home/x/a.ts");
  });

  test("does not rewrite a colon later in the path", () => {
    expect(normalizeUri("/home/x/a:b.ts")).toBe("file:///home/x/a%3Ab.ts");
  });
});
