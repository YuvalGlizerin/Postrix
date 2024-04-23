// You can import your dns provider resources using the following command
// GODADDY_API_KEY=your_api_key GODADDY_API_SECRET=your_api_secret terraform import module.godaddy.resource_name.reference_name domain:type:name:data

variable "domain" {}
variable "domain_dns_server_ip" {}

resource "godaddy-dns_record" "cname_domain" {
  domain = var.domain
  name   = "www"
  type   = "CNAME"
  data   = "@"
  ttl    = 3600
}

resource "godaddy-dns_record" "server_ip" {
  domain = var.domain
  name   = "@"
  type   = "A"
  data   = var.domain_dns_server_ip
  ttl    = 3600
}

resource "godaddy-dns_record" "production_to_google" {
  domain = var.domain
  name   = "*" // Example: my-service.postrix.io
  type   = "CNAME"
  data   = "ghs.googlehosted.com"
  ttl    = 3600
}

resource "godaddy-dns_record" "dev_to_google" {
  domain = var.domain
  name   = "*.dev" // Example: my-service.dev.postrix.io
  type   = "A"
  data   = "ghs.googlehosted.com"
  ttl    = 3600
}

resource "godaddy-dns_record" "adhoc_to_google" {
  domain = var.domain
  name   = "*.*.dev"  // Example: my-branch.my-service.dev.postrix.io
  type   = "A"
  data   = "ghs.googlehosted.com"
  ttl    = 3600
}