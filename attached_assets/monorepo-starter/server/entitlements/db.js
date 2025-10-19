import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export async function getEntitlements(profileId){
  const c = await pool.connect();
  try {
    const bal = await c.query('select balance from ent_coins_balance where profile_id=$1', [profileId]);
    const subs = await c.query('select plan, status, started_at as "startedAt", renewed_at as "renewedAt", cancelled_at as "cancelledAt", source from ent_subscriptions where profile_id=$1 and status=$2', [profileId, 'active']);
    return { coins: Number(bal.rows[0]?.balance || 0), subscriptions: subs.rows };
  } finally { c.release(); }
}
export async function grantCoins(profileId, amount, reason, source, externalRef){
  const c = await pool.connect();
  try {
    await c.query('begin');
    if (externalRef) {
      const ex = await c.query('select id from ent_coins_ledger where external_ref=$1', [externalRef]);
      if (ex.rowCount > 0) {
        const b = await c.query('select balance from ent_coins_balance where profile_id=$1', [profileId]);
        await c.query('commit'); return { id: ex.rows[0].id, balance: Number(b.rows[0]?.balance || 0), duplicate: true };
      }
    }
    const ins = await c.query('insert into ent_coins_ledger(profile_id, amount, reason, source, external_ref) values($1,$2,$3,$4,$5) returning id', [profileId, Number(amount), reason || null, source || null, externalRef || null]);
    const up = await c.query('update ent_coins_balance set balance = balance + $1 where profile_id=$2', [Number(amount), profileId]);
    if (up.rowCount === 0) await c.query('insert into ent_coins_balance(profile_id, balance) values($1,$2)', [profileId, Number(amount)]);
    const b = await c.query('select balance from ent_coins_balance where profile_id=$1', [profileId]);
    await c.query('commit'); return { id: ins.rows[0].id, balance: Number(b.rows[0]?.balance || 0) };
  } catch(e){ await c.query('rollback'); throw e; } finally { c.release(); }
}
export async function activateSubscription(profileId, plan, source){
  const c = await pool.connect();
  try {
    const q = await c.query(`
      insert into ent_subscriptions(profile_id, plan, status, started_at, renewed_at, source)
      values ($1,$2,'active', now(), now(), $3)
      on conflict (profile_id, plan) do update set status='active', renewed_at=excluded.renewed_at, cancelled_at=null, source=excluded.source
      returning plan, status, started_at as "startedAt", renewed_at as "renewedAt", cancelled_at as "cancelledAt", source
    `, [profileId, plan, source || null]);
    return q.rows[0];
  } finally { c.release(); }
}
export async function cancelSubscription(profileId, plan, source){
  const c = await pool.connect();
  try {
    const q = await c.query(`
      update ent_subscriptions set status='cancelled', cancelled_at=now(), source=$3
      where profile_id=$1 and plan=$2
      returning plan, status, started_at as "startedAt", renewed_at as "renewedAt", cancelled_at as "cancelledAt", source
    `, [profileId, plan, source || null]);
    return q.rows[0] || null;
  } finally { c.release(); }
}
