import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before importing api
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockNeq = vi.fn();
const mockOr = vi.fn();
const mockIn = vi.fn();
const mockIs = vi.fn();
const mockNot = vi.fn();
const mockIlike = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();

// Build a chainable mock
function chainable(overrides: Record<string, any> = {}) {
  const chain: any = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    neq: mockNeq,
    or: mockOr,
    in: mockIn,
    is: mockIs,
    not: mockNot,
    ilike: mockIlike,
    gte: mockGte,
    lte: mockLte,
    order: mockOrder,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    ...overrides,
  };
  // Make each method return the chain by default
  for (const key of Object.keys(chain)) {
    if (typeof chain[key] === "function" && !chain[key]._mockReturnValue) {
      chain[key] = vi.fn().mockReturnValue(chain);
    }
  }
  return chain;
}

const mockFrom = vi.fn();

vi.mock("../src/lib/supabase", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

// Import after mock
import {
  fetchListings,
  fetchListing,
  fetchUserListings,
  deleteListing,
  updateListing,
  fetchConversations,
  fetchOrCreateConversation,
  fetchMessages,
  sendMessage,
  markMessagesRead,
  getUnreadCount,
  submitReport,
  hasReported,
  submitReview,
  fetchSellerReviews,
  fetchSellerRating,
} from "../src/lib/api";

describe("Listings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchListings returns listings array", async () => {
    const listings = [
      { id: "1", title: "Book", price: 10, category: "Books" },
      { id: "2", title: "Lamp", price: 15, category: "Furniture" },
    ];
    const chain = chainable();
    chain.order.mockReturnValue(Promise.resolve({ data: listings, error: null }));
    chain.select.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    const result = await fetchListings();
    expect(mockFrom).toHaveBeenCalledWith("listings");
    expect(result).toEqual(listings);
  });

  it("fetchListings with category filter calls eq", async () => {
    const chain = chainable();
    // order() returns chain (sync chaining), then the final await resolves via .then
    chain.order.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    // Make chain thenable so await resolves it
    chain.then = (resolve: any) => resolve({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchListings({ category: "Books" });
    expect(chain.eq).toHaveBeenCalledWith("category", "Books");
  });

  it("fetchListings with search filter calls ilike", async () => {
    const chain = chainable();
    chain.order.mockReturnValue(chain);
    chain.ilike.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    chain.then = (resolve: any) => resolve({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchListings({ search: "calc" });
    expect(chain.ilike).toHaveBeenCalledWith("title", "%calc%");
  });

  it("fetchListings throws on supabase error", async () => {
    const chain = chainable();
    chain.order.mockReturnValue(
      Promise.resolve({ data: null, error: { message: "DB error" } }),
    );
    chain.select.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    await expect(fetchListings()).rejects.toEqual({ message: "DB error" });
  });

  it("fetchListing returns a single listing", async () => {
    const listing = { id: "1", title: "Book" };
    const chain = chainable();
    chain.single.mockReturnValue(Promise.resolve({ data: listing, error: null }));
    chain.eq.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    const result = await fetchListing("1");
    expect(result).toEqual(listing);
  });

  it("fetchUserListings filters by user_id", async () => {
    const chain = chainable();
    chain.order.mockReturnValue(Promise.resolve({ data: [], error: null }));
    chain.eq.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    await fetchUserListings("user-123");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-123");
  });

  it("deleteListing calls delete with id", async () => {
    const chain = chainable();
    chain.eq.mockReturnValue(Promise.resolve({ error: null }));
    chain.delete.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    await deleteListing("listing-1");
    expect(mockFrom).toHaveBeenCalledWith("listings");
    expect(chain.eq).toHaveBeenCalledWith("id", "listing-1");
  });

  it("updateListing calls update with fields", async () => {
    const chain = chainable();
    chain.eq.mockReturnValue(Promise.resolve({ error: null }));
    chain.update.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    await updateListing("listing-1", { title: "New Title" });
    expect(chain.update).toHaveBeenCalledWith({ title: "New Title" });
  });
});

describe("Messages API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchMessages returns messages for a conversation", async () => {
    const messages = [
      { id: "m1", conversation_id: "c1", content: "Hello" },
      { id: "m2", conversation_id: "c1", content: "Hi there" },
    ];
    const chain = chainable();
    chain.order.mockReturnValue(Promise.resolve({ data: messages, error: null }));
    chain.eq.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    const result = await fetchMessages("c1");
    expect(result).toEqual(messages);
    expect(chain.eq).toHaveBeenCalledWith("conversation_id", "c1");
  });

  it("sendMessage inserts and updates conversation timestamp", async () => {
    const msg = { id: "m1", content: "Test", conversation_id: "c1", sender_id: "u1" };

    // First call: insert message
    const insertChain = chainable();
    insertChain.single.mockReturnValue(Promise.resolve({ data: msg, error: null }));
    insertChain.select.mockReturnValue(insertChain);
    insertChain.insert.mockReturnValue(insertChain);

    // Second call: update conversation timestamp
    const updateChain = chainable();
    updateChain.eq.mockReturnValue(Promise.resolve({ error: null }));
    updateChain.update.mockReturnValue(updateChain);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? insertChain : updateChain;
    });

    const result = await sendMessage("c1", "u1", "Test");
    expect(result).toEqual(msg);
    expect(mockFrom).toHaveBeenCalledWith("messages");
    expect(mockFrom).toHaveBeenCalledWith("conversations");
  });

  it("markMessagesRead updates unread messages", async () => {
    const chain = chainable();
    chain.eq.mockReturnValue(Promise.resolve({ error: null }));
    chain.neq.mockReturnValue(chain);
    chain.update.mockReturnValue(chain);
    // Make the first eq return chain (for conversation_id filter)
    chain.eq.mockReturnValueOnce(chain);
    mockFrom.mockReturnValue(chain);

    await markMessagesRead("c1", "u1");
    expect(chain.update).toHaveBeenCalledWith({ read: true });
  });

  it("getUnreadCount returns 0 when no conversations", async () => {
    const chain = chainable();
    chain.or.mockReturnValue(Promise.resolve({ data: [], error: null }));
    chain.select.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    const count = await getUnreadCount("user-123");
    expect(count).toBe(0);
  });
});

describe("Reports API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submitReport inserts a report", async () => {
    const report = {
      id: "r1",
      listing_id: "l1",
      reporter_id: "u1",
      reason: "spam",
      details: null,
      status: "pending",
    };
    const chain = chainable();
    chain.single.mockReturnValue(Promise.resolve({ data: report, error: null }));
    chain.select.mockReturnValue(chain);
    chain.insert.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    const result = await submitReport("l1", "u1", "spam");
    expect(result).toEqual(report);
  });

  it("submitReport throws friendly message on duplicate", async () => {
    const chain = chainable();
    chain.single.mockReturnValue(
      Promise.resolve({ data: null, error: { code: "23505", message: "unique violation" } }),
    );
    chain.select.mockReturnValue(chain);
    chain.insert.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    await expect(submitReport("l1", "u1", "spam")).rejects.toThrow(
      "You have already reported this listing.",
    );
  });

  it("hasReported returns true when report exists", async () => {
    const chain = chainable();
    chain.eq.mockReturnValue(Promise.resolve({ count: 1, error: null }));
    chain.eq.mockReturnValueOnce(chain); // first eq returns chain
    chain.select.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    const result = await hasReported("l1", "u1");
    expect(result).toBe(true);
  });

  it("hasReported returns false when no report", async () => {
    const chain = chainable();
    chain.eq.mockReturnValue(Promise.resolve({ count: 0, error: null }));
    chain.eq.mockReturnValueOnce(chain);
    chain.select.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    const result = await hasReported("l1", "u1");
    expect(result).toBe(false);
  });
});

describe("Reviews API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submitReview inserts a review with clamped rating", async () => {
    const review = {
      id: "rv1",
      listing_id: "l1",
      reviewer_id: "u1",
      seller_id: "s1",
      rating: 5,
      comment: "Great seller",
    };
    const chain = chainable();
    chain.single.mockReturnValue(Promise.resolve({ data: review, error: null }));
    chain.select.mockReturnValue(chain);
    chain.insert.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    const result = await submitReview("l1", "u1", "s1", 5, "Great seller");
    expect(result).toEqual(review);
    // Verify rating is clamped (5 should stay 5)
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 5 }),
    );
  });

  it("submitReview clamps rating to 1-5 range", async () => {
    const chain = chainable();
    chain.single.mockReturnValue(
      Promise.resolve({ data: { rating: 5 }, error: null }),
    );
    chain.select.mockReturnValue(chain);
    chain.insert.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    await submitReview("l1", "u1", "s1", 10);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 5 }),
    );

    vi.clearAllMocks();
    const chain2 = chainable();
    chain2.single.mockReturnValue(
      Promise.resolve({ data: { rating: 1 }, error: null }),
    );
    chain2.select.mockReturnValue(chain2);
    chain2.insert.mockReturnValue(chain2);
    mockFrom.mockReturnValue(chain2);

    await submitReview("l1", "u1", "s1", -3);
    expect(chain2.insert).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 1 }),
    );
  });

  it("submitReview throws friendly message on duplicate", async () => {
    const chain = chainable();
    chain.single.mockReturnValue(
      Promise.resolve({ data: null, error: { code: "23505", message: "unique violation" } }),
    );
    chain.select.mockReturnValue(chain);
    chain.insert.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    await expect(submitReview("l1", "u1", "s1", 4)).rejects.toThrow(
      "You have already reviewed this listing.",
    );
  });

  it("fetchSellerReviews returns reviews array", async () => {
    const reviews = [
      { id: "rv1", rating: 5, comment: "Great" },
      { id: "rv2", rating: 4, comment: "Good" },
    ];
    const chain = chainable();
    chain.order.mockReturnValue(Promise.resolve({ data: reviews, error: null }));
    chain.eq.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    const result = await fetchSellerReviews("seller-1");
    expect(result).toEqual(reviews);
  });

  it("fetchSellerRating computes average correctly", async () => {
    const reviews = [{ rating: 5 }, { rating: 4 }, { rating: 3 }];
    const chain = chainable();
    chain.eq.mockReturnValue(Promise.resolve({ data: reviews, error: null }));
    chain.select.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    const result = await fetchSellerRating("seller-1");
    expect(result.average).toBe(4);
    expect(result.count).toBe(3);
  });

  it("fetchSellerRating returns zero for no reviews", async () => {
    const chain = chainable();
    chain.eq.mockReturnValue(Promise.resolve({ data: [], error: null }));
    chain.select.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    const result = await fetchSellerRating("seller-1");
    expect(result.average).toBe(0);
    expect(result.count).toBe(0);
  });
});
