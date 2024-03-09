# Requires authentication: gcloud auth application-default login

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "4.52.0"
    }
  }
}

provider "google" {
  region  = var.region
  zone    = var.zone
}

module "postrix_production" {
  source                    = "./modules/core"
  project                   = "postrix"
  region                    = var.region
  zone                      = var.zone
  artifactory_repository_id = "production-docker"
  env                       = "production"
}

module "postrix_sandbox" {
  source                    = "./modules/core"
  project                   = "postrix-sandbox"
  region                    = var.region
  zone                      = var.zone
  artifactory_repository_id = "sandbox-docker"
  env                       = "sandbox"
}

module "postrix_development" {
  source                    = "./modules/core"
  project                   = "postrix-development"
  region                    = var.region
  zone                      = var.zone
  artifactory_repository_id = "development-docker"
  env                       = "development"
}
