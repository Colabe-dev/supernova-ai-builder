import { google } from 'googleapis';
export async function verifyGooglePurchaseReal({ purchaseToken, productId, packageName, type = 'product' }){
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY missing');
  const json = JSON.parse(key);
  const auth = new google.auth.JWT(json.client_email, undefined, json.private_key, ['https://www.googleapis.com/auth/androidpublisher']);
  const publisher = google.androidpublisher({ version: 'v3', auth });
  if (type === 'subscription') {
    const { data } = await publisher.purchases.subscriptions.get({ packageName, subscriptionId: productId, token: purchaseToken });
    const ok = Boolean(data && (data.purchaseState === 0 || data.autoRenewing));
    return { ok, raw: data, kind: 'subscription' };
  } else {
    const { data } = await publisher.purchases.products.get({ packageName, productId, token: purchaseToken });
    const ok = Boolean(data && data.purchaseState === 0);
    return { ok, raw: data, kind: 'one_time' };
  }
}
