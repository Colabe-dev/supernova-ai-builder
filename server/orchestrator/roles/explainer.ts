interface ExplanationResult {
  text: string;
  steps: string[];
}

export async function explainer({ stdout, stderr }: { stdout?: string; stderr?: string }): Promise<ExplanationResult> {
  const raw = (stderr || stdout || '').slice(-4000);
  const steps: string[] = [];

  if (/Cannot find module/i.test(raw)) {
    steps.push('Install missing dep: verify package.json and run npm i.');
  }
  if (/SyntaxError/i.test(raw)) {
    steps.push('Open the file and fix the highlighted syntax token.');
  }
  if (/TypeError/i.test(raw)) {
    steps.push('Check the variable/function is defined and imported.');
  }
  if (/ENOENT/i.test(raw)) {
    steps.push('File or directory not found. Check paths in your code.');
  }

  return {
    text: "Here's what went wrong and how to fix it:",
    steps: steps.length
      ? steps
      : ['Open the diff, accept the patch, then re-run build.'],
  };
}
