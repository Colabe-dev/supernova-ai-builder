import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const agentPrompts = {
  planner: `You are an AI software architect and planner. Given a project description, create a detailed plan including:
- Project structure and file organization
- Key features and components needed
- Technology stack recommendations
- Implementation phases
- Potential challenges and solutions

Provide a concise, actionable plan.`,

  implementer: `You are an AI code generator. Given a plan or feature description, generate production-ready code including:
- File structure with clear organization
- Well-commented, clean code
- Best practices and patterns
- Error handling
- Type safety

Focus on quality and maintainability.`,

  tester: `You are an AI testing specialist. Given code or a feature, create comprehensive tests including:
- Unit tests for core functionality
- Integration tests for key flows
- Edge cases and error scenarios
- Test coverage recommendations
- Testing best practices

Ensure robust test coverage.`,

  fixer: `You are an AI debugging specialist. Given an error or issue, provide:
- Root cause analysis
- Step-by-step fix instructions
- Code corrections
- Prevention strategies
- Best practices to avoid similar issues

Be thorough and precise.`,
};

export async function runAgent(
  agentType: "planner" | "implementer" | "tester" | "fixer",
  input: string,
  context?: string
): Promise<string> {
  const systemPrompt = agentPrompts[agentType];
  const userMessage = context ? `Context:\n${context}\n\nTask:\n${input}` : input;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  return completion.choices[0]?.message?.content || "No response generated";
}

export function generateMockCodeChanges(agentType: string, projectName: string) {
  return [
    {
      path: "src/app/page.tsx",
      status: "modified",
      before: `export default function Home() {
  return <div>Welcome</div>
}`,
      after: `export default function Home() {
  return (
    <div className="container mx-auto py-12">
      <h1 className="text-4xl font-bold">Welcome to ${projectName}</h1>
      <p className="mt-4 text-muted-foreground">
        Built with AI-powered agents
      </p>
    </div>
  )
}`,
    },
    {
      path: "src/components/Header.tsx",
      status: "added",
      before: null,
      after: `export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-xl font-semibold">${projectName}</h1>
      </div>
    </header>
  )
}`,
    },
  ];
}
