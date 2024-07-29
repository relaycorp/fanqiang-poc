#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail

GCP_PROJECT="$1"
GCP_REGION="$2"
DOMAIN_NAME="$3"
IMAGE_NAME="$4"

GCP_ZONE="${GCP_REGION}-a"
INSTANCE_NAME="fanqiang-gw-$(date +%Y%m%d-%H%M%S)"

GCP_SA="$(gcloud iam service-accounts list \
    --project="${GCP_PROJECT}" \
    --filter="email:compute@developer.gserviceaccount.com" \
    --format="value(email)")"

INSTANCE_TYPE="e2-micro"

echo "Creating instance ${INSTANCE_NAME}..."

gcloud compute instances create "${INSTANCE_NAME}" \
    "--project=${GCP_PROJECT}" \
    "--zone=${GCP_ZONE}" \
    "--machine-type=${INSTANCE_TYPE}" \
    --network-interface=network-tier=PREMIUM,stack-type=IPV4_ONLY,subnet=default \
    "--metadata=DOMAIN_NAME=${DOMAIN_NAME},enable-osconfig=TRUE" \
    --maintenance-policy=MIGRATE \
    --provisioning-model=STANDARD \
    --instance-termination-action=DELETE \
    --max-run-duration=172800s \
    "--service-account=${GCP_SA}" \
    --scopes=https://www.googleapis.com/auth/devstorage.read_only,https://www.googleapis.com/auth/logging.write,https://www.googleapis.com/auth/monitoring.write,https://www.googleapis.com/auth/service.management.readonly,https://www.googleapis.com/auth/servicecontrol,https://www.googleapis.com/auth/trace.append \
    --tags=http-server,https-server \
    "--create-disk=auto-delete=yes,boot=yes,device-name=${INSTANCE_NAME},image=projects/${GCP_PROJECT}/global/images/${IMAGE_NAME},mode=rw,size=10,type=projects/${GCP_PROJECT}/zones/${GCP_ZONE}/diskTypes/pd-balanced" \
    --shielded-secure-boot \
    --shielded-vtpm \
    --shielded-integrity-monitoring \
    --labels=goog-ops-agent-policy=v2-x86-template-1-3-0,goog-ec-src=vm_add-gcloud \
    --reservation-affinity=any
