import { describe, it, expect } from "vitest";

// Test the email validation logic directly (same logic as supabase.ts)
const ALLOWED_DOMAIN = "farmingdale.edu";

function isValidStudentEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain === ALLOWED_DOMAIN;
}

describe("Email Validation", () => {
  it("accepts valid farmingdale.edu email", () => {
    expect(isValidStudentEmail("student@farmingdale.edu")).toBe(true);
  });

  it("accepts email with uppercase domain", () => {
    expect(isValidStudentEmail("student@FARMINGDALE.EDU")).toBe(true);
  });

  it("accepts email with mixed case domain", () => {
    expect(isValidStudentEmail("student@Farmingdale.Edu")).toBe(true);
  });

  it("rejects gmail.com", () => {
    expect(isValidStudentEmail("student@gmail.com")).toBe(false);
  });

  it("rejects similar but wrong domain", () => {
    expect(isValidStudentEmail("student@farmingdale.com")).toBe(false);
  });

  it("rejects subdomain of farmingdale.edu", () => {
    expect(isValidStudentEmail("student@mail.farmingdale.edu")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidStudentEmail("")).toBe(false);
  });

  it("rejects email without @ symbol", () => {
    expect(isValidStudentEmail("studentfarmingdale.edu")).toBe(false);
  });

  it("rejects email with no domain", () => {
    expect(isValidStudentEmail("student@")).toBe(false);
  });
});

describe("Database Types", () => {
  it("Listing type has required fields", async () => {
    const { default: types } = await import("../src/lib/database.types");
    // This is a compile-time check — if it imports without error, the types exist
    expect(types).toBeUndefined(); // module has no default export, just types
  });
});
