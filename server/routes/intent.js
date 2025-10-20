import { Router } from 'express';
import ProjectGraphService from '../services/ProjectGraphService.js';
import IntentCaptureService from '../services/IntentCaptureService.js';

const router = Router();

// Capture user intent and analyze impact
router.post('/:room_id/captures', async (req, res) => {
  try {
    const { room_id } = req.params;
    const { action, context } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    // Initialize services
    const projectGraph = new ProjectGraphService(room_id);
    await projectGraph.initialize();

    const intentService = new IntentCaptureService(room_id, projectGraph);

    // Capture and analyze
    const result = await intentService.captureUserAction(action, context);

    // Cleanup
    await projectGraph.close();
    await intentService.close();

    res.json(result);
  } catch (error) {
    console.error('Failed to capture intent:', error);
    res.status(500).json({ error: 'Failed to capture intent', details: error.message });
  }
});

// Get recent intent captures for a room
router.get('/:room_id/captures', async (req, res) => {
  try {
    const { room_id } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const projectGraph = new ProjectGraphService(room_id);
    await projectGraph.initialize();

    const intentService = new IntentCaptureService(room_id, projectGraph);
    const captures = await intentService.getRecentCaptures(limit);

    await projectGraph.close();
    await intentService.close();

    res.json({ captures });
  } catch (error) {
    console.error('Failed to fetch intent captures:', error);
    res.status(500).json({ error: 'Failed to fetch intent captures' });
  }
});

// Get predictions for a specific intent
router.get('/:room_id/captures/:intent_id/predictions', async (req, res) => {
  try {
    const { room_id, intent_id } = req.params;

    const projectGraph = new ProjectGraphService(room_id);
    await projectGraph.initialize();

    const intentService = new IntentCaptureService(room_id, projectGraph);
    const predictions = await intentService.getPredictionsForIntent(intent_id);

    await projectGraph.close();
    await intentService.close();

    res.json({ predictions });
  } catch (error) {
    console.error('Failed to fetch predictions:', error);
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

// Analyze impact of a potential change (without capturing)
router.post('/:room_id/analyze-impact', async (req, res) => {
  try {
    const { room_id } = req.params;
    const { targetType, targetId, changeType } = req.body;

    if (!targetType || !targetId) {
      return res.status(400).json({ error: 'targetType and targetId are required' });
    }

    const projectGraph = new ProjectGraphService(room_id);
    await projectGraph.initialize();

    const impact = await projectGraph.findImpact(targetType, targetId, changeType || 'modification');

    await projectGraph.close();

    res.json({ impact });
  } catch (error) {
    console.error('Failed to analyze impact:', error);
    res.status(500).json({ error: 'Failed to analyze impact' });
  }
});

// Build dependency graph by scanning codebase
router.post('/:room_id/scan-codebase', async (req, res) => {
  try {
    const { room_id } = req.params;
    const { fileTree, fileContents } = req.body;

    if (!fileTree) {
      return res.status(400).json({ error: 'fileTree is required' });
    }

    const projectGraph = new ProjectGraphService(room_id);
    await projectGraph.initialize();

    await projectGraph.scanCodebase(fileTree, fileContents || {});

    await projectGraph.close();

    res.json({ success: true, message: 'Codebase scanned successfully' });
  } catch (error) {
    console.error('Failed to scan codebase:', error);
    res.status(500).json({ error: 'Failed to scan codebase' });
  }
});

// Track a single dependency
router.post('/:room_id/track-dependency', async (req, res) => {
  try {
    const { room_id } = req.params;
    const { sourceType, sourceId, targetType, targetId, relationshipType, metadata } = req.body;

    if (!sourceType || !sourceId || !targetType || !targetId || !relationshipType) {
      return res.status(400).json({ 
        error: 'sourceType, sourceId, targetType, targetId, and relationshipType are required' 
      });
    }

    const projectGraph = new ProjectGraphService(room_id);
    await projectGraph.initialize();

    await projectGraph.trackDependency(
      sourceType, 
      sourceId, 
      targetType, 
      targetId, 
      relationshipType, 
      metadata || {}
    );

    await projectGraph.close();

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to track dependency:', error);
    res.status(500).json({ error: 'Failed to track dependency' });
  }
});

export default router;
