# All DNS records are managed by External DNS via kubernetes, so don't manage them here

variable "domain" {
  description = "The domain name"
  type        = string
}

resource "aws_route53domains_registered_domain" "domain" {
  domain_name = var.domain
}

resource "aws_route53_zone" "zone" {
  name = var.domain
}
