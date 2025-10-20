import fs from 'fs';
import path from 'path';
import { reloadSupabaseConfig } from '../../integrations/supabase.js';

const ROOT = process.cwd();
const ENV_FILE = path.join(ROOT, '.env');

interface ConnectAction {
  mode: 'connect';
  url: string;
  anonKey: string;
  serviceRole: string;
}

interface ProvisionAction {
  mode: 'provision';
  orgId: string;
  region: string;
  dbPassword: string;
  accessToken: string;
}

type SupabaseAction = ConnectAction | ProvisionAction;

export async function supabaseConnector(action: SupabaseAction) {
  if (action.mode === 'connect') {
    return await connectExistingProject(action);
  } else {
    return await provisionNewProject(action);
  }
}

async function connectExistingProject(action: ConnectAction) {
  try {
    const url = action.url.trim();
    const anonKey = action.anonKey.trim();
    const serviceRole = action.serviceRole.trim();

    if (!url || !anonKey || !serviceRole) {
      throw new Error('All fields are required: URL, Anon Key, and Service Role');
    }

    if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
      throw new Error('Invalid Supabase URL. Expected format: https://xxxxx.supabase.co');
    }

    updateEnvFile({
      SUPABASE_URL: url,
      VITE_SUPABASE_URL: url,
      VITE_SUPABASE_ANON_KEY: anonKey,
      SUPABASE_SERVICE_ROLE: serviceRole,
    });

    process.env.SUPABASE_URL = url;
    process.env.VITE_SUPABASE_URL = url;
    process.env.VITE_SUPABASE_ANON_KEY = anonKey;
    process.env.SUPABASE_SERVICE_ROLE = serviceRole;

    reloadSupabaseConfig();

    return {
      ok: true,
      message: 'Successfully connected to existing Supabase project',
      url,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e.message || String(e),
    };
  }
}

async function provisionNewProject(action: ProvisionAction) {
  try {
    const { orgId, region, dbPassword, accessToken } = action;

    if (!orgId || !region || !dbPassword || !accessToken) {
      throw new Error('All fields are required: Org ID, Region, DB Password, Access Token');
    }

    const projectName = `supernova-${Date.now()}`;

    const response = await fetch('https://api.supabase.com/v1/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: projectName,
        organization_id: orgId,
        region,
        db_pass: dbPassword,
        plan: 'free',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase API error: ${error}`);
    }

    const project = await response.json();

    const detailsResponse = await fetch(
      `https://api.supabase.com/v1/projects/${project.id}/api-keys`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!detailsResponse.ok) {
      throw new Error('Failed to fetch API keys for new project');
    }

    const keys = await detailsResponse.json();
    const anonKey = keys.find((k: any) => k.name === 'anon')?.api_key;
    const serviceRoleKey = keys.find((k: any) => k.name === 'service_role')?.api_key;

    if (!anonKey || !serviceRoleKey) {
      throw new Error('Failed to retrieve API keys from new project');
    }

    const url = `https://${project.id}.supabase.co`;

    updateEnvFile({
      SUPABASE_URL: url,
      VITE_SUPABASE_URL: url,
      VITE_SUPABASE_ANON_KEY: anonKey,
      SUPABASE_SERVICE_ROLE: serviceRoleKey,
    });

    process.env.SUPABASE_URL = url;
    process.env.VITE_SUPABASE_URL = url;
    process.env.VITE_SUPABASE_ANON_KEY = anonKey;
    process.env.SUPABASE_SERVICE_ROLE = serviceRoleKey;

    reloadSupabaseConfig();

    return {
      ok: true,
      message: `Successfully provisioned new Supabase project: ${projectName}`,
      url,
      projectId: project.id,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e.message || String(e),
    };
  }
}

function updateEnvFile(vars: Record<string, string>) {
  let envContent = '';

  if (fs.existsSync(ENV_FILE)) {
    envContent = fs.readFileSync(ENV_FILE, 'utf-8');
  }

  const lines = envContent.split('\n');
  const updatedVars = new Set<string>();

  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;

    const match = trimmed.match(/^([^=]+)=/);
    if (match) {
      const key = match[1].trim();
      if (key in vars) {
        updatedVars.add(key);
        return `${key}=${vars[key]}`;
      }
    }
    return line;
  });

  for (const [key, value] of Object.entries(vars)) {
    if (!updatedVars.has(key)) {
      newLines.push(`${key}=${value}`);
    }
  }

  fs.writeFileSync(ENV_FILE, newLines.join('\n') + '\n', 'utf-8');
}
