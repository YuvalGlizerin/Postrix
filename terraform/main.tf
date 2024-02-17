# Requires authentication: gcloud auth application-default login

# terraform {
#   required_providers {
#     google = {
#       source = "hashicorp/google"
#     }
#   }
# }

# provider "google" {
#   project = var.project
#   region  = var.region
# }

# resource "google_compute_network" "vpc_network" {
#   name = "terraform-network"
# }

# resource "google_compute_instance" "vm_instance" {
#   name         = "terraform-instance"
#   machine_type = "f1-micro"
#   tags         = ["web", "dev"]

#   boot_disk {
#     initialize_params {
#       image = "cos-cloud/cos-stable"
#     }
#   }

#   network_interface {
#     network = google_compute_network.vpc_network.name
#     access_config {
#     }
#   }
# }

provider "aws" {
  region = var.region
}

data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["099720109477"] # Canonical
}

resource "aws_instance" "ubuntu" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  tags = {
    Name = var.instance_name
  }
}
