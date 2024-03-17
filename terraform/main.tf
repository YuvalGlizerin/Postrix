terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "5.20.0"
    }

    godaddy = {
      source  = "n3integration/godaddy"
      version = "1.9.1"
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

provider "godaddy" {
  key    = var.GODADDY_API_KEY
  secret = var.GODADDY_API_SECRET
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

module "infrastructure" {
  for_each                  = local.environments
  source                    = "./modules/infrastructure"
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
  source                    = "./modules/core"
  project                   = each.value.project
  region                    = var.region
  zone                      = var.zone
  artifactory_repository_id = each.value.artifactory_repository_id
  env                       = each.value.env
  domain                    = var.domain
  domain_prefix             = "core.${each.value.domain_prefix}"

  providers = {
    google  = google
    godaddy = godaddy
  }
}
