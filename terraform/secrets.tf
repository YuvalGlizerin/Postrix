// All sensitive variables imported from terraform cloud

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
