import pg from 'pg';

const { Pool } = pg;

class ProjectGraphService {
  constructor(roomId) {
    this.roomId = roomId;
    this.graph = new Map();
    this.dependencyCache = new Map();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async initialize() {
    await this.loadDependencies();
    return this;
  }

  async loadDependencies() {
    const result = await this.pool.query(
      'SELECT * FROM project_dependencies WHERE room_id = $1',
      [this.roomId]
    );

    // Build in-memory graph for fast traversal
    result.rows.forEach(dep => {
      const key = `${dep.source_type}:${dep.source_id}`;
      if (!this.graph.has(key)) {
        this.graph.set(key, []);
      }
      this.graph.get(key).push({
        target: `${dep.target_type}:${dep.target_id}`,
        type: dep.relationship_type,
        strength: dep.coupling_strength,
        metadata: dep.metadata
      });
    });
  }

  async trackDependency(sourceType, sourceId, targetType, targetId, relationshipType, metadata = {}) {
    const couplingStrength = this.calculateCouplingStrength(relationshipType, metadata);

    await this.pool.query(
      `INSERT INTO project_dependencies 
       (room_id, source_type, source_id, target_type, target_id, relationship_type, coupling_strength, metadata, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (room_id, source_type, source_id, target_type, target_id, relationship_type)
       DO UPDATE SET 
         coupling_strength = $7,
         metadata = $8,
         updated_at = NOW()`,
      [
        this.roomId,
        sourceType,
        sourceId,
        targetType,
        targetId,
        relationshipType,
        couplingStrength,
        JSON.stringify(metadata)
      ]
    );

    // Update in-memory graph
    const key = `${sourceType}:${sourceId}`;
    if (!this.graph.has(key)) {
      this.graph.set(key, []);
    }
    
    this.graph.set(key, this.graph.get(key).filter(d => 
      d.target !== `${targetType}:${targetId}`
    ));
    
    this.graph.get(key).push({
      target: `${targetType}:${targetId}`,
      type: relationshipType,
      strength: couplingStrength,
      metadata
    });
  }

  calculateCouplingStrength(relationshipType, metadata) {
    const baseStrengths = {
      'imports': 0.8,
      'calls': 0.9,
      'references': 0.7,
      'extends': 0.95,
      'implements': 0.9,
      'styles': 0.4,
      'depends_on': 0.6
    };

    let strength = baseStrengths[relationshipType] || 0.5;

    // Adjust based on metadata
    if (metadata.isCritical) strength += 0.2;
    if (metadata.frequency === 'high') strength += 0.1;
    if (metadata.isOptional) strength -= 0.3;

    return Math.max(0.1, Math.min(1.0, strength));
  }

  async findImpact(targetType, targetId, changeType = 'modification') {
    const targetKey = `${targetType}:${targetId}`;
    const visited = new Set();
    const impact = {
      direct_dependencies: [],
      transitive_dependencies: [],
      breaking_changes: [],
      suggestions: []
    };

    await this.traverseDependencies(targetKey, visited, impact, 0);

    // Analyze impact based on change type
    await this.analyzeBreakingChanges(impact, changeType, targetType, targetId);

    return impact;
  }

  async traverseDependencies(currentKey, visited, impact, depth) {
    if (visited.has(currentKey) || depth > 10) return;
    visited.add(currentKey);

    const dependencies = this.graph.get(currentKey) || [];

    for (const dep of dependencies) {
      if (depth === 0) {
        impact.direct_dependencies.push({
          ...dep,
          target: dep.target
        });
      } else {
        impact.transitive_dependencies.push({
          ...dep,
          target: dep.target,
          depth: depth
        });
      }

      // Recursive traversal
      await this.traverseDependencies(dep.target, visited, impact, depth + 1);
    }
  }

  async analyzeBreakingChanges(impact, changeType, targetType, targetId) {
    const breakingChangeRules = {
      'file': {
        'deletion': { severity: 9, message: 'File deletion will break imports' },
        'rename': { severity: 7, message: 'Renaming will break import paths' },
        'modification': { severity: 3, message: 'Modification may affect dependents' }
      },
      'api': {
        'deletion': { severity: 10, message: 'API endpoint deletion will break clients' },
        'modification': { severity: 6, message: 'API signature change may break clients' }
      },
      'data_model': {
        'modification': { severity: 8, message: 'Data model change may break queries and UI' },
        'deletion': { severity: 9, message: 'Field deletion will break dependent code' }
      }
    };

    const rule = breakingChangeRules[targetType]?.[changeType];
    if (rule) {
      impact.breaking_changes.push({
        ...rule,
        change_type: changeType,
        target: `${targetType}:${targetId}`
      });
    }

    // Generate suggestions based on impact analysis
    impact.suggestions = this.generateMigrationSuggestions(impact, changeType, targetType);
  }

  generateMigrationSuggestions(impact, changeType, targetType) {
    const suggestions = [];

    if (impact.direct_dependencies.length > 0) {
      suggestions.push({
        type: 'backward_compatibility',
        description: `Add backward compatibility layer for ${impact.direct_dependencies.length} direct dependents`,
        priority: 'high'
      });
    }

    if (impact.transitive_dependencies.length > 0) {
      suggestions.push({
        type: 'gradual_migration',
        description: `Plan gradual migration for ${impact.transitive_dependencies.length} transitive dependents`,
        priority: 'medium'
      });
    }

    if (changeType === 'deletion') {
      suggestions.push({
        type: 'deprecation_notice',
        description: 'Mark as deprecated before full removal',
        priority: 'high'
      });
    }

    return suggestions;
  }

  // Scan codebase to build dependency graph
  async scanCodebase(fileTree, fileContents) {
    for (const file of fileTree) {
      if (file.path.match(/\.(js|jsx|ts|tsx)$/)) {
        await this.analyzeFileDependencies(file.path, fileContents[file.path]);
      }
    }
  }

  async analyzeFileDependencies(filePath, content) {
    if (!content) return;

    // Simple regex-based dependency analysis
    const importRegex = /from\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\)/g;
    const apiCallRegex = /fetch\(\s*['"`]([^'"`]+)['"`]|axios\.(get|post|put|delete)\(\s*['"`]([^'"`]+)['"`]/g;
    
    let match;
    
    // Track imports
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1] || match[2];
      await this.trackDependency('file', filePath, 'file', importPath, 'imports', {
        line: this.getLineNumber(content, match.index),
        isInternal: importPath.startsWith('.')
      });
    }

    // Track API calls
    while ((match = apiCallRegex.exec(content)) !== null) {
      const apiPath = match[1] || match[3];
      await this.trackDependency('file', filePath, 'api', apiPath, 'calls', {
        line: this.getLineNumber(content, match.index),
        method: match[2]?.toUpperCase() || 'GET'
      });
    }
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  async close() {
    await this.pool.end();
  }
}

export default ProjectGraphService;
