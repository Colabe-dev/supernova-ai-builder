interface PlanChoice {
  id: string;
  label: string;
}

interface PlanAction {
  kind: string;
  path: string;
  content?: string;
  mutator?: (json: any) => any;
  auto?: boolean;
}

interface PlanResult {
  id: string;
  question: string;
  choices: PlanChoice[];
  actions: PlanAction[];
  test: string;
}

export async function planner(text: string): Promise<PlanResult> {
  const lower = (text || '').toLowerCase();
  const actions: PlanAction[] = [];

  // Simple intent detection (v1 heuristics - will be replaced with LLM)
  if (lower.includes('landing')) {
    actions.push({
      kind: 'edit',
      path: 'client/src/pages/Landing.tsx',
      content: `export default function Landing() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">Welcome to Supernova</h1>
      <p className="text-lg">Landing page scaffold created by AI.</p>
    </div>
  );
}
`,
    });
  }

  if (lower.includes('dark') || lower.includes('theme')) {
    actions.push({
      kind: 'edit',
      path: 'server/design.tokens.json',
      mutator: (json) => ({
        ...json,
        theme: { ...json.theme, bg: '#0b1f3a', text: '#ffffff', primary: '#fec72e' },
      }),
    });
  }

  if (lower.includes('button') || lower.includes('component')) {
    actions.push({
      kind: 'edit',
      path: 'client/src/components/CustomButton.tsx',
      content: `interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export default function CustomButton({ children, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-primary text-white rounded hover:opacity-90"
    >
      {children}
    </button>
  );
}
`,
    });
  }

  const choices: PlanChoice[] = [
    { id: 'make-landing', label: 'Create landing page scaffold' },
    { id: 'add-components', label: 'Add UI components' },
    { id: 'prepare-build', label: 'Build & preview app' },
  ];

  return {
    id: 'plan-' + Date.now(),
    question: 'What should I do first?',
    choices,
    actions,
    test: 'build',
  };
}
