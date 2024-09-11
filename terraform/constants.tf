// All hard coded constants defined here

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

variable "cluster_name" {
  description = "The name of the GKE cluster"
  default     = "postrix-cluster"
}
