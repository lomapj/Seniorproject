import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("../src/lib/supabase", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    storage: { from: vi.fn() },
  },
}));

import {
  fetchListings,
  fetchListing,
  updateListing,
  deleteListing,
  submitReport,
  submitReview,
  fetchSellerRating,
} from "../src/lib/api";

function chainable() {
  const chain: any = {};
  const methods = [
    "select", "insert", "update", "delete", "eq", "neq", "or",
    "in", "is", "not", "ilike", "gte", "lte", "order", "single",
    "maybeSingle",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  return chain;
}

describe("Listings Edge Cases", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetchListings skips 'All' category", async () => {
    const chain = chainable();
    chain.order.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    chain.then = (resolve: any) => resolve({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchListings({ category: "All" });
    // eq should not be called for category when "All"
    expect(chain.eq).not.toHaveBeenCalledWith("category", "All");
  });

  it("fetchListings applies price range filters", async () => {
    const chain = chainable();
    chain.order.mockReturnValue(chain);
    chain.gte.mockReturnValue(chain);
    chain.lte.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    chain.then = (resolve: any) => resolve({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchListings({ minPrice: 10, maxPrice: 50 });
    expect(chain.gte).toHaveBeenCalledWith("price", 10);
    expect(chain.lte).toHaveBeenCalledWith("price", 50);
  });

  it("fetchListings skips minPrice of 0", async () => {
    const chain = chainable();
    chain.order.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    chain.then = (resolve: any) => resolve({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchListings({ minPrice: 0 });
    expect(chain.gte).not.toHaveBeenCalled();
  });

  it("fetchListings skips maxPrice of Infinity", async () => {
    const chain = chainable();
    chain.order.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    chain.then = (resolve: any) => resolve({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchListings({ maxPrice: Infinity });
    expect(chain.lte).not.toHaveBeenCalled();
  });

  it("fetchListings applies savedOnly filter", async () => {
    const chain = chainable();
    chain.order.mockReturnValue(chain);
    chain.in.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    chain.then = (resolve: any) => resolve({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchListings({ savedOnly: ["id1", "id2"] });
    expect(chain.in).toHaveBeenCalledWith("id", ["id1", "id2"]);
  });

  it("fetchListings skips empty savedOnly array", async () => {
    const chain = chainable();
    chain.order.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    chain.then = (resolve: any) => resolve({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchListings({ savedOnly: [] });
    expect(chain.in).not.toHaveBeenCalled();
  });

  it("fetchListings applies price_asc sort", async () => {
    const chain = chainable();
    chain.order.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    chain.then = (resolve: any) => resolve({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchListings({ sort: "price_asc" });
    expect(chain.order).toHaveBeenCalledWith("price", { ascending: true });
  });

  it("fetchListings applies price_desc sort", async () => {
    const chain = chainable();
    chain.order.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    chain.then = (resolve: any) => resolve({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchListings({ sort: "price_desc" });
    expect(chain.order).toHaveBeenCalledWith("price", { ascending: false });
  });

  it("fetchListings returns empty array when data is null", async () => {
    const chain = chainable();
    chain.order.mockReturnValue(Promise.resolve({ data: null, error: null }));
    chain.select.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    const result = await fetchListings();
    expect(result).toEqual([]);
  });

  it("fetchListing throws on error", async () => {
    const chain = chainable();
    chain.single.mockReturnValue(
      Promise.resolve({ data: null, error: { message: "Not found" } }),
    );
    chain.eq.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    await expect(fetchListing("bad-id")).rejects.toEqual({ message: "Not found" });
  });

  it("deleteListing throws on error", async () => {
    const chain = chainable();
    chain.eq.mockReturnValue(Promise.resolve({ error: { message: "Forbidden" } }));
    chain.delete.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    await expect(deleteListing("l1")).rejects.toEqual({ message: "Forbidden" });
  });

  it("updateListing throws on error", async () => {
    const chain = chainable();
    chain.eq.mockReturnValue(Promise.resolve({ error: { message: "Forbidden" } }));
    chain.update.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    await expect(updateListing("l1", { title: "x" })).rejects.toEqual({ message: "Forbidden" });
  });
});

describe("Reports Edge Cases", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submitReport passes details when provided", async () => {
    const chain = chainable();
    chain.single.mockReturnValue(
      Promise.resolve({ data: { id: "r1" }, error: null }),
    );
    chain.select.mockReturnValue(chain);
    chain.insert.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    await submitReport("l1", "u1", "spam", "Very spammy listing");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ details: "Very spammy listing" }),
    );
  });

  it("submitReport sets details to null when empty", async () => {
    const chain = chainable();
    chain.single.mockReturnValue(
      Promise.resolve({ data: { id: "r1" }, error: null }),
    );
    chain.select.mockReturnValue(chain);
    chain.insert.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    await submitReport("l1", "u1", "spam", "");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ details: null }),
    );
  });

  it("submitReport rethrows non-duplicate errors", async () => {
    const chain = chainable();
    chain.single.mockReturnValue(
      Promise.resolve({ data: null, error: { code: "42000", message: "Unknown" } }),
    );
    chain.select.mockReturnValue(chain);
    chain.insert.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    await expect(submitReport("l1", "u1", "spam")).rejects.toEqual({
      code: "42000",
      message: "Unknown",
    });
  });
});

describe("Reviews Edge Cases", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submitReview sets comment to null when empty", async () => {
    const chain = chainable();
    chain.single.mockReturnValue(
      Promise.resolve({ data: { id: "rv1" }, error: null }),
    );
    chain.select.mockReturnValue(chain);
    chain.insert.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    await submitReview("l1", "u1", "s1", 4, "");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ comment: null }),
    );
  });

  it("submitReview rounds fractional ratings", async () => {
    const chain = chainable();
    chain.single.mockReturnValue(
      Promise.resolve({ data: { id: "rv1" }, error: null }),
    );
    chain.select.mockReturnValue(chain);
    chain.insert.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    await submitReview("l1", "u1", "s1", 3.7);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 4 }),
    );
  });

  it("submitReview rethrows non-duplicate errors", async () => {
    const chain = chainable();
    chain.single.mockReturnValue(
      Promise.resolve({ data: null, error: { code: "42000", message: "Unknown" } }),
    );
    chain.select.mockReturnValue(chain);
    chain.insert.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    await expect(submitReview("l1", "u1", "s1", 4)).rejects.toEqual({
      code: "42000",
      message: "Unknown",
    });
  });

  it("fetchSellerRating rounds average to 1 decimal", async () => {
    const reviews = [{ rating: 5 }, { rating: 3 }]; // avg = 4.0
    const chain = chainable();
    chain.eq.mockReturnValue(Promise.resolve({ data: reviews, error: null }));
    chain.select.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    const result = await fetchSellerRating("s1");
    expect(result.average).toBe(4);
    expect(result.count).toBe(2);
  });

  it("fetchSellerRating handles single review", async () => {
    const chain = chainable();
    chain.eq.mockReturnValue(Promise.resolve({ data: [{ rating: 3 }], error: null }));
    chain.select.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    const result = await fetchSellerRating("s1");
    expect(result.average).toBe(3);
    expect(result.count).toBe(1);
  });
});
