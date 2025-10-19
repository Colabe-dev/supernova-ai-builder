interface FixAction {
  kind: string;
  path: string;
  mutator?: (json: any) => any;
}

interface FixResult {
  actions: FixAction[];
}

export async function fixer({ stdout, stderr }: { stdout?: string; stderr?: string }): Promise<FixResult> {
  const actions: FixAction[] = [];
  const msg = (stderr || stdout || '').toLowerCase();

  if (msg.includes('cannot find module') && msg.includes('react-router-dom')) {
    actions.push({
      kind: 'edit',
      path: 'client/package.json',
      mutator: (json) => ({
        ...json,
        dependencies: { ...json.dependencies, 'react-router-dom': '^6.26.2' },
      }),
    });
  }

  if (msg.includes('cannot find module') && msg.includes('lucide-react')) {
    actions.push({
      kind: 'edit',
      path: 'client/package.json',
      mutator: (json) => ({
        ...json,
        dependencies: { ...json.dependencies, 'lucide-react': '^0.263.1' },
      }),
    });
  }

  // Add more heuristics as needed
  return { actions };
}
