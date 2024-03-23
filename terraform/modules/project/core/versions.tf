terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
    }
    godaddy-dns = {
      source  = "registry.terraform.io/veksh/godaddy-dns"
    }
  }
}
