import { Router } from 'express';
import pg from 'pg';

const { Pool } = pg;
const router = Router();

// Native Postgres pool for database operations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get or initialize LPM for a room
router.get('/:room_id/lpm', async (req, res) => {
  try {
    const { room_id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM living_project_models WHERE room_id = $1',
      [room_id]
    );

    if (result.rows.length === 0) {
      // Create initial LPM
      const initialLPM = {
        tech_stack: ['react', 'node', 'postgres'],
        data_models: {},
        user_flows: {},
        business_rules: {},
        ui_components: {},
        architecture: {}
      };

      const insertResult = await pool.query(
        `INSERT INTO living_project_models (room_id, project_model) 
         VALUES ($1, $2) 
         RETURNING *`,
        [room_id, JSON.stringify(initialLPM)]
      );

      return res.json({ lpm: insertResult.rows[0] });
    }

    res.json({ lpm: result.rows[0] });
  } catch (error) {
    console.error('Failed to get LPM:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update LPM
router.put('/:room_id/lpm', async (req, res) => {
  try {
    const { room_id } = req.params;
    const { project_model } = req.body;

    const result = await pool.query(
      `UPDATE living_project_models 
       SET project_model = $1, 
           updated_at = NOW(),
           version = version + 1
       WHERE room_id = $2
       RETURNING *`,
      [JSON.stringify(project_model), room_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'LPM not found for this room' });
    }

    res.json({ lpm: result.rows[0] });
  } catch (error) {
    console.error('Failed to update LPM:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze feature impact
router.post('/:room_id/analyze-feature', async (req, res) => {
  try {
    const { room_id } = req.params;
    const { feature_description } = req.body;

    // Get current LPM
    const lpmResult = await pool.query(
      'SELECT project_model FROM living_project_models WHERE room_id = $1',
      [room_id]
    );

    if (lpmResult.rows.length === 0) {
      return res.status(404).json({ error: 'LPM not found for this room. Initialize LPM first.' });
    }

    // Simple impact analysis based on current project model
    const impact = analyzeFeatureImpact(feature_description, lpmResult.rows[0].project_model);
    
    // Log this decision
    await pool.query(
      `INSERT INTO project_decisions (room_id, decision_type, description, rationale, impact_analysis)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        room_id,
        'feature_analysis',
        `Analyzed feature: ${feature_description}`,
        impact.summary,
        JSON.stringify(impact)
      ]
    );

    res.json({ impact });
  } catch (error) {
    console.error('Failed to analyze feature:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get consistency report
router.get('/:room_id/consistency-report', async (req, res) => {
  try {
    const { room_id } = req.params;
    
    // Get LPM to ensure room exists
    const lpmResult = await pool.query(
      'SELECT id FROM living_project_models WHERE room_id = $1',
      [room_id]
    );

    if (lpmResult.rows.length === 0) {
      return res.status(404).json({ error: 'LPM not found for this room. Initialize LPM first.' });
    }

    // In a real implementation, you'd analyze current files against LPM
    // For now, returning a mock consistency report
    const report = {
      score: 85,
      issues: [
        { type: 'design_tokens', message: '3 components not using design tokens', severity: 'medium' },
        { type: 'error_handling', message: 'New API route missing error handling', severity: 'low' }
      ],
      suggestions: [
        'Standardize button components across pages',
        'Add input validation to user registration endpoints',
        'Implement consistent error boundary patterns'
      ],
      generated_at: new Date().toISOString()
    };

    res.json({ report });
  } catch (error) {
    console.error('Failed to generate consistency report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Architecture advice command
router.post('/:room_id/advise', async (req, res) => {
  try {
    const { room_id } = req.params;
    const { feature, context } = req.body;

    if (!feature) {
      return res.status(400).json({ error: 'Feature description is required' });
    }

    const advice = generateArchitectureAdvice(feature, context || {});
    
    // Log this as an architecture decision
    await pool.query(
      `INSERT INTO project_decisions (room_id, decision_type, description, rationale, impact_analysis)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        room_id,
        'architecture_advice',
        `Architecture advice requested for: ${feature}`,
        advice.estimated_complexity,
        JSON.stringify(advice)
      ]
    );

    res.json({ advice });
  } catch (error) {
    console.error('Failed to generate architecture advice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get decision history for a room
router.get('/:room_id/decisions', async (req, res) => {
  try {
    const { room_id } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const result = await pool.query(
      `SELECT * FROM project_decisions 
       WHERE room_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [room_id, limit]
    );

    res.json({ decisions: result.rows });
  } catch (error) {
    console.error('Failed to fetch decisions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
function analyzeFeatureImpact(feature, projectModel) {
  const impacts = [];
  const featureLower = feature.toLowerCase();
  
  if (featureLower.includes('user') || featureLower.includes('auth')) {
    impacts.push('Will affect user data model and authentication flow');
  }
  
  if (featureLower.includes('payment') || featureLower.includes('subscription')) {
    impacts.push('Requires payment service integration and secure endpoints');
  }
  
  if (featureLower.includes('real-time') || featureLower.includes('chat')) {
    impacts.push('Needs WebSocket integration and real-time data handling');
  }

  if (featureLower.includes('api') || featureLower.includes('endpoint')) {
    impacts.push('New API endpoints require security middleware and rate limiting');
  }

  if (featureLower.includes('database') || featureLower.includes('data')) {
    impacts.push('Database schema changes - consider migrations and backward compatibility');
  }

  const componentCount = Math.max(1, impacts.length * 2);
  const apiCount = Math.ceil(impacts.length / 2);

  return {
    summary: impacts.length > 0 
      ? `This feature affects ${impacts.length} major area${impacts.length > 1 ? 's' : ''}` 
      : 'This appears to be a minor feature with limited impact',
    components_affected: componentCount,
    data_changes: impacts.length,
    api_endpoints: apiCount,
    considerations: impacts.length > 0 
      ? impacts 
      : ['Feature scope is unclear - provide more details for better analysis'],
    estimated_effort: impacts.length <= 1 ? 'Small (1-2 days)' : 
                      impacts.length <= 3 ? 'Medium (3-5 days)' : 
                      'Large (1-2 weeks)'
  };
}

function generateArchitectureAdvice(feature, context) {
  const featureLower = feature.toLowerCase();
  
  const adviceTemplates = {
    'authentication': {
      stack: 'Supabase Auth + JWT + Express middleware',
      steps: [
        'Create users table with profiles in Postgres',
        'Implement auth middleware for protected API routes',
        'Add protected route components with auth guards',
        'Set up email templates for auth flows (signup, reset)',
        'Implement token refresh and session management'
      ],
      estimated_complexity: 'Medium (2-3 days)',
      security_notes: [
        'Use bcrypt for password hashing',
        'Implement rate limiting on auth endpoints',
        'Add CSRF protection for sensitive operations'
      ]
    },
    'crud': {
      stack: 'React + TanStack Query + Express + Postgres',
      steps: [
        'Define data model schema in shared/schema.ts',
        'Create API endpoints (GET, POST, PUT, DELETE) with validation',
        'Build React components with state management via TanStack Query',
        'Add error handling and loading states to UI',
        'Implement optimistic updates for better UX'
      ],
      estimated_complexity: 'Low (1-2 days)',
      best_practices: [
        'Use Zod for request validation',
        'Implement proper error responses (4xx, 5xx)',
        'Add data-testid attributes for testing'
      ]
    },
    'real-time': {
      stack: 'WebSockets (ws) + Supabase Realtime',
      steps: [
        'Set up WebSocket server integration',
        'Create real-time subscription hooks on frontend',
        'Implement optimistic UI updates for instant feedback',
        'Add connection state handling (connecting, connected, disconnected)',
        'Handle reconnection logic and message queuing'
      ],
      estimated_complexity: 'High (3-5 days)',
      considerations: [
        'Plan for scaling WebSocket connections',
        'Implement message rate limiting',
        'Consider using Redis for pub/sub in production'
      ]
    },
    'payment': {
      stack: 'Stripe + Collab Pay integration',
      steps: [
        'Set up Stripe integration with secure webhook handling',
        'Create payment endpoints with idempotency keys',
        'Implement entitlements system for purchased features',
        'Add payment UI components with error handling',
        'Set up subscription management and billing portal'
      ],
      estimated_complexity: 'High (5-7 days)',
      security_notes: [
        'Never store card details - use Stripe tokens',
        'Verify webhook signatures',
        'Implement proper refund and dispute handling'
      ]
    },
    'api': {
      stack: 'Express + Zod + Rate Limiting',
      steps: [
        'Define API route structure and versioning strategy',
        'Implement request validation with Zod schemas',
        'Add rate limiting and security middleware (Helmet)',
        'Create comprehensive error handling',
        'Document API endpoints with examples'
      ],
      estimated_complexity: 'Medium (2-4 days)',
      best_practices: [
        'Use consistent response formats',
        'Implement proper HTTP status codes',
        'Add request logging with Pino'
      ]
    }
  };

  // Pattern matching to find best template
  for (const [pattern, template] of Object.entries(adviceTemplates)) {
    if (featureLower.includes(pattern)) {
      return template;
    }
  }

  // Default advice for unknown features
  return {
    stack: 'React + Node + Postgres',
    steps: [
      'Analyze requirements and define clear scope',
      'Design data model and API contract',
      'Implement backend with proper validation',
      'Build frontend components with state management',
      'Add comprehensive error handling and testing'
    ],
    estimated_complexity: 'Unknown - needs more context',
    recommendations: [
      'Break down the feature into smaller, testable components',
      'Follow existing code patterns in the project',
      'Consult the Living Project Model for consistency'
    ]
  };
}

export default router;
