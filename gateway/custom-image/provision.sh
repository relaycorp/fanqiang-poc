set -o nounset
set -o errexit
set -o pipefail

NODEJS_VERSION="20.16.0"

function install_dependencies() {
    apt-get update
    apt-get install -y python3-setuptools xz-utils build-essential
}

function create_user() {
    useradd -m -s /bin/bash fanqiang
    chown -R fanqiang:fanqiang /opt/vpn-gateway
    chmod -R 755 /opt/vpn-gateway
}

function install_nodejs() {
    wget "https://nodejs.org/dist/v${NODEJS_VERSION}/node-v${NODEJS_VERSION}-linux-x64.tar.xz"
    mkdir -p /opt/nodejs
    tar -xJvf "node-v${NODEJS_VERSION}-linux-x64.tar.xz" -C /opt/nodejs --strip-components=1
    ln -s /opt/nodejs/bin/node /usr/local/bin/node
    ln -s /opt/nodejs/bin/npm /usr/local/bin/npm
    rm "node-v${NODEJS_VERSION}-linux-x64.tar.xz"
}

function setup_vpn_gateway() {
    cd /opt/vpn-gateway
    sudo -u fanqiang npm install
    sudo -u fanqiang npm run build
    sudo -u fanqiang npm prune --omit=dev
    rm -rf src
}

function configure_system() {
    mv /opt/vpn-gateway/vpn-gateway.service /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable vpn-gateway.service
    mv /opt/vpn-gateway/configure-networking.sh /var/lib/cloud/scripts/per-boot/configure-networking.sh
}

# Main
install_dependencies
create_user
install_nodejs
setup_vpn_gateway
configure_system
