-- Collaborative AI Swarm Intelligence Tables
-- Multi-agent system where AI agents collaborate with distinct personalities

-- Swarm agents with different roles and personalities
CREATE TABLE IF NOT EXISTS swarm_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  personality_config JSONB NOT NULL,
  expertise_domains TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, agent_type)
);

-- Discussion threads where agents collaborate
CREATE TABLE IF NOT EXISTS swarm_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  problem_statement TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'active',
  consensus_solution JSONB,
  confidence_score FLOAT DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Individual agent contributions to discussions
CREATE TABLE IF NOT EXISTS agent_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID REFERENCES swarm_discussions(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  contribution_type TEXT NOT NULL,
  content TEXT NOT NULL,
  reasoning TEXT,
  confidence FLOAT DEFAULT 0.0,
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  round INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interactions between agents (debates, agreements, challenges)
CREATE TABLE IF NOT EXISTS agent_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID REFERENCES swarm_discussions(id) ON DELETE CASCADE,
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,
  interaction_type TEXT NOT NULL,
  target_contribution_id UUID REFERENCES agent_contributions(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Final consensus reached by the swarm
CREATE TABLE IF NOT EXISTS swarm_consensus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID REFERENCES swarm_discussions(id) ON DELETE CASCADE,
  final_decision JSONB NOT NULL,
  agreement_level FLOAT DEFAULT 0.0,
  dissenting_views JSONB,
  lessons_learned JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_swarm_agents_room ON swarm_agents(room_id);
CREATE INDEX IF NOT EXISTS idx_swarm_agents_type ON swarm_agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_discussions_room ON swarm_discussions(room_id);
CREATE INDEX IF NOT EXISTS idx_discussions_status ON swarm_discussions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_discussion ON agent_contributions(discussion_id);
CREATE INDEX IF NOT EXISTS idx_contributions_agent ON agent_contributions(agent_type);
CREATE INDEX IF NOT EXISTS idx_interactions_discussion ON agent_interactions(discussion_id);
CREATE INDEX IF NOT EXISTS idx_consensus_discussion ON swarm_consensus(discussion_id);

-- Comments for documentation
COMMENT ON TABLE swarm_agents IS 'AI agents with distinct personalities and expertise for collaborative problem solving';
COMMENT ON TABLE swarm_discussions IS 'Discussion threads where multiple agents collaborate to solve problems';
COMMENT ON TABLE agent_contributions IS 'Individual contributions from each agent in a discussion';
COMMENT ON TABLE agent_interactions IS 'Interactions between agents (debates, agreements, challenges)';
COMMENT ON TABLE swarm_consensus IS 'Final consensus decision reached by the swarm after collaboration';
