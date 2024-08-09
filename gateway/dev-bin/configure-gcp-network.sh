#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail

GCP_PROJECT="$1"
GCP_REGION="$2"

NETWORK_NAME='fanqiang'
SUBNET_NAME='fanqiang-subnet'

function create_network_if_missing() {
    if ! gcloud compute networks describe "${NETWORK_NAME}" --project="${GCP_PROJECT}" 2>/dev/null; then
        gcloud compute networks create "${NETWORK_NAME}" \
            --project="${GCP_PROJECT}" \
            --subnet-mode=custom \
            --bgp-routing-mode=regional
    fi
}

function does_subnet_exist() {
    gcloud compute networks subnets describe "${SUBNET_NAME}" \
        --project="${GCP_PROJECT}" \
        --region="${GCP_REGION}" \
        2>/dev/null
}

function create_subnet_if_missing() {
    if ! does_subnet_exist; then
        gcloud compute networks subnets create "${SUBNET_NAME}" \
            --project="${GCP_PROJECT}" \
            --network="${NETWORK_NAME}" \
            --region="${GCP_REGION}" \
            --range="192.168.0.0/16" \
            --stack-type=IPV4_IPV6 \
            --ipv6-access-type=EXTERNAL
    fi
}

function does_fw_rule_exist() {
    local rule_name="$1"

    gcloud compute firewall-rules describe "${rule_name}" \
        --project="${GCP_PROJECT}" \
        2>/dev/null
}

function create_fw_rule_if_missing() {
    local rule_name="$1"
    local rule="$2"
    local priority="${3}"
    local source_range="${4}"
    local tag="${5:-}"

    if ! does_fw_rule_exist "${rule_name}"; then
        local additional_options=()
        if [ -n "${tag}" ]; then
            additional_options+=("--target-tags=${tag}")
        fi

        gcloud compute firewall-rules create "${rule_name}" \
            --direction=INGRESS \
            "--priority=${priority}" \
            "--network=${NETWORK_NAME}" \
            --action=ALLOW \
            "--rules=${rule}" \
            "--source-ranges=${source_range}" \
            "--description=Allow ${rule} from anywhere" \
            "--project=${GCP_PROJECT}" \
            "${additional_options[@]}"
    fi
}

echo "Creating network ${NETWORK_NAME}..."
create_network_if_missing

echo "Creating subnet ${SUBNET_NAME}..."
create_subnet_if_missing

echo "Creating firewall rules..."
create_fw_rule_if_missing 'fanqiang-allow-http-ipv4' 'tcp:80' 1000 '0.0.0.0/0' 'http-server'
create_fw_rule_if_missing 'fanqiang-allow-http-ipv6' 'tcp:80' 1001 '::/0' 'http-server'

create_fw_rule_if_missing 'fanqiang-allow-https-ipv4' 'tcp:443' 1010 '0.0.0.0/0' 'https-server'
create_fw_rule_if_missing 'fanqiang-allow-https-ipv6' 'tcp:443' 1011 '::/0' 'https-server'

create_fw_rule_if_missing 'fanqiang-allow-ssh-ipv4' 'tcp:22' 1020 '0.0.0.0/0'
create_fw_rule_if_missing 'fanqiang-allow-ssh-ipv6' 'tcp:22' 1021 '::/0'

create_fw_rule_if_missing 'fanqiang-allow-icmp-ipv4' 'ICMP' 1030 '0.0.0.0/0'
create_fw_rule_if_missing 'fanqiang-allow-icmp-ipv6' '58' 1031 '::/0'
