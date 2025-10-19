import { spawn } from 'child_process';

interface TestResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

export async function tester({ cmd }: { cmd: string }): Promise<TestResult> {
  const allowed = new Set(['npm run build', 'npm run lint', 'npm test']);
  if (!allowed.has(cmd)) cmd = 'npm run build';

  return new Promise((resolve) => {
    const [bin, ...args] = cmd.split(' ');
    const child = spawn(bin, args, { cwd: process.cwd(), shell: false });
    
    let out = '';
    let err = '';
    
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    
    child.on('close', (code) => {
      resolve({ ok: code === 0, stdout: out, stderr: err });
    });
  });
}
