#!/bin/bash
# Generates a local self-signed SSL certificate for HTTPS in development.
# Run from inside api/certs/: bash generate-cert.sh
# Filenames match the defaults in index.js (SSL_KEY_PATH / SSL_CERT_PATH).

openssl req -nodes -new -x509 \
  -keyout localhost-key.pem \
  -out localhost-cert.pem \
  -days 365 \
  -subj "/C=ZA/ST=WesternCape/L=CapeTown/O=HustleHub/OU=Dev/CN=localhost"

echo "Generated localhost-key.pem and localhost-cert.pem in $(pwd)"
echo "Set USE_HTTPS=true in your .env to use them."
