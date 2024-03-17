variable "domain" {
  default = "postrix.io"
}

variable "region" {
  default = "us-central1"
}

variable "zone" {
  default = "us-central1-a"
}

variable "runtime" {
  default = "nodejs20"
}

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
