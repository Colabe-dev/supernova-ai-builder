#!/usr/bin/env bash
set -euo pipefail
OUT=${1:-certs}
mkdir -p "$OUT"

# CA
openssl genrsa -out "$OUT/ca.key" 4096
openssl req -x509 -new -nodes -key "$OUT/ca.key" -sha256 -days 3650 -subj "/CN=Supernova Dev CA" -out "$OUT/ca.pem"

# Server
openssl genrsa -out "$OUT/server.key" 2048
openssl req -new -key "$OUT/server.key" -subj "/CN=localhost" -out "$OUT/server.csr"
openssl x509 -req -in "$OUT/server.csr" -CA "$OUT/ca.pem" -CAkey "$OUT/ca.key" -CAcreateserial -out "$OUT/server.pem" -days 825 -sha256

# Client
openssl genrsa -out "$OUT/client.key" 2048
openssl req -new -key "$OUT/client.key" -subj "/CN=svc-client" -out "$OUT/client.csr"
openssl x509 -req -in "$OUT/client.csr" -CA "$OUT/ca.pem" -CAkey "$OUT/ca.key" -CAcreateserial -out "$OUT/client.pem" -days 825 -sha256

echo "Wrote certs under $OUT"
