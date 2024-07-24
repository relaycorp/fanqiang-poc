packer {
  required_plugins {
    googlecompute = {
      version = ">= 1.1.4"
      source  = "github.com/hashicorp/googlecompute"
    }
  }
}

variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "nodejs_version" {
  type    = string
  default = "20.16.0"
}

source "googlecompute" "vpn_gateway" {
  project_id              = var.project_id
  source_image_family     = "ubuntu-2204-lts"
  source_image_project_id = ["ubuntu-os-cloud"]
  region                  = var.region
  zone                    = "${var.region}-a"
  image_name              = "vpn-gateway-{{timestamp}}"
  image_family            = "vpn-gateway"
  image_storage_locations = [var.region]

  machine_type = "e2-micro"
  disk_size    = 10
  ssh_username = "ubuntu"

  metadata = {
    startup-script = file("startup-script.sh")
  }
}

build {
  sources = ["source.googlecompute.vpn_gateway"]

  provisioner "shell" {
    inline = [
      "sudo mkdir -p /opt/vpn-gateway",
      "sudo chown -R ubuntu:ubuntu /opt/vpn-gateway",
    ]
  }

  provisioner "file" {
    sources = [
      "../bin",
      "../src",
      "../custom-image",
      "../package.json",
      "../package-lock.json",
      "../tsconfig.json",
      "../binding.gyp"
    ]
    destination = "/opt/vpn-gateway/"
  }

  provisioner "shell" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y python3-setuptools xz-utils build-essential",
      "sudo useradd -m -s /bin/bash fanqiang",
      "sudo chown -R fanqiang:fanqiang /opt/vpn-gateway",
      "sudo chmod -R 755 /opt/vpn-gateway",

      # Install Node.js
      "wget https://nodejs.org/dist/v${var.nodejs_version}/node-v${var.nodejs_version}-linux-x64.tar.xz",
      "sudo mkdir -p /opt/nodejs",
      "sudo tar -xJvf node-v${var.nodejs_version}-linux-x64.tar.xz -C /opt/nodejs --strip-components=1",
      "sudo ln -s /opt/nodejs/bin/node /usr/local/bin/node",
      "sudo ln -s /opt/nodejs/bin/npm /usr/local/bin/npm",
      "rm node-v${var.nodejs_version}-linux-x64.tar.xz",

      "cd /opt/vpn-gateway",
      "sudo -u fanqiang npm install",
      "sudo -u fanqiang npm run build",
      "sudo -u fanqiang npm prune --production",
      "sudo rm -rf src",
      "sudo cp vpn-gateway.service /etc/systemd/system/",
      "sudo systemctl daemon-reload",
      "sudo systemctl enable vpn-gateway.service"
    ]
  }
}
