import { Router } from 'express';
const r = Router();
r.get('/.well-known/jwks.json', (req, res) => {
  // For dev: ephemeral public JWK set. In prod, host real JWKS or external IdP.
  return res.json({ keys: [] });
});
export default r;
