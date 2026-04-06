import { supabase } from "./supabase";
export type {
  Listing,
  Conversation,
  Message,
  Report,
  Review,
  Profile,
  Transaction,
} from "./database.types";

import type {
  Listing,
  Conversation,
  Message,
  Report,
  Review,
  Profile,
  Transaction,
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

export interface UserRating {
  average: number;
  count: number;
  asSeller: { average: number; count: number; };
  asBuyer: { average: number; count: number; };
}

export interface TransactionWithNames extends Transaction {
  seller_name: string;
  buyer_name: string | null;
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
  reviewedUserId: string,
  sellerId: string,
  rating: number,
  reviewType: "buyer_to_seller" | "seller_to_buyer",
  reviewerName: string,
  comment?: string,
): Promise<Review> {
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      listing_id: listingId,
      reviewer_id: reviewerId,
      seller_id: sellerId,
      reviewed_user_id: reviewedUserId,
      review_type: reviewType,
      reviewer_name: reviewerName,
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
    .eq("reviewed_user_id", sellerId)
    .eq("review_type", "buyer_to_seller")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Review[];
}

/** Fetch all reviews about a user (both as seller and as buyer). */
export async function fetchUserReviews(
  userId: string,
): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("reviewed_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Review[];
}

/** Fetch all reviews a user has left. */
export async function fetchReviewsByUser(
  userId: string,
): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("reviewer_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Review[];
}

/** Fetch reviews for a specific listing. */
export async function fetchListingReviews(
  listingId: string,
): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("listing_id", listingId)
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
    .eq("reviewed_user_id", sellerId)
    .eq("review_type", "buyer_to_seller");

  if (error) throw error;

  const reviews = data ?? [];
  if (reviews.length === 0) return { average: 0, count: 0 };

  const sum = reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
  return {
    average: Math.round((sum / reviews.length) * 10) / 10,
    count: reviews.length,
  };
}

/** Get a user's full rating breakdown (as seller and as buyer). */
export async function fetchUserRating(
  userId: string,
): Promise<UserRating> {
  const { data, error } = await supabase
  .from("reviews")
    .select("rating, review_type")
    .eq("reviewed_user_id", userId);

  if (error) throw error;

  const all = data ?? [];
  if (all.length === 0) {
    return {
      average: 0,
      count: 0,
      asSeller: { average: 0, count: 0 },
      asBuyer: { average: 0, count: 0 },
    };
  }

  const sellerReviews = all.filter((review: any) => review.review_type === "buyer_to_seller");
  const buyerReviews = all.filter((review: any) => review.review_type === "seller_to_buyer");

  function average(arr: any[]) {
    if (arr.length === 0) {
      return { average: 0, count: 0 };
    }

    const sum = arr.reduce((acc: number, r: any) => acc + r.rating, 0);
    return {
      average: Math.round((sum / arr.length) * 10) / 10,
      count: arr.length
    };
  }

  const overall = average(all);
  return {
    ...overall,
    asSeller: average(sellerReviews),
    asBuyer: average(buyerReviews),
  };
}

/** Check if a user has already reviewed a specific listing. */
export async function hasReviewed(
  listingId: string,
  reviewerId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true})
    .eq("listing_id", listingId)
    .eq("reviewer_id", reviewerId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

// ── Transactions ────────────────────────────────────────────────────────────────────
export async function fetchUserTransactions(
  userId: string,
): Promise<TransactionWithNames[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .or(`seller_id.eq.${userId}, buyer_id.eq.${userId}`)
    .order("completed_at", { ascending: false });
  
  if (error) {
    throw error;
  }
  if (!data || data.length === 0) {
    return [];
  }
  
  const userIds = new Set<string>();
  for (const transaction of data) {
    userIds.add(transaction.seller_id);
    
    if (transaction.buyer_id) {
      userIds.add(transaction.buyer_id);
    }
  }
  
  const names = await fetchUserNames([...userIds]);
  
  return data.map((transaction: any) => ({
    ...transaction,
    seller_name: names[transaction.seller_id] || "Unknown",
    buyer_name: transaction.buyer_id ? names[transaction.buyer_id] || "Unknown" : null,
  })) as TransactionWithNames[];
}

export async function createTransaction(fields: {
  listing_id: string;
  seller_id: string;
  buyer_id?: string | null;
  price: number;
  title: string;
  category?: string;
  images?: string[];
}): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .insert(fields)
    .select()
    .single();
  
  if (error) {
    throw error;
  }
  
  return data as Transaction;
}

export async function cancelTransaction(
  transactionId: string
) {
  const { error } = await supabase
    .from("transactions")
    .update({ status: "cancelled" })
    .eq("id", transactionId);
  
  if (error) {
    throw error;
  }
}

export async function assignTransactionBuyer(
  transactionId: string,
  buyerId: string,
) {
  const { error } = await supabase
    .from("transactions")
    .update({ buyer_id: buyerId })
    .eq("id", transactionId);
  
  if (error) {
    throw error;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Fetch display names for a list of user IDs via Supabase auth admin or profiles. */
export async function fetchUserNames(
  userIds: string[],
): Promise<Record<string, string>> {
  // Since we can't call auth.admin from the client, we look up seller_name
  // from listings created by these users as a fallback.
  const nameMap: Record<string, string> = {};

  if (userIds.length === 0) {
    return nameMap;
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  if (!profileError && profiles) {
    for (const profile of profiles) {
      if (profile.full_name) {
        nameMap[profile.id] = profile.full_name;
      }
    }
  }

  const missing = userIds.filter((id) => !nameMap[id]);
  if (missing.length > 0) {
    const { data: listings } = await supabase
      .from("listings")
      .select("user_id, seller_name")
      .in("user_id", userIds)
      .not("seller_name", "is", null);

    for (const row of listings ?? []) {
      if (row.seller_name && !nameMap[row.user_id]) {
        nameMap[row.user_id] = row.seller_name;
      }
    }
  }

  return nameMap;
}

/** Calculate how long ago a date string was from now. */
export function timeAgo(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const difference = now - date;
  const minutes = Math.floor(difference / 60000);
  
  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes/60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo ago`;
  }
  
  return `${Math.floor(months / 12)}y ago`;
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

// ── Saved Listings ─────────────────────────────────────────────────────────────

/** Get all saved listing IDs for the current user. */
export async function fetchSavedListingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("user_id", userId);
  
  if (error) {
    throw error;
  }
  
  return (data ?? []).map((row: any) => row.listing_id);
}

/** Toggle save/unsave a listing. */
export async function toggleSaveListing(
  userId: string,
  listingId: string,
): Promise<boolean> {
  const { data: existing, error: checkError } = await supabase
    .from("saved_listings")
    .select("id")
    .eq("user_id", userId)
    .eq("listing_id", listingId)
    .maybeSingle();
  
  if (checkError) {
    throw checkError;
  }
  
  if (existing) {
    const { error } = await supabase
    .from("saved_listings")
      .delete()
      .eq("user_id", userId)
      .eq("listing_id", listingId);
    
    if (error) {
      throw error;
    }
    
    return false;
  }
  else {
    const { error } = await supabase
      .from("saved_listings")
      .insert({ user_id: userId, listing_id: listingId });

    if (error) {
      throw error;
    }

    return true;
  }
}

// ── Admin / Moderation ────────────────────────────────────────────────────────

export interface ReportWithDetails extends Report {
  listing_title: string;
  listing_images: string[];
  listing_status: string;
  reporter_name: string;
  seller_name: string | null;
}

/** Check if the current user is an admin. */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();
  if (error) return false;
  return data?.is_admin === true;
}

/** Fetch all reports with listing details and reporter names. Admin only (RLS enforced). */
export async function fetchAllReports(
  statusFilter?: string,
): Promise<ReportWithDetails[]> {
  let query = supabase
    .from("reports")
    .select("*, listings(title, images, status, seller_name, user_id)")
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;

  const reporterIds = [...new Set((data ?? []).map((r: any) => r.reporter_id))];
  const names = await fetchUserNames(reporterIds);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    listing_id: r.listing_id,
    reporter_id: r.reporter_id,
    reason: r.reason,
    details: r.details,
    status: r.status,
    created_at: r.created_at,
    listing_title: r.listings?.title ?? "Deleted listing",
    listing_images: r.listings?.images ?? [],
    listing_status: r.listings?.status ?? "unknown",
    seller_name: r.listings?.seller_name ?? null,
    reporter_name: names[r.reporter_id] ?? "Unknown",
  })) as ReportWithDetails[];
}

/** Resolve or dismiss a report. Admin only (RLS enforced). */
export async function updateReportStatus(
  reportId: string,
  status: "resolved" | "dismissed",
): Promise<void> {
  const { error } = await supabase
    .from("reports")
    .update({ status })
    .eq("id", reportId);
  if (error) throw error;
}

/** Admin: delete any listing by ID (RLS allows admins). */
export async function adminDeleteListing(id: string): Promise<void> {
  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) throw error;
}

/** Fetch all listings for admin view. */
export async function fetchAllListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Listing[];
}

/** Fetch all user profiles. Admin only (RLS enforced). */
export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Profile[];
}