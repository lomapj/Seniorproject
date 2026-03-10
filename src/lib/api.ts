import { supabase } from "./supabase";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface Listing {
  id: string;
  user_id: string;
  title: string;
  category: string;
  condition: string;
  price: number;
  status: string;
  description: string;
  images: string[];
  seller_name?: string;
  created_at: string;
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
