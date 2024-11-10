terraform {
  required_version = "1.9.7"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "5.20.0"
    }

    cloudflare = {   
      source = "cloudflare/cloudflare"
      version = "4.34.0"
    }

    aws = {
      source  = "hashicorp/aws"
      version = "5.75.0"
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

provider "aws" {
  region = var.aws_region
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
      cluster_name              = "production"
    }
    development = {
      project                   = "postrix-development"
      artifactory_repository_id = "development-docker"
      env                       = "dev"
      domain_prefix             = "dev."
      cluster_name              = "development"
    }
  }
}

module "eks" {
  source            = "./modules/aws/eks"
  cluster_name      = "postrix"
  region            = var.aws_region
  subnet_ids        = [
    "subnet-02a3fb65864cb921f", # us-east-1a
    "subnet-0f5f53463472c2445"  # us-east-1b
  ]

  providers = {
    aws = aws
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
  cluster_name              = each.value.cluster_name

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
