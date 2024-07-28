#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail

GCP_PROJECT="$1"

function does_fw_rule_exist() {
    local rule_name="$1"

    gcloud compute firewall-rules describe "${rule_name}" --project="${GCP_PROJECT}" 2>/dev/null
}

function create_fw_rule_if_missing() {
    local rule_name="$1"
    local port="$2"
    local tag="$3"

    if ! does_fw_rule_exist "${rule_name}"; then
        gcloud compute firewall-rules create "${rule_name}" \
            --direction=INGRESS \
            --priority=1000 \
            --network=default \
            --action=ALLOW \
            --rules="tcp:${port}" \
            --source-ranges=0.0.0.0/0 \
            --target-tags="${tag}" \
            --description="Allow ${port} from anywhere" \
            --project="${GCP_PROJECT}"
    fi
}

create_fw_rule_if_missing "default-allow-http" "80" "http-server"
create_fw_rule_if_missing "default-allow-https" "443" "https-server"
