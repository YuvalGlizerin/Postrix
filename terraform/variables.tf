// All non-sensitive variables imported from terraform cloud

variable "DOMAIN_DNS_SERVER_IP" {
  description = "Domain Server IP"
  type        = string
}

variable "CLOUDFLARE_ZONE_ID" {
  description = "Cloudflare Zone ID"
  type        = string
}

variable "CLOUDFLARE_ACCOUNT_ID" {
  description = "Cloudflare Account ID"
  type        = string
}