export function requireMutualTLS(){
  return (req, res, next) => {
    const cert = req.socket.getPeerCertificate?.();
    if (!req.client.authorized || !cert || !cert.subject) {
      return res.status(401).json({ error: 'mtls_required' });
    }
    // Optional: enforce OU/O fields
    next();
  };
}
