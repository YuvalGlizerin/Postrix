variable "cluster_name" {
  description = "The name of the EKS cluster"
  type        = string
}

variable "region" {
  description = "The AWS region to deploy the EKS cluster"
  type        = string
}

variable "subnet_ids" {
  description = "A list of subnet IDs for the EKS cluster"
  type        = list(string)
}

resource "aws_eks_cluster" "postrix" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster.arn

  vpc_config {
    subnet_ids = var.subnet_ids
  }
}

// Managed node group for the EKS cluster, specifying instance type and scaling
resource "aws_eks_node_group" "postrix_nodes" {
  cluster_name    = aws_eks_cluster.postrix.name
  node_group_name = "${var.cluster_name}-node-group"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = var.subnet_ids

  scaling_config {
    desired_size = 1
    min_size     = 1
    max_size     = 2
  }

  instance_types = ["t2.micro"] # 1 t2.micro is in the free tier
}

// IAM role for EKS nodes, allowing EC2 instances to assume this role
// This role is necessary for EC2 instances to function as worker nodes in the EKS cluster
resource "aws_iam_role" "eks_node" {
  name = "${var.cluster_name}-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com" // Allows EC2 service to assume this role
        }
      }
    ]
  })
}

// Attach the AmazonEKSWorkerNodePolicy to the node role for necessary permissions
// This policy allows worker nodes to communicate with the EKS control plane
resource "aws_iam_role_policy_attachment" "eks_node" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node.name
}

// Attach the AmazonEKS_CNI_Policy to the node role for CNI plugin permissions
// This policy is required for the Amazon VPC CNI plugin to manage network interfaces
resource "aws_iam_role_policy_attachment" "eks_cni" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node.name
}

// IAM role for the EKS cluster, allowing EKS service to assume this role
// This role is necessary for the EKS service to manage AWS resources on your behalf
resource "aws_iam_role" "eks_cluster" {
  name = "${var.cluster_name}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com" // Allows EKS service to assume this role
        }
      }
    ]
  })
}

// Attach the AmazonEKSClusterPolicy to the cluster role for necessary permissions
// This policy grants the EKS service permissions to manage the cluster
resource "aws_iam_role_policy_attachment" "eks_cluster" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

// Attach the AmazonEC2ContainerRegistryReadOnly policy to the node role
// This policy allows worker nodes to pull images from Amazon ECR
resource "aws_iam_role_policy_attachment" "eks_ec2_registry" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node.name
}
