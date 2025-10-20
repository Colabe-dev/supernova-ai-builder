import pg from 'pg';

const { Pool } = pg;

class IntentDebuggerService {
  constructor(roomId, projectGraph) {
    this.roomId = roomId;
    this.projectGraph = projectGraph;
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async startDebugSession(triggerAction, userIntent, expectedBehavior) {
    const result = await this.pool.query(
      `INSERT INTO intent_debugger_sessions 
       (room_id, trigger_action, user_intent, expected_behavior, actual_behavior, discrepancies, fixes_applied)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        this.roomId,
        triggerAction,
        userIntent,
        JSON.stringify(expectedBehavior),
        JSON.stringify({}),
        JSON.stringify([]),
        JSON.stringify([])
      ]
    );

    return result.rows[0];
  }

  async analyzeDiscrepancy(sessionId, actualBehavior) {
    const sessionResult = await this.pool.query(
      'SELECT * FROM intent_debugger_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error(`Debug session ${sessionId} not found`);
    }

    const session = sessionResult.rows[0];
    const expectedBehavior = session.expected_behavior;
    const discrepancies = this.findDiscrepancies(expectedBehavior, actualBehavior);
    
    await this.pool.query(
      `UPDATE intent_debugger_sessions 
       SET actual_behavior = $1, discrepancies = $2
       WHERE id = $3`,
      [JSON.stringify(actualBehavior), JSON.stringify(discrepancies), sessionId]
    );

    const fixes = await this.generateFixes(discrepancies, session);
    
    return {
      session_id: sessionId,
      discrepancies: discrepancies,
      suggested_fixes: fixes
    };
  }

  findDiscrepancies(expected, actual) {
    const discrepancies = [];

    if (expected.execution_path && actual.execution_path) {
      const pathDiff = this.compareExecutionPaths(expected.execution_path, actual.execution_path);
      if (pathDiff.length > 0) {
        discrepancies.push({
          type: 'execution_path_mismatch',
          expected: expected.execution_path,
          actual: actual.execution_path,
          differences: pathDiff
        });
      }
    }

    if (expected.outcome && actual.outcome) {
      const outcomeDiff = this.compareOutcomes(expected.outcome, actual.outcome);
      if (outcomeDiff.length > 0) {
        discrepancies.push({
          type: 'outcome_mismatch',
          expected: expected.outcome,
          actual: actual.outcome,
          differences: outcomeDiff
        });
      }
    }

    if (expected.performance && actual.performance) {
      const perfDiff = this.comparePerformance(expected.performance, actual.performance);
      if (perfDiff.length > 0) {
        discrepancies.push({
          type: 'performance_issue',
          expected: expected.performance,
          actual: actual.performance,
          differences: perfDiff
        });
      }
    }

    return discrepancies;
  }

  compareExecutionPaths(expected, actual) {
    const differences = [];
    
    if (expected.length !== actual.length) {
      differences.push(`Expected ${expected.length} steps, got ${actual.length}`);
    }

    for (let i = 0; i < Math.min(expected.length, actual.length); i++) {
      if (expected[i] !== actual[i]) {
        differences.push(`Step ${i + 1}: expected "${expected[i]}" but got "${actual[i]}"`);
      }
    }

    return differences;
  }

  compareOutcomes(expected, actual) {
    const differences = [];
    
    if (expected.status !== actual.status) {
      differences.push(`Status: expected "${expected.status}" but got "${actual.status}"`);
    }

    if (expected.data && actual.data) {
      const dataDiff = this.deepCompare(expected.data, actual.data);
      if (dataDiff.length > 0) {
        differences.push(...dataDiff);
      }
    }

    return differences;
  }

  comparePerformance(expected, actual) {
    const differences = [];
    const thresholds = {
      response_time: 1.5,
      memory_usage: 1.3
    };

    if (actual.response_time > expected.response_time * thresholds.response_time) {
      differences.push(`Slow response: ${actual.response_time}ms vs expected ${expected.response_time}ms`);
    }

    if (actual.memory_usage > expected.memory_usage * thresholds.memory_usage) {
      differences.push(`High memory: ${actual.memory_usage}MB vs expected ${expected.memory_usage}MB`);
    }

    return differences;
  }

  deepCompare(expected, actual, path = '') {
    const differences = [];
    
    if (typeof expected !== typeof actual) {
      differences.push(`${path}: type mismatch (expected ${typeof expected}, got ${typeof actual})`);
      return differences;
    }

    if (typeof expected === 'object' && expected !== null && actual !== null) {
      const expectedKeys = Object.keys(expected);
      const actualKeys = Object.keys(actual);

      for (const key of expectedKeys) {
        if (!actualKeys.includes(key)) {
          differences.push(`${path}${path ? '.' : ''}${key}: missing in actual result`);
        } else {
          const nestedDiff = this.deepCompare(
            expected[key],
            actual[key],
            `${path}${path ? '.' : ''}${key}`
          );
          differences.push(...nestedDiff);
        }
      }

      for (const key of actualKeys) {
        if (!expectedKeys.includes(key)) {
          differences.push(`${path}${path ? '.' : ''}${key}: unexpected in actual result`);
        }
      }
    } else if (expected !== actual) {
      differences.push(`${path}: expected ${expected} but got ${actual}`);
    }

    return differences;
  }

  async generateFixes(discrepancies, session) {
    const fixes = [];

    for (const discrepancy of discrepancies) {
      switch (discrepancy.type) {
        case 'execution_path_mismatch':
          fixes.push({
            type: 'execution_flow_correction',
            description: 'Correct execution path to match intent',
            severity: 'high',
            steps: [
              'Review execution flow logic',
              'Add missing conditional branches',
              'Verify intent triggers correct path'
            ]
          });
          break;

        case 'outcome_mismatch':
          fixes.push({
            type: 'outcome_correction',
            description: 'Fix output to match expected result',
            severity: 'high',
            steps: [
              'Review data transformation logic',
              'Verify return values',
              'Add validation checks'
            ]
          });
          break;

        case 'performance_issue':
          fixes.push({
            type: 'performance_optimization',
            description: 'Optimize to meet performance targets',
            severity: 'medium',
            steps: [
              'Profile slow operations',
              'Add caching where appropriate',
              'Optimize database queries'
            ]
          });
          break;
      }
    }

    return fixes;
  }

  async applyFix(sessionId, fix) {
    const result = await this.pool.query(
      `UPDATE intent_debugger_sessions 
       SET fixes_applied = fixes_applied || $1::jsonb
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify([fix]), sessionId]
    );

    return result.rows[0];
  }

  async resolveSession(sessionId) {
    await this.pool.query(
      `UPDATE intent_debugger_sessions 
       SET resolved_at = NOW()
       WHERE id = $1`,
      [sessionId]
    );

    return { session_id: sessionId, status: 'resolved' };
  }

  async getDebugSessions(limit = 10) {
    const result = await this.pool.query(
      `SELECT * FROM intent_debugger_sessions
       WHERE room_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [this.roomId, limit]
    );

    return result.rows;
  }

  async close() {
    await this.pool.end();
  }
}

export default IntentDebuggerService;
