variable "subnet_ids" {
  description = "A list of subnet IDs for the EKS cluster"
  type        = list(string)
}

# Create a DB subnet group
resource "aws_db_subnet_group" "postgres" {
  name       = "postrix-postgres-subnet-group"
  subnet_ids = var.subnet_ids
}

# Create a security group for RDS
resource "aws_security_group" "postgres" {
  name        = "postrix-postgres-sg"
  description = "Security group for Postrix PostgreSQL RDS"

  # Allow PostgreSQL traffic from anywhere
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Create the RDS instance with minimal configuration
resource "aws_db_instance" "postgres" {
  identifier             = "postrix-postgres"
  allocated_storage      = 20
  engine                 = "postgres"
  engine_version         = "17.2"
  instance_class         = "db.t4g.micro"
  username               = "postgres"
  # password is set manually in the secrets manager, and used for this instance
  
  # Networking
  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  vpc_security_group_ids = [aws_security_group.postgres.id]
  publicly_accessible    = true
  
  # Disable all optional features
  engine_lifecycle_support = "open-source-rds-extended-support-disabled"
  backup_retention_period  = 7
  maintenance_window       = null
  backup_window            = "03:00-04:00"
  multi_az                 = false
  storage_type             = "gp2"
  skip_final_snapshot      = false
  final_snapshot_identifier = "postrix-postgres-final-snapshot"
  performance_insights_enabled = false
  monitoring_interval     = 0
  auto_minor_version_upgrade = false
  
  # For easy changes
  apply_immediately      = true
  deletion_protection    = false
  
  lifecycle {
    ignore_changes = [password]
  }
}
