import { fetch } from 'undici';
const base = (process.env.COLLAB_PAY_API_BASE || '').replace(/\/$/, '');
const secret = process.env.COLLAB_PAY_SECRET || '';
function headers(){ return { 'content-type':'application/json', 'x-collab-secret': secret }; }
export async function creditCoins(profileId, amount, reason){
  if (!base) throw new Error('COLLAB_PAY_API_BASE not set');
  const r = await fetch(`${base}/coins/credit`, { method:'POST', headers: headers(), body: JSON.stringify({ profileId, amount, reason }) });
  if (!r.ok) throw new Error('coins.credit failed');
  return r.json();
}
export async function createSubscription(profileId, plan){
  if (!base) throw new Error('COLLAB_PAY_API_BASE not set');
  const r = await fetch(`${base}/subscriptions/create`, { method:'POST', headers: headers(), body: JSON.stringify({ profileId, plan }) });
  if (!r.ok) throw new Error('subscriptions.create failed');
  return r.json();
}
