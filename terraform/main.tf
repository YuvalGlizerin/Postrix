terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "5.20.0"
    }

    cloudflare = {   
      source = "cloudflare/cloudflare"
      version = "4.34.0"
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

provider "cloudflare" {
  api_token = var.CLOUDFLARE_API_TOKEN
}

locals {
  environments = {
    production = {
      project                   = "postrix"
      artifactory_repository_id = "production-docker"
      env                       = "prod"
      domain_prefix             = ""
    }
    development = {
      project                   = "postrix-development"
      artifactory_repository_id = "development-docker"
      env                       = "dev"
      domain_prefix             = "dev."
    }
  }
}

module "cloudflare" {
  source                    = "./modules/global/cloudflare"
  domain                    = var.domain
  zone_id                   = var.CLOUDFLARE_ZONE_ID
  account_id                = var.CLOUDFLARE_ACCOUNT_ID
  domain_dns_server_ip      = var.DOMAIN_DNS_SERVER_IP

  providers = {
    cloudflare = cloudflare
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
