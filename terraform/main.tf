terraform {
  required_version = ">= 1.9.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.75.0"
    }
    github = {
      source  = "integrations/github"
      version = ">= 6.3.1"
    }
    tfe = {
      source  = "hashicorp/tfe"
      version = ">= 0.60.1"
    }
    docker = {
      source  = "docker/docker"
      version = "~> 0.4"
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
  # Using AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
  region = var.aws_region
}

provider "github" {
  # Using GITHUB_TOKEN
  owner = "YuvalGlizerin"
}

provider "tfe" {
  # Using TFE_TOKEN
  hostname = "app.terraform.io"
}

provider "docker" {
  # Using DOCKER_USERNAME and DOCKER_PASSWORD
}

module "aws_eks" {
  source       = "./modules/aws/eks"
  cluster_name = "postrix"
  region       = var.aws_region
  subnet_ids   = var.subnet_ids

  providers = {
    aws = aws
  }
}

module "aws_route53" {
  source = "./modules/aws/route53"
  domain = var.domain

  providers = {
    aws = aws
  }
}

module "aws_certificate_manager" {
  source  = "./modules/aws/certificate-manager"
  domain  = var.domain
  zone_id = module.aws_route53.zone_id

  providers = {
    aws = aws
  }
}

module "aws_credentials" {
  source = "./modules/aws/credentials"

  providers = {
    aws = aws
  }
}

module "aws_s3" {
  source = "./modules/aws/s3"

  providers = {
    aws = aws
  }
}

module "aws_secrets_manager" {
  source = "./modules/aws/secrets-manager" 

  providers = {
    aws = aws
  }
}

module "aws_rds" {
  source = "./modules/aws/rds"
  subnet_ids = var.subnet_ids

  providers = {
    aws = aws
  }
}

module "github" {
  source = "./modules/github"
  domain = var.domain

  providers = {
    github = github
  }
}

module "tfe" {
  source = "./modules/tfe"

  providers = {
    tfe = tfe
  }
}

module "docker" {
  source = "./modules/docker"

  providers = {
    docker = docker
  }
}
