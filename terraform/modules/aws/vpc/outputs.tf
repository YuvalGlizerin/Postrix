output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.postrix.id
}

output "subnet_ids" {
  description = "List of subnet IDs"
  value       = [aws_subnet.subnet_a.id, aws_subnet.subnet_b.id]
} 
