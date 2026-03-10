import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("../src/lib/supabase", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    storage: { from: vi.fn() },
  },
}));

import {
  fetchOrCreateConversation,
  fetchConversations,
  getUnreadCount,
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

describe("fetchOrCreateConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing conversation when found", async () => {
    const existing = { id: "c1", listing_id: "l1", buyer_id: "b1", seller_id: "s1" };
    const chain = chainable();
    chain.maybeSingle.mockReturnValue(Promise.resolve({ data: existing, error: null }));
    mockFrom.mockReturnValue(chain);

    const result = await fetchOrCreateConversation("l1", "b1", "s1");
    expect(result).toEqual(existing);
    expect(chain.eq).toHaveBeenCalledWith("buyer_id", "b1");
    expect(chain.eq).toHaveBeenCalledWith("seller_id", "s1");
    expect(chain.eq).toHaveBeenCalledWith("listing_id", "l1");
  });

  it("creates new conversation when none exists", async () => {
    const created = { id: "c2", listing_id: "l1", buyer_id: "b1", seller_id: "s1" };

    // First call: find existing (returns null)
    const findChain = chainable();
    findChain.maybeSingle.mockReturnValue(Promise.resolve({ data: null, error: null }));

    // Second call: insert new
    const insertChain = chainable();
    insertChain.single.mockReturnValue(Promise.resolve({ data: created, error: null }));
    insertChain.select.mockReturnValue(insertChain);
    insertChain.insert.mockReturnValue(insertChain);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? findChain : insertChain;
    });

    const result = await fetchOrCreateConversation("l1", "b1", "s1");
    expect(result).toEqual(created);
    expect(insertChain.insert).toHaveBeenCalledWith({
      listing_id: "l1",
      buyer_id: "b1",
      seller_id: "s1",
    });
  });

  it("uses is(null) when listingId is null", async () => {
    const existing = { id: "c3", listing_id: null, buyer_id: "b1", seller_id: "s1" };
    const chain = chainable();
    chain.maybeSingle.mockReturnValue(Promise.resolve({ data: existing, error: null }));
    mockFrom.mockReturnValue(chain);

    await fetchOrCreateConversation(null, "b1", "s1");
    expect(chain.is).toHaveBeenCalledWith("listing_id", null);
  });

  it("throws on find error", async () => {
    const chain = chainable();
    chain.maybeSingle.mockReturnValue(
      Promise.resolve({ data: null, error: { message: "DB error" } }),
    );
    mockFrom.mockReturnValue(chain);

    await expect(fetchOrCreateConversation("l1", "b1", "s1")).rejects.toEqual({
      message: "DB error",
    });
  });

  it("throws on create error", async () => {
    const findChain = chainable();
    findChain.maybeSingle.mockReturnValue(Promise.resolve({ data: null, error: null }));

    const insertChain = chainable();
    insertChain.single.mockReturnValue(
      Promise.resolve({ data: null, error: { message: "Insert failed" } }),
    );
    insertChain.select.mockReturnValue(insertChain);
    insertChain.insert.mockReturnValue(insertChain);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? findChain : insertChain;
    });

    await expect(fetchOrCreateConversation("l1", "b1", "s1")).rejects.toEqual({
      message: "Insert failed",
    });
  });
});

describe("getUnreadCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns count when conversations exist", async () => {
    // First call: get conversation IDs
    const convoChain = chainable();
    convoChain.or.mockReturnValue(
      Promise.resolve({ data: [{ id: "c1" }, { id: "c2" }], error: null }),
    );

    // Second call: count unread messages
    const msgChain = chainable();
    msgChain.eq.mockReturnValue(Promise.resolve({ count: 5, error: null }));
    msgChain.neq.mockReturnValue(msgChain);
    msgChain.in.mockReturnValue(msgChain);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? convoChain : msgChain;
    });

    const count = await getUnreadCount("user-1");
    expect(count).toBe(5);
  });

  it("returns 0 when conversations query errors on messages", async () => {
    const convoChain = chainable();
    convoChain.or.mockReturnValue(
      Promise.resolve({ data: [{ id: "c1" }], error: null }),
    );

    const msgChain = chainable();
    msgChain.eq.mockReturnValue(
      Promise.resolve({ count: null, error: { message: "Error" } }),
    );
    msgChain.neq.mockReturnValue(msgChain);
    msgChain.in.mockReturnValue(msgChain);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? convoChain : msgChain;
    });

    await expect(getUnreadCount("user-1")).rejects.toEqual({ message: "Error" });
  });
});

describe("fetchConversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no conversations", async () => {
    const chain = chainable();
    chain.order.mockReturnValue(Promise.resolve({ data: [], error: null }));
    chain.or.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    const result = await fetchConversations("user-1");
    expect(result).toEqual([]);
  });

  it("throws on conversation fetch error", async () => {
    const chain = chainable();
    chain.order.mockReturnValue(
      Promise.resolve({ data: null, error: { message: "Failed" } }),
    );
    chain.or.mockReturnValue(chain);
    mockFrom.mockReturnValue(chain);

    await expect(fetchConversations("user-1")).rejects.toEqual({ message: "Failed" });
  });
});
