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

-- ═══════════════════════════════════════════════════════════════
-- EDIT LISTINGS
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Users can delete own listings"
ON listings FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own listings"
ON listings FOR UPDATE
USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- ADMIN HELPER FUNCTION (bypasses RLS to avoid infinite recursion)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════
-- ADMIN MODERATION POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Admin: view all reports
CREATE POLICY "Admins view all reports"
ON reports FOR SELECT
USING (public.is_admin());

-- Admin: update report status (resolve/dismiss)
CREATE POLICY "Admins update reports"
ON reports FOR UPDATE
USING (public.is_admin());

-- Admin: delete any listing
CREATE POLICY "Admins delete any listing"
ON listings FOR DELETE
USING (public.is_admin());

-- Admin: update any listing
CREATE POLICY "Admins update any listing"
ON listings FOR UPDATE
USING (public.is_admin());

-- Admin: view all profiles
CREATE POLICY "Admins view all profiles"
ON profiles FOR SELECT
USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- SECURITY: Prevent non-admins from promoting themselves
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION prevent_admin_self_promotion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Cannot modify admin status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_admin_promotion
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_admin_self_promotion();
