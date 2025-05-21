resource "aws_vpc" "postrix" {
  cidr_block           = "172.31.0.0/16"

  tags = {
    Name = "postrix-vpc"
  }
}

resource "aws_subnet" "subnet_a" {
  vpc_id                  = aws_vpc.postrix.id
  cidr_block              = "172.31.16.0/20"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true

  tags = {
    Name = "postrix-subnet-a"
  }
}

resource "aws_subnet" "subnet_b" {
  vpc_id                  = aws_vpc.postrix.id
  cidr_block              = "172.31.32.0/20"
  availability_zone       = "us-east-1b"
  map_public_ip_on_launch = true

  tags = {
    Name = "postrix-subnet-b"
  }
}
