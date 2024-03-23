// You can import your dns provider resources using the following command
// GODADDY_API_KEY=your_api_key GODADDY_API_SECRET=your_api_secret terraform import module.godaddy.resource_name.reference_name domain:type:name:data

variable "domain" {}

resource "godaddy-dns_record" "cname_domain" {
  domain = var.domain
  name   = "www"
  type   = "CNAME"
  data   = "@"
  ttl    = 3600
}
