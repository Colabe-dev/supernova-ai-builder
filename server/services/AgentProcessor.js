import { logger } from '../observability/index.js';
import OpenAI from 'openai';

class AgentProcessor {
  constructor(pool, agentDefinitions) {
    this.pool = pool;
    this.agentDefinitions = agentDefinitions;
    this.openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
    });
  }

  async generateContribution(discussionId, agentType, discussion, round) {
    try {
      const agent = this.agentDefinitions[agentType];
      if (!agent) {
        throw new Error(`Unknown agent type: ${agentType}`);
      }

      const previousContributions = await this.getPreviousContributions(discussionId, round);
      const previousInteractions = await this.getRelevantInteractions(discussionId, agentType);

      const prompt = this.buildPrompt(agent, discussion, previousContributions, previousInteractions, round);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: this.buildSystemPrompt(agent)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      const content = response.choices[0]?.message?.content || 'No response generated';
      
      const contributionData = this.parseContribution(content, agentType, round);

      const result = await this.pool.query(`
        INSERT INTO agent_contributions 
        (discussion_id, agent_type, contribution_type, content, reasoning, confidence, round)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        discussionId,
        agentType,
        contributionData.type,
        contributionData.content,
        contributionData.reasoning,
        contributionData.confidence,
        round
      ]);

      logger.info({ 
        discussionId, 
        agentType, 
        round, 
        contributionType: contributionData.type,
        confidence: contributionData.confidence
      }, 'Agent contribution generated');

      return result.rows[0];
    } catch (error) {
      logger.error({ error, discussionId, agentType, round }, 'Failed to generate contribution');
      
      const fallbackResult = await this.pool.query(`
        INSERT INTO agent_contributions 
        (discussion_id, agent_type, contribution_type, content, reasoning, confidence, round)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        discussionId,
        agentType,
        'analysis',
        `Error generating contribution: ${error.message}`,
        'Fallback due to error',
        0.3,
        round
      ]);

      return fallbackResult.rows[0];
    }
  }

  buildSystemPrompt(agent) {
    return `You are an AI agent with the following characteristics:
Type: ${agent.type}
Personality Style: ${agent.personality.style}
Focus: ${agent.personality.focus}
Strength: ${agent.personality.strength}
Weakness: ${agent.personality.weakness}
Expertise: ${agent.expertise.join(', ')}

Your role is to contribute to collaborative problem-solving discussions. Stay true to your personality and expertise.
Provide your response in the following format:

TYPE: [solution|analysis|concern|question]
CONFIDENCE: [0.0-1.0]
CONTENT: [Your main contribution]
REASONING: [Why you think this is valuable]

Be concise, insightful, and constructive. Challenge ideas respectfully when needed.`;
  }

  buildPrompt(agent, discussion, previousContributions, previousInteractions, round) {
    let prompt = `Problem: ${discussion.problem_statement}\n\n`;
    
    if (discussion.context && Object.keys(discussion.context).length > 0) {
      prompt += `Context: ${JSON.stringify(discussion.context, null, 2)}\n\n`;
    }

    if (round > 1 && previousContributions.length > 0) {
      prompt += `Previous Round Contributions:\n`;
      for (const contrib of previousContributions.slice(-5)) {
        prompt += `- ${contrib.agent_type} (${contrib.contribution_type}, confidence: ${contrib.confidence}): ${contrib.content.substring(0, 150)}\n`;
      }
      prompt += '\n';
    }

    if (previousInteractions.length > 0) {
      prompt += `Interactions directed at you:\n`;
      for (const interaction of previousInteractions.slice(-3)) {
        prompt += `- ${interaction.from_agent} (${interaction.interaction_type}): ${interaction.content.substring(0, 100)}\n`;
      }
      prompt += '\n';
    }

    if (round === 1) {
      prompt += `This is Round 1. Provide your initial perspective on the problem based on your expertise.`;
    } else {
      prompt += `This is Round ${round}. Consider the previous contributions and provide your updated perspective. Address any interactions directed at you.`;
    }

    return prompt;
  }

  parseContribution(content, agentType, round) {
    const lines = content.split('\n');
    const contribution = {
      type: 'analysis',
      content: '',
      reasoning: '',
      confidence: 0.6
    };

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('TYPE:')) {
        const type = trimmed.substring(5).trim().toLowerCase();
        if (['solution', 'analysis', 'concern', 'question'].includes(type)) {
          contribution.type = type;
        }
      } else if (trimmed.startsWith('CONFIDENCE:')) {
        const conf = parseFloat(trimmed.substring(11).trim());
        if (!isNaN(conf) && conf >= 0 && conf <= 1) {
          contribution.confidence = conf;
        }
      } else if (trimmed.startsWith('CONTENT:')) {
        contribution.content = trimmed.substring(8).trim();
      } else if (trimmed.startsWith('REASONING:')) {
        contribution.reasoning = trimmed.substring(10).trim();
      } else if (contribution.content && !contribution.reasoning && !trimmed.startsWith('TYPE') && !trimmed.startsWith('CONFIDENCE')) {
        contribution.content += ' ' + trimmed;
      }
    }

    if (!contribution.content) {
      contribution.content = content.substring(0, 500);
      contribution.reasoning = `Generated by ${agentType} in round ${round}`;
    }

    return contribution;
  }

  async getPreviousContributions(discussionId, currentRound) {
    try {
      const result = await this.pool.query(`
        SELECT * FROM agent_contributions
        WHERE discussion_id = $1 AND round < $2
        ORDER BY round DESC, created_at DESC
        LIMIT 10
      `, [discussionId, currentRound]);

      return result.rows;
    } catch (error) {
      logger.error({ error, discussionId }, 'Failed to get previous contributions');
      return [];
    }
  }

  async getRelevantInteractions(discussionId, agentType) {
    try {
      const result = await this.pool.query(`
        SELECT * FROM agent_interactions
        WHERE discussion_id = $1 AND to_agent = $2
        ORDER BY created_at DESC
        LIMIT 5
      `, [discussionId, agentType]);

      return result.rows;
    } catch (error) {
      logger.error({ error, discussionId, agentType }, 'Failed to get relevant interactions');
      return [];
    }
  }

  async facilitateInteractions(discussionId, contributions, round) {
    try {
      const interactionProbability = 0.4;
      const interactions = [];

      for (const contribution of contributions) {
        if (Math.random() > interactionProbability) continue;

        const otherContributions = contributions.filter(c => c.agent_type !== contribution.agent_type);
        if (otherContributions.length === 0) continue;

        const target = otherContributions[Math.floor(Math.random() * otherContributions.length)];

        const interactionType = this.determineInteractionType(contribution, target);
        const interactionContent = await this.generateInteractionContent(
          contribution,
          target,
          interactionType
        );

        const result = await this.pool.query(`
          INSERT INTO agent_interactions 
          (discussion_id, from_agent, to_agent, interaction_type, target_contribution_id, content)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          discussionId,
          contribution.agent_type,
          target.agent_type,
          interactionType,
          target.id,
          interactionContent
        ]);

        interactions.push(result.rows[0]);

        if (interactionType === 'agreement') {
          await this.pool.query(`
            UPDATE agent_contributions
            SET votes_for = votes_for + 1
            WHERE id = $1
          `, [target.id]);
        } else if (interactionType === 'challenge') {
          await this.pool.query(`
            UPDATE agent_contributions
            SET votes_against = votes_against + 1
            WHERE id = $1
          `, [target.id]);
        }
      }

      logger.info({ discussionId, round, interactionCount: interactions.length }, 'Interactions facilitated');

      return interactions;
    } catch (error) {
      logger.error({ error, discussionId, round }, 'Failed to facilitate interactions');
      return [];
    }
  }

  determineInteractionType(fromContribution, toContribution) {
    const fromConf = parseFloat(fromContribution.confidence);
    const toConf = parseFloat(toContribution.confidence);

    if (fromContribution.contribution_type === 'concern' || toContribution.contribution_type === 'concern') {
      return 'challenge';
    }

    if (fromContribution.contribution_type === 'question') {
      return 'question';
    }

    const confDiff = Math.abs(fromConf - toConf);
    
    if (confDiff < 0.2) {
      return Math.random() < 0.7 ? 'agreement' : 'build_on';
    } else if (fromConf > toConf) {
      return Math.random() < 0.5 ? 'challenge' : 'question';
    } else {
      return Math.random() < 0.6 ? 'agreement' : 'build_on';
    }
  }

  async generateInteractionContent(fromContribution, toContribution, interactionType) {
    const templates = {
      agreement: [
        `I agree with your ${toContribution.contribution_type}. ${fromContribution.content.substring(0, 100)}`,
        `Building on your point, I think ${fromContribution.content.substring(0, 100)}`,
        `Your ${toContribution.contribution_type} aligns well with my analysis.`
      ],
      challenge: [
        `I have concerns about your approach. Consider: ${fromContribution.content.substring(0, 100)}`,
        `While I see your point, there might be issues with ${toContribution.content.substring(0, 50)}`,
        `I respectfully challenge this. ${fromContribution.content.substring(0, 100)}`
      ],
      build_on: [
        `Expanding on your idea: ${fromContribution.content.substring(0, 100)}`,
        `Your ${toContribution.contribution_type} could be enhanced by ${fromContribution.content.substring(0, 100)}`,
        `Let me add to that: ${fromContribution.content.substring(0, 100)}`
      ],
      question: [
        `How would you address: ${fromContribution.content.substring(0, 100)}?`,
        `Can you clarify how this handles ${fromContribution.content.substring(0, 50)}?`,
        `What about the case where ${fromContribution.content.substring(0, 100)}?`
      ]
    };

    const options = templates[interactionType] || templates.question;
    return options[Math.floor(Math.random() * options.length)];
  }
}

export default AgentProcessor;
