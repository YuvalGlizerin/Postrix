output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.postrix.id
}

output "subnet_ids" {
  description = "List of subnet IDs"
  value       = [aws_subnet.subnet_a.id, aws_subnet.subnet_b.id]
}

output "subnet_a_id" {
  description = "Subnet A ID"
  value       = aws_subnet.subnet_a.id
}

output "subnet_b_id" {
  description = "Subnet B ID"
  value       = aws_subnet.subnet_b.id
}
