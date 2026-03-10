-- Run this in Supabase Dashboard > SQL Editor
-- RLS policies for conversations, messages, reports, reviews

-- ═══════════════════════════════════════════════════════════════
-- Enable RLS on all new tables
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- CONVERSATIONS
-- ═══════════════════════════════════════════════════════════════

-- Users can view conversations they're part of
CREATE POLICY "Users view own conversations"
ON conversations FOR SELECT
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Authenticated users can create conversations
CREATE POLICY "Authenticated users create conversations"
ON conversations FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- Participants can update their conversations (e.g. updated_at)
CREATE POLICY "Participants update conversations"
ON conversations FOR UPDATE
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ═══════════════════════════════════════════════════════════════
-- MESSAGES
-- ═══════════════════════════════════════════════════════════════

-- Users can view messages in their conversations
CREATE POLICY "Users view messages in own conversations"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
  )
);

-- Users can send messages in their conversations
CREATE POLICY "Users send messages in own conversations"
ON messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_id
    AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
  )
);

-- Users can update messages in their conversations (mark as read)
CREATE POLICY "Users update messages in own conversations"
ON messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
  )
);

-- ═══════════════════════════════════════════════════════════════
-- REPORTS
-- ═══════════════════════════════════════════════════════════════

-- Users can view their own reports
CREATE POLICY "Users view own reports"
ON reports FOR SELECT
USING (auth.uid() = reporter_id);

-- Authenticated users can submit reports
CREATE POLICY "Authenticated users submit reports"
ON reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- ═══════════════════════════════════════════════════════════════
-- REVIEWS
-- ═══════════════════════════════════════════════════════════════

-- Anyone can view reviews (public)
CREATE POLICY "Anyone can view reviews"
ON reviews FOR SELECT
USING (true);

-- Authenticated users can submit reviews
CREATE POLICY "Authenticated users submit reviews"
ON reviews FOR INSERT
WITH CHECK (auth.uid() = reviewer_id);

-- NOTE: Listings policies already exist, skipped.
