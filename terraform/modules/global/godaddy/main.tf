// You can import your dns provider resources using the following command
// GODADDY_API_KEY=your_api_key GODADDY_API_SECRET=your_api_secret terraform import module.godaddy.resource_name.reference_name domain:type:name:data

variable "domain" {}
variable "domain_server_ip" {}

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
  data   = "${var.domain_server_ip}"
  ttl    = 3600
}
