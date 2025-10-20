import { Router } from 'express';
import ProjectGraphService from '../services/ProjectGraphService.js';
import IntentCaptureService from '../services/IntentCaptureService.js';
import SelfHealingOrchestrator from '../services/SelfHealingOrchestrator.js';
import IntentDebuggerService from '../services/IntentDebuggerService.js';

const router = Router();

// Initiate self-healing for a captured intent
router.post('/:room_id/heal/:intent_id', async (req, res) => {
  try {
    const { room_id, intent_id } = req.params;

    // Initialize services
    const projectGraph = new ProjectGraphService(room_id);
    await projectGraph.initialize();

    const intentService = new IntentCaptureService(room_id, projectGraph);
    const healingOrchestrator = new SelfHealingOrchestrator(room_id, projectGraph);

    // Get intent capture and predictions
    const intentCapture = await intentService.getIntentById(intent_id);
    if (!intentCapture) {
      await projectGraph.close();
      await intentService.close();
      await healingOrchestrator.close();
      return res.status(404).json({ error: 'Intent capture not found' });
    }

    const predictions = await intentService.getPredictionsForIntent(intent_id);
    const impactAnalysis = {
      predictions,
      overallRisk: predictions.reduce((max, p) => Math.max(max, p.severity), 0),
      directImpact: predictions.length
    };

    // Initiate healing
    const result = await healingOrchestrator.initiateHealing(intentCapture, impactAnalysis);

    // Cleanup
    await projectGraph.close();
    await intentService.close();
    await healingOrchestrator.close();

    res.json(result);
  } catch (error) {
    console.error('Failed to initiate healing:', error);
    res.status(500).json({ error: 'Failed to initiate healing' });
  }
});

// Get healing actions for a room
router.get('/:room_id/actions', async (req, res) => {
  try {
    const { room_id } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const projectGraph = new ProjectGraphService(room_id);
    await projectGraph.initialize();

    const healingOrchestrator = new SelfHealingOrchestrator(room_id, projectGraph);
    
    let query = `
      SELECT * FROM healing_actions
      WHERE room_id = $1
    `;
    const params = [room_id];
    
    if (status) {
      query += ` AND status = $2`;
      params.push(status);
      query += ` ORDER BY created_at DESC LIMIT $3`;
      params.push(limit);
    } else {
      query += ` ORDER BY created_at DESC LIMIT $2`;
      params.push(limit);
    }

    const result = await healingOrchestrator.pool.query(query, params);

    await projectGraph.close();
    await healingOrchestrator.close();

    res.json({ healing_actions: result.rows });
  } catch (error) {
    console.error('Failed to fetch healing actions:', error);
    res.status(500).json({ error: 'Failed to fetch healing actions' });
  }
});

// Get healing executions for a specific action
router.get('/:room_id/actions/:action_id/executions', async (req, res) => {
  try {
    const { room_id, action_id } = req.params;

    const projectGraph = new ProjectGraphService(room_id);
    await projectGraph.initialize();

    const healingOrchestrator = new SelfHealingOrchestrator(room_id, projectGraph);
    
    const result = await healingOrchestrator.pool.query(
      `SELECT * FROM healing_executions
       WHERE healing_action_id = $1
       ORDER BY step_number ASC`,
      [action_id]
    );

    await projectGraph.close();
    await healingOrchestrator.close();

    res.json({ executions: result.rows });
  } catch (error) {
    console.error('Failed to fetch healing executions:', error);
    res.status(500).json({ error: 'Failed to fetch healing executions' });
  }
});

// Start a debug session
router.post('/:room_id/debug/sessions', async (req, res) => {
  try {
    const { room_id } = req.params;
    const { trigger_action, user_intent, expected_behavior } = req.body;

    if (!trigger_action || !user_intent || !expected_behavior) {
      return res.status(400).json({ 
        error: 'trigger_action, user_intent, and expected_behavior are required' 
      });
    }

    const projectGraph = new ProjectGraphService(room_id);
    await projectGraph.initialize();

    const debuggerService = new IntentDebuggerService(room_id, projectGraph);
    const session = await debuggerService.startDebugSession(
      trigger_action,
      user_intent,
      expected_behavior
    );

    await projectGraph.close();
    await debuggerService.close();

    res.json({ session });
  } catch (error) {
    console.error('Failed to start debug session:', error);
    res.status(500).json({ error: 'Failed to start debug session' });
  }
});

// Analyze discrepancy for a debug session
router.post('/:room_id/debug/sessions/:session_id/analyze', async (req, res) => {
  try {
    const { room_id, session_id } = req.params;
    const { actual_behavior } = req.body;

    if (!actual_behavior) {
      return res.status(400).json({ error: 'actual_behavior is required' });
    }

    const projectGraph = new ProjectGraphService(room_id);
    await projectGraph.initialize();

    const debuggerService = new IntentDebuggerService(room_id, projectGraph);
    const analysis = await debuggerService.analyzeDiscrepancy(session_id, actual_behavior);

    await projectGraph.close();
    await debuggerService.close();

    res.json(analysis);
  } catch (error) {
    console.error('Failed to analyze discrepancy:', error);
    res.status(500).json({ error: 'Failed to analyze discrepancy' });
  }
});

// Apply a fix to a debug session
router.post('/:room_id/debug/sessions/:session_id/fix', async (req, res) => {
  try {
    const { room_id, session_id } = req.params;
    const { fix } = req.body;

    if (!fix) {
      return res.status(400).json({ error: 'fix is required' });
    }

    const projectGraph = new ProjectGraphService(room_id);
    await projectGraph.initialize();

    const debuggerService = new IntentDebuggerService(room_id, projectGraph);
    const result = await debuggerService.applyFix(session_id, fix);

    await projectGraph.close();
    await debuggerService.close();

    res.json({ result });
  } catch (error) {
    console.error('Failed to apply fix:', error);
    res.status(500).json({ error: 'Failed to apply fix' });
  }
});

// Resolve a debug session
router.post('/:room_id/debug/sessions/:session_id/resolve', async (req, res) => {
  try {
    const { room_id, session_id } = req.params;

    const projectGraph = new ProjectGraphService(room_id);
    await projectGraph.initialize();

    const debuggerService = new IntentDebuggerService(room_id, projectGraph);
    const result = await debuggerService.resolveSession(session_id);

    await projectGraph.close();
    await debuggerService.close();

    res.json(result);
  } catch (error) {
    console.error('Failed to resolve debug session:', error);
    res.status(500).json({ error: 'Failed to resolve debug session' });
  }
});

// Get debug sessions for a room
router.get('/:room_id/debug/sessions', async (req, res) => {
  try {
    const { room_id } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const projectGraph = new ProjectGraphService(room_id);
    await projectGraph.initialize();

    const debuggerService = new IntentDebuggerService(room_id, projectGraph);
    const sessions = await debuggerService.getDebugSessions(limit);

    await projectGraph.close();
    await debuggerService.close();

    res.json({ sessions });
  } catch (error) {
    console.error('Failed to fetch debug sessions:', error);
    res.status(500).json({ error: 'Failed to fetch debug sessions' });
  }
});

export default router;
