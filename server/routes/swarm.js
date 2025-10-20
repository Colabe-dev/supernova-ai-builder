import { Router } from 'express';
import CollaborativeSwarmOrchestrator from '../services/CollaborativeSwarmOrchestrator.js';
import logger from '../utils/logger.js';

const router = Router();

router.post('/:room_id/discussions', async (req, res) => {
  try {
    const { room_id } = req.params;
    const { problemStatement, context } = req.body;

    if (!problemStatement) {
      return res.status(400).json({ error: 'Problem statement is required' });
    }

    const orchestrator = new CollaborativeSwarmOrchestrator();
    
    const discussion = await orchestrator.startDiscussion(room_id, problemStatement, context || {});
    
    await orchestrator.close();

    logger.info({ discussionId: discussion.id, roomId: room_id }, 'Discussion created via API');

    res.json(discussion);
  } catch (error) {
    logger.error({ error, roomId: req.params.room_id }, 'Failed to create discussion');
    res.status(500).json({ error: 'Failed to create discussion', details: error.message });
  }
});

router.post('/:room_id/discussions/:discussion_id/debate', async (req, res) => {
  try {
    const { room_id, discussion_id } = req.params;
    const { maxRounds } = req.body;

    const orchestrator = new CollaborativeSwarmOrchestrator();
    
    const consensus = await orchestrator.facilitateDebate(discussion_id, maxRounds || 3);
    
    await orchestrator.close();

    logger.info({ discussionId: discussion_id, roomId: room_id }, 'Debate facilitated via API');

    res.json(consensus);
  } catch (error) {
    logger.error({ error, discussionId: req.params.discussion_id }, 'Failed to facilitate debate');
    res.status(500).json({ error: 'Failed to facilitate debate', details: error.message });
  }
});

router.get('/:room_id/discussions', async (req, res) => {
  try {
    const { room_id } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const orchestrator = new CollaborativeSwarmOrchestrator();
    
    const discussions = await orchestrator.getDiscussionsByRoom(room_id, limit);
    
    await orchestrator.close();

    res.json(discussions);
  } catch (error) {
    logger.error({ error, roomId: req.params.room_id }, 'Failed to get discussions');
    res.status(500).json({ error: 'Failed to get discussions', details: error.message });
  }
});

router.get('/:room_id/discussions/:discussion_id', async (req, res) => {
  try {
    const { discussion_id } = req.params;

    const orchestrator = new CollaborativeSwarmOrchestrator();
    
    const discussion = await orchestrator.getDiscussion(discussion_id);
    
    await orchestrator.close();

    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }

    res.json(discussion);
  } catch (error) {
    logger.error({ error, discussionId: req.params.discussion_id }, 'Failed to get discussion');
    res.status(500).json({ error: 'Failed to get discussion', details: error.message });
  }
});

router.get('/:room_id/agents', async (req, res) => {
  try {
    const { room_id } = req.params;

    const orchestrator = new CollaborativeSwarmOrchestrator();
    
    const agentTypes = await orchestrator.ensureAgentsExist(room_id);
    const agentDefinitions = orchestrator.agentDefinitions;
    
    const agents = agentTypes.map(type => ({
      type,
      ...agentDefinitions[type]
    }));
    
    await orchestrator.close();

    res.json(agents);
  } catch (error) {
    logger.error({ error, roomId: req.params.room_id }, 'Failed to get agents');
    res.status(500).json({ error: 'Failed to get agents', details: error.message });
  }
});

export default router;
