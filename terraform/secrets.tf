// All sensitive variables imported from terraform cloud

variable "CLOUDFLARE_API_TOKEN" {
  description = "API Token for Cloudflare"
  type        = string
  sensitive   = true
  default     = ""
}
