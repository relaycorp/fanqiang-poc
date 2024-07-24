#!/bin/bash
set -o nounset
set -o errexit
set -o pipefail

/opt/vpn-gateway/dev-bin/tun up

systemctl start vpn-gateway.service
