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

variable "DOMAIN_DNS_SERVER_IP" {
  description = "Domain Server IP"
  type        = string
}
