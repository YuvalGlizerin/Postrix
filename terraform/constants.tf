// All hard coded constants defined here

variable "domain" {
  default = "postrix.io"
}

variable "aws_region" {
  default = "us-east-1"
}

variable "subnet_ids" {
  default = [
    "subnet-02a3fb65864cb921f", # us-east-1a
    "subnet-0f5f53463472c2445"  # us-east-1b
  ]
}