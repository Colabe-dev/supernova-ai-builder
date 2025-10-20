import { planner } from './planner';
import { builder } from './roles/builder';
import { tester } from './roles/tester';
import { explainer } from './roles/explainer';
import { fixer } from './roles/fixer';
import { plannerV2 } from './llm/plannerV2.js';
import { explainerV2 } from './llm/explainerV2.js';
import { fixerV2 } from './llm/fixerV2.js';

interface Session {
  autonomy: boolean;
  llm: boolean;
  model?: string;
  history: Array<{ role: string; text: string }>;
}

const sessions = new Map<string, Session>();

interface OrchestrateParams {
  msg: any;
  sessionId: string;
  send: (msg: any) => void;
}

function actTestCmd(kind: string): string {
  if (kind === 'lint') return 'npm run lint';
  if (kind === 'test') return 'npm test';
  return 'npm run build';
}

export async function orchestrate({ msg, sessionId, send }: OrchestrateParams) {
  const s = sessions.get(sessionId) || { autonomy: false, llm: false, history: [] };
  sessions.set(sessionId, s);

  if (msg.type === 'user') {
    if (typeof msg.autonomy === 'boolean') s.autonomy = msg.autonomy;
    if (typeof msg.llm === 'boolean') s.llm = msg.llm;
    if (msg.model) s.model = msg.model;
    s.history.push({ role: 'user', text: msg.text });
    send({ type: 'progress', stage: 'understanding' });

    // 1) Plan + (optional) quick-choices
    // Use LLM v2 if enabled globally or per-session
    const useLLM = process.env.LLM_PLANNER_V2 === 'true' || s.llm;
    const plan = useLLM
      ? await plannerV2(msg.text).catch((err: any) => {
          console.error('[LLM Planner v2] Error:', err.message);
          send({ type: 'agent_message', agent: 'System', text: 'LLM unavailable, using fallback planner' });
          return planner(msg.text);
        })
      : await planner(msg.text);
    if (plan.choices?.length) {
      send({
        type: 'question',
        id: plan.id,
        text: plan.question,
        choices: plan.choices,
      });
    }

    // 2) Execute naive loop: build -> test -> explain/fix if needed
    if (plan.actions?.length) {
      for (const act of plan.actions) {
        if (act.kind === 'edit') {
          const preview = await builder(act);
          send({
            type: 'patch_preview',
            patchId: preview.id,
            path: act.path,
            diff: preview.diff,
          });

          if (s.autonomy || act.auto) {
            const applied = await builder({ ...act, apply: true, previous: preview.base });
            send({
              type: 'patch_applied',
              patchId: preview.id,
              path: act.path,
              ok: applied.ok,
            });
          } else {
            send({
              type: 'agent_message',
              agent: 'Builder',
              text: 'Proposed change ready. Approve to apply.',
            });
          }
        }
      }

      // Test pass
      const t = await tester({ cmd: actTestCmd(plan.test || 'build') });
      send({
        type: 'tool_result',
        tool: 'terminal',
        ok: t.ok,
        stdout: t.stdout,
        stderr: t.stderr,
      });

      if (!t.ok) {
        const useLLM = process.env.LLM_PLANNER_V2 === 'true' || s.llm;
        const explain = useLLM
          ? await explainerV2({ stdout: t.stdout, stderr: t.stderr }).catch((err: any) => {
              console.error('[LLM Explainer v2] Error:', err.message);
              return explainer({ stdout: t.stdout, stderr: t.stderr });
            })
          : await explainer({ stdout: t.stdout, stderr: t.stderr });
        send({
          type: 'error_explained',
          text: explain.text,
          steps: explain.steps,
        });

        const fix = useLLM
          ? await fixerV2({ stdout: t.stdout, stderr: t.stderr }).catch((err: any) => {
              console.error('[LLM Fixer v2] Error:', err.message);
              return fixer({ stdout: t.stdout, stderr: t.stderr });
            })
          : await fixer({ stdout: t.stdout, stderr: t.stderr });
        for (const act of fix.actions || []) {
          const prev = await builder(act);
          send({
            type: 'patch_preview',
            patchId: prev.id,
            path: act.path,
            diff: prev.diff,
          });
          if (s.autonomy) {
            const applied = await builder({ ...act, apply: true, previous: prev.base });
            send({
              type: 'patch_applied',
              patchId: prev.id,
              path: act.path,
              ok: applied.ok,
            });
          }
        }
      }
    }
    send({ type: 'progress', stage: 'idle' });
  }

  if (msg.type === 'approve_patch') {
    try {
      const applied = await builder({ id: msg.patchId, apply: true, path: '' });
      send({ type: 'patch_applied', patchId: msg.patchId, ok: applied.ok });
    } catch (e: any) {
      send({ type: 'patch_applied', patchId: msg.patchId, ok: false, error: e.message });
    }
  }

  if (msg.type === 'choice') {
    // For v1 we just echo choice; planner can refine later
    send({
      type: 'agent_message',
      agent: 'Planner',
      text: `Got it: ${msg.id}. Executing.`,
    });
  }
}
