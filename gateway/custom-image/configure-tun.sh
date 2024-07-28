#!/bin/bash
set -o nounset
set -o errexit
set -o pipefail

sysctl -w net.ipv4.ip_forward=1

/opt/vpn-gateway/bin/tun up fanqiang
