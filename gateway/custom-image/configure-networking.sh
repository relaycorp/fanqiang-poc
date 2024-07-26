#!/bin/bash
set -o nounset
set -o errexit
set -o pipefail

function configure_caddy() {
    DOMAIN_NAME="$(curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/attributes/DOMAIN_NAME)"
    cat > /etc/caddy/Caddyfile <<EOF
${DOMAIN_NAME} {
    reverse_proxy localhost:8080
}
EOF
    chown caddy:caddy /etc/caddy/Caddyfile
    chmod 644 /etc/caddy/Caddyfile
}

configure_caddy
/opt/vpn-gateway/bin/tun up
