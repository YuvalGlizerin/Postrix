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

module "aws_eks" {
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

module "aws_route53" {
  source = "./modules/aws/route53"
  domain = var.domain

  providers = {
    aws = aws
  }
}

module "github_general" {
  source = "./modules/github/general"
  domain = var.domain

  providers = {
    github = github
  }
}

module "tfe_sentinel" {
  source = "./modules/tfe/sentinel"

  providers = {
    tfe = tfe
  }
}
