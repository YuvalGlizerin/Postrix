resource "aws_vpc" "postrix" {
  cidr_block                       = "172.31.0.0/16"
  assign_generated_ipv6_cidr_block = true

  tags = {
    Name = "postrix-vpc"
  }
}

resource "aws_internet_gateway" "postrix" {
  vpc_id = aws_vpc.postrix.id

  tags = {
    Name = "postrix-igw"
  }
}

resource "aws_route_table" "main" {
  vpc_id = aws_vpc.postrix.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.postrix.id
  }

  route {
    ipv6_cidr_block = "::/0"
    gateway_id      = aws_internet_gateway.postrix.id
  }
}

resource "aws_route" "ipv6_default" {
  route_table_id              = aws_route_table.main.id
  destination_ipv6_cidr_block = "::/0"
  gateway_id                  = aws_internet_gateway.postrix.id
}

resource "aws_subnet" "subnet_a" {
  vpc_id                          = aws_vpc.postrix.id
  cidr_block                      = "172.31.16.0/20"
  ipv6_cidr_block                 = cidrsubnet(aws_vpc.postrix.ipv6_cidr_block, 8, 1)
  availability_zone               = "us-east-1a"
  map_public_ip_on_launch         = true
  assign_ipv6_address_on_creation = true

  tags = {
    Name = "postrix-subnet-a"
  }
}

resource "aws_subnet" "subnet_b" {
  vpc_id                          = aws_vpc.postrix.id
  cidr_block                      = "172.31.32.0/20"
  ipv6_cidr_block                 = cidrsubnet(aws_vpc.postrix.ipv6_cidr_block, 8, 2)
  availability_zone               = "us-east-1b"
  map_public_ip_on_launch         = true
  assign_ipv6_address_on_creation = true

  tags = {
    Name = "postrix-subnet-b"
  }
}
