// Auto-generated from Supabase OpenAPI spec
// Regenerate: fetch https://<project>.supabase.co/rest/v1/?apikey=<anon_key>

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      listings: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          category: string;
          condition: string;
          price: number;
          status: string;
          description: string;
          created_at: string;
          seller_name: string | null;
          images: string[];
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          category: string;
          condition: string;
          price: number;
          status?: string;
          description: string;
          created_at?: string;
          seller_name?: string | null;
          images?: string[];
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          category?: string;
          condition?: string;
          price?: number;
          status?: string;
          description?: string;
          created_at?: string;
          seller_name?: string | null;
          images?: string[];
        };
      };
      conversations: {
        Row: {
          id: string;
          listing_id: string | null;
          buyer_id: string;
          seller_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id?: string | null;
          buyer_id: string;
          seller_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string | null;
          buyer_id?: string;
          seller_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          read?: boolean;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          listing_id: string;
          reporter_id: string;
          reason: string;
          details: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          reporter_id: string;
          reason: string;
          details?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          reporter_id?: string;
          reason?: string;
          details?: string | null;
          status?: string;
          created_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          listing_id: string;
          reviewer_id: string;
          seller_id: string;
          reviewed_user_id: string;
          review_type: "buyer_to_seller" | "seller_to_buyer";
          reviewer_name: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          reviewer_id: string;
          seller_id: string;
          reviewed_user_id: string;
          review_type: "buyer_to_seller" | "seller_to_seller";
          reviewer_name: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          reviewer_id?: string;
          seller_id?: string;
          reviewed_user_id: string;
          review_type: "buyer_to_seller" | "seller_to_seller";
          reviewer_name: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          bio: string;
          major: string;
          graduation_year: number | null;
          avatar_url: string | null;
          notify_messages: boolean;
          notify_listings: boolean;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          phone?: string | null;
          bio?: string;
          major?: string;
          graduation_year?: number | null;
          avatar_url?: string | null;
          notify_messages?: boolean;
          notify_listings?: boolean;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string | null;
          bio?: string;
          major?: string;
          graduation_year?: number | null;
          avatar_url?: string | null;
          notify_messages?: boolean;
          notify_listings?: boolean;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      };
      transactions: {
        Row: {
          id: string;
          listing_id: string;
          seller_id: string;
          buyer_id: string | null;
          price: number;
          title: string;
          category: string;
          images: string[];
          status: string;
          completed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id?: string;
          seller_id: string;
          buyer_id: string | null;
          price: number;
          title: string;
          category?: string;
          images?: string[];
          status?: string;
          completed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          seller_id?: string;
          buyer_id?: string | null;
          price?: number;
          title?: string;
          category?: string;
          images?: string[];
          status?: string;
          completed_at?: string;
          created_at?: string;
        }
      }
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          link: string | null;
          read: boolean;
          data: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string;
          link?: string | null;
          read?: boolean;
          data?: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string;
          link?: string | null;
          read?: boolean;
          data?: Record<string, any>;
          created_at?: string;
        }
      }
    };
  };
}

// Convenience row type aliases
export type Listing = Database["public"]["Tables"]["listings"]["Row"];
export type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"];
export type ListingUpdate = Database["public"]["Tables"]["listings"]["Update"];

export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type ConversationInsert = Database["public"]["Tables"]["conversations"]["Insert"];

export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];

export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];

export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type ReviewInsert = Database["public"]["Tables"]["reviews"]["Insert"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
export type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"];

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];