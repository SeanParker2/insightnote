
-- Community Voting Table
CREATE TABLE post_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  direction TEXT CHECK (direction IN ('up', 'down')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Indexes
CREATE INDEX idx_post_votes_post_id ON post_votes(post_id);
CREATE INDEX idx_post_votes_user_id ON post_votes(user_id);

-- RLS Policies
ALTER TABLE post_votes ENABLE ROW LEVEL SECURITY;

-- Everyone can read votes (to calculate counts)
CREATE POLICY "Public read access"
  ON post_votes FOR SELECT
  USING (true);

-- Authenticated users can insert their own votes
CREATE POLICY "Users can insert their own votes"
  ON post_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own votes
CREATE POLICY "Users can update their own votes"
  ON post_votes FOR UPDATE
  USING (auth.uid() = user_id);

-- Authenticated users can delete their own votes
CREATE POLICY "Users can delete their own votes"
  ON post_votes FOR DELETE
  USING (auth.uid() = user_id);
