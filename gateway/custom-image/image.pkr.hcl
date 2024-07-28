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
  source_image_family     = "ubuntu-minimal-2404-lts-amd64"
  source_image_project_id = ["ubuntu-os-cloud"]
  region                  = var.region
  zone                    = "${var.region}-a"
  image_name              = "vpn-gateway-{{timestamp}}"
  image_family            = "vpn-gateway"
  image_storage_locations = [var.region]

  machine_type = "e2-standard-2"
  disk_size    = 10
  ssh_username = "ubuntu"
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
      "./configure-caddy.sh",
      "./configure-tun.sh",
      "./provision.sh",
      "./vpn-gateway.service",

      "../bin",
      "../src",
      "../package.json",
      "../package-lock.json",
      "../tsconfig.json",
      "../binding.gyp"
    ]
    destination = "/opt/vpn-gateway/"
  }

  provisioner "shell" {
    inline = [
      "sudo /opt/vpn-gateway/provision.sh",
    ]
  }
}
