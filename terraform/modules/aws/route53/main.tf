# All app DNS records are managed by External DNS via kubernetes, so don't manage them here
# We only manage infrastructure DNS records here

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

# Needed to receive emails on Google Workspace
resource "aws_route53_record" "mx_records" {
  zone_id = aws_route53_zone.zone.zone_id
  name    = var.domain
  type    = "MX"
  ttl     = 3600
  records = [
    "1 ASPMX.L.GOOGLE.COM.",
    "5 ALT1.ASPMX.L.GOOGLE.COM.",
    "5 ALT2.ASPMX.L.GOOGLE.COM.",
    "10 ALT3.ASPMX.L.GOOGLE.COM.",
    "10 ALT4.ASPMX.L.GOOGLE.COM."
  ]
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
