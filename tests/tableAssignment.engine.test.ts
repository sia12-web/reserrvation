import { findBestTableAssignment } from "../src/services/tableAssignment/engine";

describe("table assignment engine", () => {
  test("Case A: party of 2 prefers T1 over T9", () => {
    const available = ["T1", "T9"];
    const result = findBestTableAssignment(2, available);

    expect(result.best?.tableIds).toEqual(["T1"]);
  });

  test("Case B: party of 8 finds T11", () => {
    const available = ["T1", "T2", "T3", "T10", "T11"];
    const result = findBestTableAssignment(8, available);

    expect(result.best?.tableIds).toEqual(["T11"]);
  });

  test("Case C: party of 12 finds [T10, T9]", () => {
    const available = ["T9", "T10", "T11"];
    const result = findBestTableAssignment(12, available);

    expect(result.best?.tableIds).toEqual(["T10", "T9"]);
  });
});
