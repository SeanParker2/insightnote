-- Knowledge Graph Tables
CREATE TABLE IF NOT EXISTS kg_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('company', 'industry', 'event', 'indicator', 'policy', 'technology', 'person')),
  label VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kg_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('causes', 'affects', 'competes', 'supplies', 'belongs_to', 'correlates', 'triggers')),
  weight NUMERIC(3,2) NOT NULL DEFAULT 0.5 CHECK (weight >= 0 AND weight <= 1),
  description TEXT,
  evidence TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kg_nodes_user_id ON kg_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_kg_nodes_type ON kg_nodes(type);
CREATE INDEX IF NOT EXISTS idx_kg_nodes_label ON kg_nodes(label);
CREATE INDEX IF NOT EXISTS idx_kg_edges_user_id ON kg_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_source_id ON kg_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_target_id ON kg_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_type ON kg_edges(type);

-- Decision Memory Table
CREATE TABLE IF NOT EXISTS decision_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('buy', 'sell', 'hold', 'add', 'reduce')),
  reasoning TEXT NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 1 AND confidence <= 5),
  emotion_state VARCHAR(20) NOT NULL,
  market_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  outcome JSONB,
  reflection JSONB,
  triggered_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_memories_user_id ON decision_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_decision_memories_symbol ON decision_memories(symbol);
CREATE INDEX IF NOT EXISTS idx_decision_memories_created_at ON decision_memories(created_at);

-- RLS Policies
ALTER TABLE kg_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kg_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY kg_nodes_select_own ON kg_nodes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY kg_nodes_insert_own ON kg_nodes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY kg_nodes_update_own ON kg_nodes FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY kg_nodes_delete_own ON kg_nodes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY kg_edges_select_own ON kg_edges FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY kg_edges_insert_own ON kg_edges FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY kg_edges_update_own ON kg_edges FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY kg_edges_delete_own ON kg_edges FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY decision_memories_select_own ON decision_memories FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY decision_memories_insert_own ON decision_memories FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY decision_memories_update_own ON decision_memories FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY decision_memories_delete_own ON decision_memories FOR DELETE TO authenticated USING (user_id = auth.uid());
