terraform {
  required_version = "1.9.7"

  required_providers {
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

module "route53" {
  source = "./modules/aws/route53"
  domain = var.domain

  providers = {
    aws = aws
  }
}
