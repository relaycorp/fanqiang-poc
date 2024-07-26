#!/bin/bash
set -o nounset
set -o errexit
set -o pipefail

NODEJS_VERSION="20.16.0"
CADDY_VERSION="2.8.4"

function install_nodejs() {
    wget "https://nodejs.org/dist/v${NODEJS_VERSION}/node-v${NODEJS_VERSION}-linux-x64.tar.xz"
    mkdir -p /opt/nodejs
    tar -xJvf "node-v${NODEJS_VERSION}-linux-x64.tar.xz" -C /opt/nodejs --strip-components=1
    ln -s /opt/nodejs/bin/node /usr/local/bin/node
    ln -s /opt/nodejs/bin/npm /usr/local/bin/npm
    rm "node-v${NODEJS_VERSION}-linux-x64.tar.xz"
}

function install_caddy() {
    wget "https://github.com/caddyserver/caddy/releases/download/v${CADDY_VERSION}/caddy_${CADDY_VERSION}_linux_amd64.deb"
    dpkg -i "caddy_${CADDY_VERSION}_linux_amd64.deb"
    rm "caddy_${CADDY_VERSION}_linux_amd64.deb"
}

function install_dependencies() {
    apt-get update
    apt-get install -y python3-setuptools xz-utils build-essential

    install_nodejs
    install_caddy
}

function uninstall_build_dependencies() {
    apt-get remove -y python3-setuptools xz-utils build-essential
    apt-get autoremove -y
}

function install_gateway() {
    useradd -m -s /bin/bash fanqiang
    chown -R fanqiang:fanqiang /opt/vpn-gateway
    chmod -R 755 /opt/vpn-gateway
    cd /opt/vpn-gateway
    sudo -u fanqiang npm install
    sudo -u fanqiang npm run build
    sudo -u fanqiang npm prune --omit=dev
    mv vpn-gateway.service /etc/systemd/system/
    rm -rf src
    cd -
}

configure_boot() {
    systemctl daemon-reload
    systemctl enable vpn-gateway.service
    systemctl enable caddy
    mv /opt/vpn-gateway/configure-networking.sh /var/lib/cloud/scripts/per-boot/configure-networking.sh
}

# Main
install_dependencies
install_gateway
uninstall_build_dependencies
configure_boot
