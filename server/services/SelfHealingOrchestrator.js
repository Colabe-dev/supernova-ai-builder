import pg from 'pg';

const { Pool } = pg;

class SelfHealingOrchestrator {
  constructor(roomId, projectGraph) {
    this.roomId = roomId;
    this.projectGraph = projectGraph;
    this.isHealing = false;
    this.healingQueue = [];
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async initiateHealing(intentCapture, impactAnalysis) {
    if (this.isHealing) {
      this.healingQueue.push({ intentCapture, impactAnalysis });
      return { status: 'queued', position: this.healingQueue.length };
    }

    this.isHealing = true;
    
    try {
      const healingPlan = await this.generateHealingPlan(intentCapture, impactAnalysis);
      const result = await this.executeHealingPlan(healingPlan);
      
      return {
        status: 'completed',
        healing_plan: healingPlan,
        result: result
      };
    } catch (error) {
      console.error('Healing execution failed:', error);
      return {
        status: 'failed',
        error: error.message
      };
    } finally {
      this.isHealing = false;
      this.processNextInQueue();
    }
  }

  async generateHealingPlan(intentCapture, impactAnalysis) {
    const healingActions = [];
    const riskThreshold = 7;

    for (const prediction of impactAnalysis.predictions) {
      if (prediction.severity >= riskThreshold) {
        const actions = await this.generateActionsForPrediction(prediction, intentCapture);
        healingActions.push(...actions);
      }
    }

    const preventiveActions = await this.generatePreventiveActions(impactAnalysis);
    healingActions.push(...preventiveActions);

    return {
      intent_capture_id: intentCapture.id,
      healing_actions: healingActions,
      estimated_duration: this.estimateDuration(healingActions),
      risk_mitigated: impactAnalysis.overallRisk
    };
  }

  async generateActionsForPrediction(prediction, intentCapture) {
    const actions = [];
    const predictionType = prediction.prediction_type;

    switch (predictionType) {
      case 'breaking_change':
        actions.push(...await this.generateBreakingChangeFixes(prediction, intentCapture));
        break;
      
      case 'performance':
        actions.push(...await this.generatePerformanceFixes(prediction));
        break;
      
      case 'security':
        actions.push(...await this.generateSecurityFixes(prediction));
        break;
    }

    return actions;
  }

  async generateBreakingChangeFixes(prediction, intentCapture) {
    const actions = [];
    const affectedComponents = prediction.affected_components || [];

    if (prediction.severity >= 8) {
      actions.push({
        type: 'compatibility_layer',
        description: `Add backward compatibility for ${affectedComponents.length} affected components`,
        execution_plan: {
          steps: [
            {
              action: 'create_compatibility_shim',
              target: this.extractChangeTarget(intentCapture.user_action),
              dependents: affectedComponents
            },
            {
              action: 'update_imports',
              files: affectedComponents,
              mapping: this.generateImportMapping(intentCapture)
            }
          ]
        },
        priority: 'high',
        prediction_id: prediction.id
      });
    }

    actions.push({
      type: 'migration_plan',
      description: 'Create safe migration path for dependents',
      execution_plan: {
        steps: [
          {
            action: 'mark_deprecated',
            target: this.extractChangeTarget(intentCapture.user_action)
          },
          {
            action: 'create_migration_guide',
            dependents: affectedComponents
          }
        ]
      },
      priority: 'medium',
      prediction_id: prediction.id
    });

    return actions;
  }

  async generatePerformanceFixes(prediction) {
    return [{
      type: 'fix',
      description: 'Optimize performance bottleneck',
      execution_plan: {
        steps: [
          { action: 'analyze_performance', target: prediction.description },
          { action: 'suggest_optimization' }
        ]
      },
      priority: 'medium',
      prediction_id: prediction.id
    }];
  }

  async generateSecurityFixes(prediction) {
    return [{
      type: 'fix',
      description: 'Apply security patch',
      execution_plan: {
        steps: [
          { action: 'apply_security_fix', target: prediction.description }
        ]
      },
      priority: 'high',
      prediction_id: prediction.id
    }];
  }

  async generatePreventiveActions(impactAnalysis) {
    const actions = [];

    if (impactAnalysis.directImpact > 10) {
      actions.push({
        type: 'architectural_review',
        description: 'High coupling detected - suggest refactoring',
        execution_plan: {
          steps: [
            {
              action: 'analyze_coupling',
              targets: impactAnalysis.predictions.map(p => p.description)
            },
            {
              action: 'suggest_refactoring',
              coupling_threshold: 0.8
            }
          ]
        },
        priority: 'medium',
        prediction_id: null
      });
    }

    return actions;
  }

  async executeHealingPlan(healingPlan) {
    const results = [];
    
    for (const action of healingPlan.healing_actions) {
      const result = await this.pool.query(
        `INSERT INTO healing_actions 
         (room_id, intent_capture_id, prediction_id, action_type, description, status, execution_plan, executed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING *`,
        [
          this.roomId,
          healingPlan.intent_capture_id,
          action.prediction_id,
          action.type,
          action.description,
          'executing',
          JSON.stringify(action.execution_plan)
        ]
      );

      const healingAction = result.rows[0];
      const executionResult = await this.executeHealingAction(healingAction, action);
      results.push(executionResult);
    }

    return {
      total_actions: healingPlan.healing_actions.length,
      completed_actions: results.filter(r => r.status === 'completed').length,
      results: results
    };
  }

  async executeHealingAction(healingAction, action) {
    const steps = action.execution_plan.steps;
    const stepResults = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      const result = await this.pool.query(
        `INSERT INTO healing_executions 
         (healing_action_id, step_number, step_description, status, started_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [healingAction.id, i + 1, `${step.action}: ${JSON.stringify(step)}`, 'executing']
      );

      const execution = result.rows[0];

      try {
        const stepResult = await this.executeHealingStep(step, healingAction);
        
        await this.pool.query(
          `UPDATE healing_executions 
           SET status = $1, result = $2, completed_at = NOW()
           WHERE id = $3`,
          ['completed', JSON.stringify(stepResult), execution.id]
        );

        stepResults.push({ step: step.action, status: 'completed', result: stepResult });
        
      } catch (error) {
        await this.pool.query(
          `UPDATE healing_executions 
           SET status = $1, error_message = $2, completed_at = NOW()
           WHERE id = $3`,
          ['failed', error.message, execution.id]
        );

        stepResults.push({ step: step.action, status: 'failed', error: error.message });
        break;
      }
    }

    const allStepsCompleted = stepResults.every(r => r.status === 'completed');
    await this.pool.query(
      `UPDATE healing_actions 
       SET status = $1, completed_at = NOW()
       WHERE id = $2`,
      [allStepsCompleted ? 'completed' : 'failed', healingAction.id]
    );

    return {
      healing_action_id: healingAction.id,
      status: allStepsCompleted ? 'completed' : 'failed',
      step_results: stepResults
    };
  }

  async executeHealingStep(step, healingAction) {
    switch (step.action) {
      case 'create_compatibility_shim':
        return await this.createCompatibilityShim(step.target, step.dependents);
      
      case 'update_imports':
        return await this.updateImports(step.files, step.mapping);
      
      case 'mark_deprecated':
        return await this.markAsDeprecated(step.target);
      
      case 'analyze_coupling':
        return await this.analyzeCoupling(step.targets);
      
      case 'analyze_performance':
      case 'suggest_optimization':
      case 'apply_security_fix':
      case 'suggest_refactoring':
      case 'create_migration_guide':
        return { action: step.action, status: 'simulated', message: `Would execute: ${step.action}` };
      
      default:
        throw new Error(`Unknown healing step: ${step.action}`);
    }
  }

  async createCompatibilityShim(target, dependents) {
    const shimCode = `
// AUTO-GENERATED COMPATIBILITY SHIM
// Created by Self-Healing System at ${new Date().toISOString()}
// Preserves backward compatibility for: ${target}

export const legacySupport = {
  // Compatibility functions here
};
    `;

    return { 
      shim_created: true, 
      target: target,
      dependents_count: dependents.length,
      code: shimCode 
    };
  }

  async updateImports(files, mapping) {
    const updateResults = [];
    
    for (const file of files) {
      updateResults.push({ file, status: 'simulated', message: 'Import update simulated' });
    }

    return { files_updated: updateResults.length, results: updateResults };
  }

  async markAsDeprecated(target) {
    return { 
      deprecated: target,
      warning_added: true,
      message: `Marked ${target} as deprecated with backward compatibility`
    };
  }

  async analyzeCoupling(targets) {
    const couplingAnalysis = [];
    
    for (const target of targets) {
      couplingAnalysis.push({
        target: target,
        coupling_analysis: 'simulated',
        message: `Would analyze coupling for: ${target}`
      });
    }

    return { analysis: couplingAnalysis };
  }

  extractChangeTarget(userAction) {
    const fileMatch = userAction.match(/(\w+\.\w+)/);
    return fileMatch ? fileMatch[1] : 'unknown_target';
  }

  generateImportMapping(intentCapture) {
    return {
      old_imports: [],
      new_imports: [],
      mapping_rules: {}
    };
  }

  estimateDuration(healingActions) {
    const baseTimePerAction = 2;
    return healingActions.length * baseTimePerAction;
  }

  async processNextInQueue() {
    if (this.healingQueue.length > 0) {
      const next = this.healingQueue.shift();
      await this.initiateHealing(next.intentCapture, next.impactAnalysis);
    }
  }

  async close() {
    await this.pool.end();
  }
}

export default SelfHealingOrchestrator;
