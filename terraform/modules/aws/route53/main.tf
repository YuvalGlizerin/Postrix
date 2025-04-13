# All DNS records are managed by External DNS via kubernetes, so don't manage them here

variable "domain" {
  description = "The domain name"
  type        = string
}

resource "aws_route53domains_registered_domain" "domain" {
  domain_name = var.domain

  name_server {
    name = "ns-583.awsdns-08.net"
  }
  name_server {
    name = "ns-330.awsdns-41.com"
  }
  name_server {
    name = "ns-1619.awsdns-10.co.uk"
  }
  name_server {
    name = "ns-1261.awsdns-29.org"
  }
}

resource "aws_route53_zone" "zone" {
  name = var.domain
}

resource "aws_route53_zone" "toybuttons_zone" {
  name = "toybuttons.com"
}

resource "aws_route53domains_registered_domain" "toybuttons_domain" {
  domain_name = "toybuttons.com"

  name_server {
    name = "ns-1046.awsdns-02.org"
  }
  name_server {
    name = "ns-297.awsdns-37.com"
  }
  name_server {
    name = "ns-1874.awsdns-42.co.uk"
  }
  name_server {
    name = "ns-576.awsdns-08.net"
  }
}
