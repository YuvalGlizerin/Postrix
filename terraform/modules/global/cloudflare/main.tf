// You can import your dns provider resources using the following command
// GODADDY_API_KEY=your_api_key GODADDY_API_SECRET=your_api_secret terraform import module.godaddy.resource_name.reference_name domain:type:name:data

variable "domain" {}
variable "account_id" {}
variable "zone_id" {}
variable "domain_dns_server_ip" {}

resource "cloudflare_record" "cname_domain" {
  zone_id = var.zone_id
  name   = "www"
  type   = "CNAME"
  value   = var.domain
  ttl    = 3600
}

resource "cloudflare_record" "server_ip" {
  zone_id = var.zone_id
  name   = "@"
  type   = "A"
  value   = var.domain_dns_server_ip
  ttl    = 3600
}

resource "cloudflare_record" "production_to_google" {
  zone_id = var.zone_id
  name   = "*" // Example: my-service.postrix.io
  type   = "CNAME"
  value   = "ghs.googlehosted.com"
  ttl    = 3600
}

resource "cloudflare_record" "dev_to_google" {
  zone_id = var.zone_id
  name   = "*.dev" // Example: my_service.dev.postrix.io or github_branch-my_service.dev.postrix.io
  type   = "CNAME"
  value   = "ghs.googlehosted.com"
  ttl    = 3600
}