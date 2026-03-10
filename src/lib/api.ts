import { supabase } from "./supabase";
export type {
  Listing,
  Conversation,
  Message,
  Report,
  Review,
} from "./database.types";

import type {
  Listing,
  Conversation,
  Message,
  Report,
  Review,
} from "./database.types";

// ── Extended types ─────────────────────────────────────────────────────────────

export interface ConversationWithPreview extends Conversation {
  other_name: string;
  other_initials: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  listing_title?: string;
  listing_price?: number;
  listing_images?: string[];
}

export interface SellerRating {
  average: number;
  count: number;
}

// ── Listings ───────────────────────────────────────────────────────────────────

/** Fetch all available listings, newest first. Optional filters. */
export async function fetchListings(opts?: {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  savedOnly?: string[];
}) {
  let query = supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });

  if (opts?.category && opts.category !== "All") {
    query = query.eq("category", opts.category);
  }
  if (opts?.search) {
    query = query.ilike("title", `%${opts.search}%`);
  }
  if (opts?.minPrice !== undefined && opts.minPrice > 0) {
    query = query.gte("price", opts.minPrice);
  }
  if (opts?.maxPrice !== undefined && opts.maxPrice < Infinity) {
    query = query.lte("price", opts.maxPrice);
  }
  if (opts?.savedOnly && opts.savedOnly.length > 0) {
    query = query.in("id", opts.savedOnly);
  }

  // Sorting
  if (opts?.sort === "price_asc") {
    query = query.order("price", { ascending: true });
  } else if (opts?.sort === "price_desc") {
    query = query.order("price", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Listing[];
}

/** Fetch a single listing by ID. */
export async function fetchListing(id: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Listing;
}

/** Fetch listings belonging to a specific user. */
export async function fetchUserListings(userId: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Listing[];
}

/** Delete a listing (must be owner). */
export async function deleteListing(id: string) {
  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) throw error;
}

/** Update a listing's fields. */
export async function updateListing(id: string, fields: Partial<Listing>) {
  const { error } = await supabase
    .from("listings")
    .update(fields)
    .eq("id", id);
  if (error) throw error;
}

// ── Conversations ──────────────────────────────────────────────────────────────

/** Fetch all conversations for a user with last message preview. */
export async function fetchConversations(
  userId: string,
): Promise<ConversationWithPreview[]> {
  // Get all conversations where user is buyer or seller
  const { data: convos, error } = await supabase
    .from("conversations")
    .select("*, listings(title, price, images)")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  if (!convos || convos.length === 0) return [];

  const convoIds = convos.map((c: any) => c.id);

  // Get last message for each conversation
  const { data: allMessages, error: msgError } = await supabase
    .from("messages")
    .select("*")
    .in("conversation_id", convoIds)
    .order("created_at", { ascending: false });

  if (msgError) throw msgError;

  // Get unread counts
  const { data: unreadData, error: unreadError } = await supabase
    .from("messages")
    .select("conversation_id")
    .in("conversation_id", convoIds)
    .neq("sender_id", userId)
    .eq("read", false);

  if (unreadError) throw unreadError;

  // Count unreads per conversation
  const unreadMap: Record<string, number> = {};
  for (const msg of unreadData ?? []) {
    unreadMap[msg.conversation_id] =
      (unreadMap[msg.conversation_id] || 0) + 1;
  }

  // Get other user names via auth metadata
  const otherUserIds = convos.map((c: any) =>
    c.buyer_id === userId ? c.seller_id : c.buyer_id,
  );
  const uniqueUserIds = [...new Set(otherUserIds)];
  const userNames = await fetchUserNames(uniqueUserIds);

  // Build last message map (first message per conversation = most recent)
  const lastMessageMap: Record<string, any> = {};
  for (const msg of allMessages ?? []) {
    if (!lastMessageMap[msg.conversation_id]) {
      lastMessageMap[msg.conversation_id] = msg;
    }
  }

  return convos.map((c: any) => {
    const otherId = c.buyer_id === userId ? c.seller_id : c.buyer_id;
    const otherName = userNames[otherId] || "Unknown";
    const initials = otherName
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    const lastMsg = lastMessageMap[c.id];
    const listing = c.listings;

    return {
      id: c.id,
      listing_id: c.listing_id,
      buyer_id: c.buyer_id,
      seller_id: c.seller_id,
      created_at: c.created_at,
      updated_at: c.updated_at,
      other_name: otherName,
      other_initials: initials,
      last_message: lastMsg?.content ?? "",
      last_message_time: lastMsg?.created_at ?? c.created_at,
      unread_count: unreadMap[c.id] || 0,
      listing_title: listing?.title,
      listing_price: listing?.price,
      listing_images: listing?.images,
    } as ConversationWithPreview;
  });
}

/** Get or create a conversation between buyer and seller about a listing. */
export async function fetchOrCreateConversation(
  listingId: string | null,
  buyerId: string,
  sellerId: string,
): Promise<Conversation> {
  // Try to find existing
  let query = supabase
    .from("conversations")
    .select("*")
    .eq("buyer_id", buyerId)
    .eq("seller_id", sellerId);

  if (listingId) {
    query = query.eq("listing_id", listingId);
  } else {
    query = query.is("listing_id", null);
  }

  const { data: existing, error: findError } = await query.maybeSingle();
  if (findError) throw findError;
  if (existing) return existing as Conversation;

  // Create new
  const { data: created, error: createError } = await supabase
    .from("conversations")
    .insert({
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
    })
    .select()
    .single();

  if (createError) throw createError;
  return created as Conversation;
}

/** Fetch all messages in a conversation. */
export async function fetchMessages(
  conversationId: string,
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Message[];
}

/** Send a message in a conversation. */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
    })
    .select()
    .single();

  if (error) throw error;

  // Update conversation timestamp
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data as Message;
}

/** Mark all messages from the other user as read. */
export async function markMessagesRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .eq("read", false);

  if (error) throw error;
}

/** Get total unread message count for a user. */
export async function getUnreadCount(userId: string): Promise<number> {
  // Get all conversation IDs where user is a participant
  const { data: convos, error: convoError } = await supabase
    .from("conversations")
    .select("id")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

  if (convoError) throw convoError;
  if (!convos || convos.length === 0) return 0;

  const convoIds = convos.map((c: any) => c.id);

  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .in("conversation_id", convoIds)
    .neq("sender_id", userId)
    .eq("read", false);

  if (error) throw error;
  return count ?? 0;
}

// ── Reports ────────────────────────────────────────────────────────────────────

/** Submit a report for a listing. */
export async function submitReport(
  listingId: string,
  reporterId: string,
  reason: string,
  details?: string,
): Promise<Report> {
  const { data, error } = await supabase
    .from("reports")
    .insert({
      listing_id: listingId,
      reporter_id: reporterId,
      reason,
      details: details || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("You have already reported this listing.");
    }
    throw error;
  }
  return data as Report;
}

/** Check if a user has already reported a listing. */
export async function hasReported(
  listingId: string,
  reporterId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("listing_id", listingId)
    .eq("reporter_id", reporterId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

// ── Reviews ────────────────────────────────────────────────────────────────────

/** Submit a review for a seller after a transaction. */
export async function submitReview(
  listingId: string,
  reviewerId: string,
  sellerId: string,
  rating: number,
  comment?: string,
): Promise<Review> {
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      listing_id: listingId,
      reviewer_id: reviewerId,
      seller_id: sellerId,
      rating: Math.min(5, Math.max(1, Math.round(rating))),
      comment: comment || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("You have already reviewed this listing.");
    }
    throw error;
  }
  return data as Review;
}

/** Fetch all reviews for a seller. */
export async function fetchSellerReviews(
  sellerId: string,
): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Review[];
}

/** Get a seller's average rating and total review count. */
export async function fetchSellerRating(
  sellerId: string,
): Promise<SellerRating> {
  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("seller_id", sellerId);

  if (error) throw error;

  const reviews = data ?? [];
  if (reviews.length === 0) return { average: 0, count: 0 };

  const sum = reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
  return {
    average: Math.round((sum / reviews.length) * 10) / 10,
    count: reviews.length,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Fetch display names for a list of user IDs via Supabase auth admin or profiles. */
async function fetchUserNames(
  userIds: string[],
): Promise<Record<string, string>> {
  // Since we can't call auth.admin from the client, we look up seller_name
  // from listings created by these users as a fallback.
  const nameMap: Record<string, string> = {};

  if (userIds.length === 0) return nameMap;

  const { data, error } = await supabase
    .from("listings")
    .select("user_id, seller_name")
    .in("user_id", userIds)
    .not("seller_name", "is", null);

  if (error) return nameMap;

  for (const row of data ?? []) {
    if (row.seller_name && !nameMap[row.user_id]) {
      nameMap[row.user_id] = row.seller_name;
    }
  }

  return nameMap;
}

// ── Storage ───────────────────────────────────────────────────────────────────

const BUCKET = "listing-images";

/** Upload an image to Supabase Storage and return its public URL. */
export async function uploadListingImage(
  file: File,
  userId: string,
): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return publicUrl;
}

/** Delete images from Supabase Storage by their full URLs. */
export async function deleteListingImages(urls: string[]): Promise<void> {
  const paths = urls
    .map((url) => {
      const marker = `/object/public/${BUCKET}/`;
      const idx = url.indexOf(marker);
      return idx !== -1 ? url.slice(idx + marker.length) : null;
    })
    .filter(Boolean) as string[];

  if (paths.length === 0) return;

  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) throw error;
}
