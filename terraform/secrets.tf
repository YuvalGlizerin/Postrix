variable "GODADDY_API_KEY" {
  description = "API Key for GoDaddy"
  type        = string
  sensitive   = true
  default     = ""
}

variable "GODADDY_API_SECRET" {
  description = "API Secret for GoDaddy"
  type        = string
  sensitive   = true
  default     = ""
}

variable "DOMAIN_SERVER_IP" {
  description = "Domain Server IP"
  type        = string
  sensitive   = true
  default     = ""
}
