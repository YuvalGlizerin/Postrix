# variable "project" {
#   default = "postrix"
# }

# variable "region" {
#   default = "us-central1"
# }

# variable "zone" {
#   default = "us-central1-a"
# }

variable "region" {
  description = "AWS region"
  default     = "us-east-1"
}

variable "instance_type" {
  description = "Type of EC2 instance to provision"
  default     = "t2.micro"
}

variable "instance_name" {
  description = "EC2 instance name"
  default     = "Provisioned by Terraform"
}
