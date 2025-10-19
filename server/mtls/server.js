import fs from 'fs';
import https from 'https';

export function createSecureServer(app){
  const ca = fs.readFileSync(process.env.TLS_CA || 'certs/ca.pem');
  const key = fs.readFileSync(process.env.TLS_KEY || 'certs/server.key');
  const cert = fs.readFileSync(process.env.TLS_CERT || 'certs/server.pem');

  const srv = https.createServer({
    key, cert, ca,
    requestCert: true,
    rejectUnauthorized: true,
    honorCipherOrder: true,
    minVersion: 'TLSv1.2'
  }, app);
  return srv;
}
