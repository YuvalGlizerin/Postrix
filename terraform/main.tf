terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "5.20.0"
    }

    godaddy-dns = {
      source  = "veksh/godaddy-dns"
      version = "0.3.9"
    }
  }

  backend "remote" {
    hostname     = "app.terraform.io"
    organization = "postrix"

    workspaces {
      name = "postrix"
    }
  }
}

provider "google" {
  region = var.region
  zone   = var.zone
}

locals {
  environments = {
    production = {
      project                   = "postrix"
      artifactory_repository_id = "production-docker"
      env                       = "production"
      domain_prefix             = ""
    }
    development = {
      project                   = "postrix-development"
      artifactory_repository_id = "development-docker"
      env                       = "development"
      domain_prefix             = "dev."
    }
  }
}

module "godaddy" {
  source                    = "./modules/global/godaddy"
  domain                    = var.domain
  domain_dns_server_ip      = var.DOMAIN_DNS_SERVER_IP

  providers = {
    godaddy-dns = godaddy-dns
  }
}

module "infrastructure" {
  for_each                  = local.environments
  source                    = "./modules/project/infrastructure"
  project                   = each.value.project
  region                    = var.region
  zone                      = var.zone
  artifactory_repository_id = each.value.artifactory_repository_id
  env                       = each.value.env

  providers = {
    google = google
  }
}

module "core" {
  depends_on                = [module.infrastructure]

  for_each                  = local.environments
  source                    = "./modules/project/core"
  project                   = each.value.project
  region                    = var.region
  zone                      = var.zone
  artifactory_repository_id = each.value.artifactory_repository_id
  env                       = each.value.env
  domain                    = var.domain
  domain_prefix             = "core.${each.value.domain_prefix}"

  providers = {
    google  = google
  }
}
