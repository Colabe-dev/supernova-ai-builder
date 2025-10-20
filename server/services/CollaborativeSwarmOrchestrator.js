import pg from 'pg';
import { logger } from '../observability/index.js';
import AgentProcessor from './AgentProcessor.js';

const { Pool } = pg;

class CollaborativeSwarmOrchestrator {
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.agentDefinitions = this.initializeAgentDefinitions();
    this.activeDiscussions = new Map();
  }

  initializeAgentDefinitions() {
    return {
      architect: {
        type: 'architect',
        personality: {
          style: 'visionary',
          focus: 'system design and scalability',
          strength: 'seeing the big picture',
          weakness: 'may overlook implementation details'
        },
        expertise: ['architecture', 'design patterns', 'scalability', 'system integration']
      },
      critic: {
        type: 'critic',
        personality: {
          style: 'analytical',
          focus: 'finding flaws and edge cases',
          strength: 'identifying potential problems',
          weakness: 'can be overly cautious'
        },
        expertise: ['code review', 'security', 'error handling', 'edge cases']
      },
      optimizer: {
        type: 'optimizer',
        personality: {
          style: 'pragmatic',
          focus: 'performance and efficiency',
          strength: 'finding optimal solutions',
          weakness: 'may prioritize speed over clarity'
        },
        expertise: ['performance', 'algorithms', 'optimization', 'resource management']
      },
      innovator: {
        type: 'innovator',
        personality: {
          style: 'creative',
          focus: 'novel approaches and alternatives',
          strength: 'thinking outside the box',
          weakness: 'solutions may be untested'
        },
        expertise: ['creative solutions', 'new technologies', 'alternative approaches', 'experimentation']
      },
      pragmatist: {
        type: 'pragmatist',
        personality: {
          style: 'balanced',
          focus: 'practical implementation',
          strength: 'grounding solutions in reality',
          weakness: 'may resist innovative approaches'
        },
        expertise: ['implementation', 'maintainability', 'best practices', 'developer experience']
      }
    };
  }

  async ensureAgentsExist(roomId) {
    const client = await this.pool.connect();
    try {
      const agentTypes = Object.keys(this.agentDefinitions);
      
      for (const agentType of agentTypes) {
        const definition = this.agentDefinitions[agentType];
        
        await client.query(`
          INSERT INTO swarm_agents (room_id, agent_type, personality_config, expertise_domains, is_active)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (room_id, agent_type) DO UPDATE
          SET personality_config = $3, expertise_domains = $4, is_active = $5
        `, [
          roomId,
          agentType,
          JSON.stringify(definition.personality),
          definition.expertise,
          true
        ]);
      }

      logger.info({ roomId, agentCount: agentTypes.length }, 'Swarm agents initialized');
      return agentTypes;
    } catch (error) {
      logger.error({ error, roomId }, 'Failed to initialize swarm agents');
      throw error;
    } finally {
      client.release();
    }
  }

  async startDiscussion(roomId, problemStatement, context = {}) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(`
        INSERT INTO swarm_discussions (room_id, problem_statement, context, status)
        VALUES ($1, $2, $3, 'active')
        RETURNING *
      `, [roomId, problemStatement, JSON.stringify(context)]);

      const discussion = result.rows[0];

      await this.ensureAgentsExist(roomId);

      await client.query('COMMIT');

      logger.info({ 
        discussionId: discussion.id, 
        roomId, 
        problemStatement: problemStatement.substring(0, 100) 
      }, 'Discussion started');

      this.activeDiscussions.set(discussion.id, {
        discussionId: discussion.id,
        roomId,
        currentRound: 1,
        maxRounds: 3
      });

      return discussion;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error, roomId, problemStatement }, 'Failed to start discussion');
      throw error;
    } finally {
      client.release();
    }
  }

  async facilitateDebate(discussionId, maxRounds = 3) {
    logger.info({ discussionId, maxRounds }, 'Facilitating debate');
    
    const client = await this.pool.connect();
    try {
      const discussionResult = await client.query(
        'SELECT * FROM swarm_discussions WHERE id = $1',
        [discussionId]
      );
      
      if (discussionResult.rows.length === 0) {
        throw new Error(`Discussion ${discussionId} not found`);
      }

      const discussion = discussionResult.rows[0];
      const agentProcessor = new AgentProcessor(this.pool, this.agentDefinitions);

      for (let round = 1; round <= maxRounds; round++) {
        logger.info({ discussionId, round }, 'Starting debate round');

        const contributions = [];
        for (const agentType of Object.keys(this.agentDefinitions)) {
          const contribution = await agentProcessor.generateContribution(
            discussionId,
            agentType,
            discussion,
            round
          );
          contributions.push(contribution);
        }

        if (round < maxRounds) {
          await agentProcessor.facilitateInteractions(discussionId, contributions, round);
        }

        const convergenceScore = await this.checkConvergence(discussionId);
        logger.info({ discussionId, round, convergenceScore }, 'Debate round completed');

        if (convergenceScore > 0.85) {
          logger.info({ discussionId, round }, 'High convergence achieved, ending debate early');
          break;
        }
      }

      const consensus = await this.buildConsensus(discussionId);
      
      await client.query(`
        UPDATE swarm_discussions 
        SET status = 'resolved', 
            consensus_solution = $1,
            confidence_score = $2,
            resolved_at = NOW()
        WHERE id = $3
      `, [
        JSON.stringify(consensus.finalDecision),
        consensus.agreementLevel,
        discussionId
      ]);

      this.activeDiscussions.delete(discussionId);

      return consensus;
    } catch (error) {
      logger.error({ error, discussionId }, 'Failed to facilitate debate');
      throw error;
    } finally {
      client.release();
    }
  }

  async checkConvergence(discussionId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          agent_type,
          AVG(confidence) as avg_confidence,
          COUNT(*) as contribution_count
        FROM agent_contributions
        WHERE discussion_id = $1
        GROUP BY agent_type
      `, [discussionId]);

      if (result.rows.length === 0) return 0;

      const avgConfidence = result.rows.reduce((sum, row) => sum + parseFloat(row.avg_confidence), 0) / result.rows.length;

      const varianceResult = await client.query(`
        SELECT VARIANCE(confidence) as confidence_variance
        FROM agent_contributions
        WHERE discussion_id = $1
      `, [discussionId]);

      const variance = parseFloat(varianceResult.rows[0]?.confidence_variance || 1);
      const convergenceScore = avgConfidence * (1 - Math.min(variance, 1));

      return convergenceScore;
    } catch (error) {
      logger.error({ error, discussionId }, 'Failed to check convergence');
      return 0;
    } finally {
      client.release();
    }
  }

  async buildConsensus(discussionId) {
    const client = await this.pool.connect();
    try {
      const contributionsResult = await client.query(`
        SELECT * FROM agent_contributions
        WHERE discussion_id = $1
        ORDER BY confidence DESC, created_at DESC
      `, [discussionId]);

      const contributions = contributionsResult.rows;

      const solutions = contributions
        .filter(c => c.contribution_type === 'solution')
        .map(c => ({
          agentType: c.agent_type,
          content: c.content,
          reasoning: c.reasoning,
          confidence: parseFloat(c.confidence),
          votes: c.votes_for - c.votes_against
        }));

      const topSolution = solutions.reduce((best, current) => {
        const score = current.confidence * 0.6 + (current.votes / Math.max(solutions.length, 1)) * 0.4;
        const bestScore = best.confidence * 0.6 + (best.votes / Math.max(solutions.length, 1)) * 0.4;
        return score > bestScore ? current : best;
      }, solutions[0] || { content: 'No consensus reached', confidence: 0 });

      const dissenting = solutions
        .filter(s => s.agentType !== topSolution.agentType)
        .map(s => ({
          agentType: s.agentType,
          concern: s.content,
          reasoning: s.reasoning
        }));

      const interactionsResult = await client.query(`
        SELECT interaction_type, COUNT(*) as count
        FROM agent_interactions
        WHERE discussion_id = $1
        GROUP BY interaction_type
      `, [discussionId]);

      const lessonsLearned = {
        totalInteractions: interactionsResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        interactionBreakdown: interactionsResult.rows.reduce((acc, row) => {
          acc[row.interaction_type] = parseInt(row.count);
          return acc;
        }, {}),
        topContributors: solutions.slice(0, 3).map(s => s.agentType)
      };

      const agreementLevel = solutions.length > 0
        ? (topSolution.confidence + (topSolution.votes / solutions.length)) / 2
        : 0;

      const consensusData = {
        finalDecision: {
          solution: topSolution.content,
          reasoning: topSolution.reasoning,
          primaryAgent: topSolution.agentType,
          confidence: topSolution.confidence
        },
        agreementLevel,
        dissentingViews: dissenting,
        lessonsLearned
      };

      await client.query(`
        INSERT INTO swarm_consensus (discussion_id, final_decision, agreement_level, dissenting_views, lessons_learned)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        discussionId,
        JSON.stringify(consensusData.finalDecision),
        agreementLevel,
        JSON.stringify(dissenting),
        JSON.stringify(lessonsLearned)
      ]);

      logger.info({ discussionId, agreementLevel, topAgent: topSolution.agentType }, 'Consensus built');

      return consensusData;
    } catch (error) {
      logger.error({ error, discussionId }, 'Failed to build consensus');
      throw error;
    } finally {
      client.release();
    }
  }

  async getDiscussion(discussionId) {
    const client = await this.pool.connect();
    try {
      const discussionResult = await client.query(
        'SELECT * FROM swarm_discussions WHERE id = $1',
        [discussionId]
      );

      if (discussionResult.rows.length === 0) {
        return null;
      }

      const discussion = discussionResult.rows[0];

      const contributionsResult = await client.query(
        'SELECT * FROM agent_contributions WHERE discussion_id = $1 ORDER BY round, created_at',
        [discussionId]
      );

      const interactionsResult = await client.query(
        'SELECT * FROM agent_interactions WHERE discussion_id = $1 ORDER BY created_at',
        [discussionId]
      );

      const consensusResult = await client.query(
        'SELECT * FROM swarm_consensus WHERE discussion_id = $1',
        [discussionId]
      );

      return {
        ...discussion,
        contributions: contributionsResult.rows,
        interactions: interactionsResult.rows,
        consensus: consensusResult.rows[0] || null
      };
    } catch (error) {
      logger.error({ error, discussionId }, 'Failed to get discussion');
      throw error;
    } finally {
      client.release();
    }
  }

  async getDiscussionsByRoom(roomId, limit = 20) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          d.*,
          COUNT(DISTINCT ac.id) as contribution_count,
          COUNT(DISTINCT ai.id) as interaction_count
        FROM swarm_discussions d
        LEFT JOIN agent_contributions ac ON d.id = ac.discussion_id
        LEFT JOIN agent_interactions ai ON d.id = ai.discussion_id
        WHERE d.room_id = $1
        GROUP BY d.id
        ORDER BY d.created_at DESC
        LIMIT $2
      `, [roomId, limit]);

      return result.rows;
    } catch (error) {
      logger.error({ error, roomId }, 'Failed to get discussions by room');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

export default CollaborativeSwarmOrchestrator;
