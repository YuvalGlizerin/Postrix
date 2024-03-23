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

variable "domain_server_ip" {
  description = "Domain Server IP"
  type        = string
  sensitive   = false
  default     = ""
}
