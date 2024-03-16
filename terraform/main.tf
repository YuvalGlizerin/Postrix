terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.20.0"
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
    }
    development = {
      project                   = "postrix-development"
      artifactory_repository_id = "development-docker"
      env                       = "development"
    }
  }
}

module "core" {
  for_each                  = local.environments
  source                    = "./modules/core"
  project                   = each.value.project
  region                    = var.region
  zone                      = var.zone
  artifactory_repository_id = each.value.artifactory_repository_id
  env                       = each.value.env
}

module "infrastructure" {
  for_each                  = local.environments
  source                    = "./modules/infrastructure"
  project                   = each.value.project
  region                    = var.region
  zone                      = var.zone
  artifactory_repository_id = each.value.artifactory_repository_id
  env                       = each.value.env
}
