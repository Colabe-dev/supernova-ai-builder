import pg from 'pg';

const { Pool } = pg;

class IntentCaptureService {
  constructor(roomId, projectGraph) {
    this.roomId = roomId;
    this.projectGraph = projectGraph;
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async captureUserAction(action, context = {}) {
    const intent = this.extractIntent(action, context);
    
    const result = await this.pool.query(
      `INSERT INTO intent_captures (room_id, user_action, user_intent, context_before, context_after, confidence_score)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        this.roomId,
        action,
        intent.declaredIntent,
        JSON.stringify(context.before || {}),
        JSON.stringify(context.after || {}),
        intent.confidence
      ]
    );

    const intentCapture = result.rows[0];

    // Analyze impact of this action
    const impact = await this.analyzeActionImpact(action, intent, context, intentCapture.id);
    
    return {
      intentCapture,
      impactAnalysis: impact
    };
  }

  extractIntent(action, context) {
    // Simple NLP for intent extraction
    const actionLower = action.toLowerCase();
    
    const intentPatterns = {
      refactor: ['rename', 'refactor', 'restructure', 'clean up', 'improve'],
      feature: ['add', 'create', 'implement', 'new feature', 'build'],
      fix: ['fix', 'repair', 'solve', 'resolve', 'debug'],
      optimize: ['optimize', 'speed up', 'improve performance', 'make faster'],
      security: ['secure', 'protect', 'auth', 'login', 'password'],
      delete: ['delete', 'remove', 'drop'],
      update: ['update', 'modify', 'change', 'edit']
    };

    let declaredIntent = 'modification';
    let confidence = 0.7;

    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      if (patterns.some(pattern => actionLower.includes(pattern))) {
        declaredIntent = intent;
        confidence = 0.9;
        break;
      }
    }

    return { declaredIntent, confidence };
  }

  async analyzeActionImpact(action, intent, context, intentCaptureId) {
    // Parse action to understand what's being changed
    const changeTarget = this.parseChangeTarget(action, context);
    
    if (!changeTarget) {
      return { predictions: [], overallRisk: 0 };
    }

    const impact = await this.projectGraph.findImpact(
      changeTarget.type, 
      changeTarget.id, 
      this.mapIntentToChangeType(intent.declaredIntent)
    );

    // Store predictions
    const predictions = [];
    for (const breakingChange of impact.breaking_changes) {
      const result = await this.pool.query(
        `INSERT INTO impact_predictions 
         (room_id, intent_capture_id, prediction_type, description, severity, affected_components, auto_fix_suggestion, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          this.roomId,
          intentCaptureId,
          'breaking_change',
          breakingChange.message,
          breakingChange.severity,
          JSON.stringify(impact.direct_dependencies),
          JSON.stringify(impact.suggestions),
          0.85
        ]
      );
      predictions.push(result.rows[0]);
    }

    return {
      predictions,
      overallRisk: this.calculateOverallRisk(impact),
      suggestions: impact.suggestions,
      directImpact: impact.direct_dependencies.length,
      transitiveImpact: impact.transitive_dependencies.length
    };
  }

  parseChangeTarget(action, context) {
    // Extract what's being changed from the action
    const actionLower = action.toLowerCase();
    
    // File-based changes
    const fileMatch = action.match(/(?:file|component|module)\s+['"`]?([^'"`\s]+)['"`]?/i);
    if (fileMatch) {
      return { type: 'file', id: fileMatch[1] };
    }

    // API endpoint changes
    const apiMatch = action.match(/(?:api|endpoint|route)\s+['"`]?([^'"`\s]+)['"`]?/i);
    if (apiMatch) {
      return { type: 'api', id: apiMatch[1] };
    }

    // Data model changes
    const modelMatch = action.match(/(?:model|schema|table)\s+['"`]?([^'"`\s]+)['"`]?/i);
    if (modelMatch) {
      return { type: 'data_model', id: modelMatch[1] };
    }

    // Try to extract from context
    if (context.targetFile) {
      return { type: 'file', id: context.targetFile };
    }
    if (context.targetApi) {
      return { type: 'api', id: context.targetApi };
    }

    return null;
  }

  mapIntentToChangeType(intent) {
    const mapping = {
      'delete': 'deletion',
      'refactor': 'rename',
      'feature': 'modification',
      'fix': 'modification',
      'optimize': 'modification',
      'security': 'modification',
      'update': 'modification'
    };
    return mapping[intent] || 'modification';
  }

  calculateOverallRisk(impact) {
    let risk = 0;
    
    // Base risk on direct dependencies
    risk += impact.direct_dependencies.length * 10;
    
    // Add risk from transitive dependencies
    risk += impact.transitive_dependencies.length * 5;
    
    // Add risk from breaking changes
    impact.breaking_changes.forEach(bc => {
      risk += bc.severity * 5;
    });
    
    // Normalize to 0-100 scale
    return Math.min(100, risk);
  }

  async getRecentCaptures(limit = 20) {
    const result = await this.pool.query(
      `SELECT ic.*, 
              COUNT(ip.id) as prediction_count,
              AVG(ip.severity) as avg_severity
       FROM intent_captures ic
       LEFT JOIN impact_predictions ip ON ic.id = ip.intent_capture_id
       WHERE ic.room_id = $1
       GROUP BY ic.id
       ORDER BY ic.created_at DESC
       LIMIT $2`,
      [this.roomId, limit]
    );
    return result.rows;
  }

  async getPredictionsForIntent(intentCaptureId) {
    const result = await this.pool.query(
      `SELECT * FROM impact_predictions
       WHERE intent_capture_id = $1
       ORDER BY severity DESC`,
      [intentCaptureId]
    );
    return result.rows;
  }

  async close() {
    await this.pool.end();
  }
}

export default IntentCaptureService;
