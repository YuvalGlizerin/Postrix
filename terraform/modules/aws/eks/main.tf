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
  version  = "1.33"

  vpc_config {
    subnet_ids = var.subnet_ids  # AWS requires at least 2 AZs for EKS
  }

  tags = {
    "alpha.eksctl.io/cluster-oidc-enabled" = "true"
  }
}

resource "aws_eks_access_entry" "postrix_user" {
  cluster_name      = aws_eks_cluster.postrix.name
  principal_arn     = "arn:aws:iam::384389382109:user/postrix"
  type              = "STANDARD"
  user_name         = "postrix"
}

resource "aws_eks_access_policy_association" "postrix_user_admin" {
  cluster_name  = aws_eks_cluster.postrix.name
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
  principal_arn = "arn:aws:iam::384389382109:user/postrix"

  access_scope {
    type = "cluster"
  }

  depends_on = [aws_eks_access_entry.postrix_user]
}

// TODO: Get this approved
# // Increase quota for ec2 instances
# resource "aws_servicequotas_service_quota" "ec2_fleet" {
#   quota_code   = "L-1216C47A" // Running On-Demand Standard (A, C, D, H, I, M, R, T, Z) instances
#   service_code = "ec2"
#   value        = 3
# }

// Managed node group for the EKS cluster, specifying instance type and scaling
resource "aws_eks_node_group" "postrix_nodes" {
  cluster_name    = aws_eks_cluster.postrix.name
  node_group_name = "${var.cluster_name}-node-group"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = var.subnet_ids  # Use both AZs to match cluster configuration

  scaling_config {
    desired_size = 2
    min_size     = 1
    max_size     = 5
  }

  instance_types = ["t4g.medium"]  // ARM Architecture: 0.8$ per day for on-demand, 0.24$ per day for spot(per node)
  ami_type       = "AL2023_ARM_64_STANDARD"
  capacity_type  = "ON_DEMAND" // Switch back to on-demand for reliability

  launch_template {
    name    = aws_launch_template.postrix_nodes.name
    version = aws_launch_template.postrix_nodes.latest_version
  }

  tags = {
    "k8s.io/cluster-autoscaler/enabled" = "true"
    "k8s.io/cluster-autoscaler/${var.cluster_name}" = "owned"
  }

  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }
}

# Simple launch template for volume naming and type
resource "aws_launch_template" "postrix_nodes" {
  name = "${var.cluster_name}-node-template"

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = 20 // 20GB of gp3: 1.6$ per month(per node)
      volume_type = "gp3"
      delete_on_termination = true
    }
  }

  tag_specifications {
    resource_type = "volume"
    tags = {
      Name = "${var.cluster_name}-node-disk"
    }
  }
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

// IAM policy for External DNS to manage Route 53 records
resource "aws_iam_policy" "external_dns" {
  name        = "${var.cluster_name}-external-dns-policy"
  description = "Policy for External DNS to manage Route 53 records"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "route53:ChangeResourceRecordSets"
        ],
        Resource = [
          "arn:aws:route53:::hostedzone/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "route53:ListHostedZones",
          "route53:ListResourceRecordSets",
          "route53:ListTagsForResource"
        ],
        Resource = [
          "*"
        ]
      }
    ]
  })
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [var.oidc_thumbprint]
  url             = "https://oidc.eks.us-east-1.amazonaws.com/id/27822741B2F3481942B42867BB3425A5"

  tags = {
    "alpha.eksctl.io/cluster-name"   = "postrix"
    "alpha.eksctl.io/eksctl-version" = "0.198.0"
  }
}

# Create IAM role for EBS CSI driver
resource "aws_iam_role" "ebs_csi_driver" {
  name = "${var.cluster_name}-ebs-csi-driver"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub": "system:serviceaccount:kube-system:ebs-csi-controller-sa"
          }
        }
      }
    ]
  })
}

# Attach required AWS managed policy for EBS CSI driver
resource "aws_iam_role_policy_attachment" "ebs_csi_policy" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
  role       = aws_iam_role.ebs_csi_driver.name
}

# Install EBS CSI driver add-on
resource "aws_eks_addon" "ebs_csi" {
  cluster_name = aws_eks_cluster.postrix.name
  addon_name   = "aws-ebs-csi-driver"

  service_account_role_arn = aws_iam_role.ebs_csi_driver.arn
}

resource "aws_iam_role" "cluster_autoscaler" {
  name = "postrix-cluster-autoscaler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(aws_eks_cluster.postrix.identity[0].oidc[0].issuer, "https://", "")}:sub": "system:serviceaccount:kube-system:cluster-autoscaler-aws-cluster-autoscaler"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "cluster_autoscaler" {
  name = "postrix-cluster-autoscaler-policy"
  role = aws_iam_role.cluster_autoscaler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "autoscaling:DescribeAutoScalingGroups",
          "autoscaling:DescribeAutoScalingInstances",
          "autoscaling:DescribeLaunchConfigurations",
          "autoscaling:DescribeTags",
          "autoscaling:SetDesiredCapacity",
          "autoscaling:TerminateInstanceInAutoScalingGroup",
          "ec2:DescribeLaunchTemplateVersions",
          "ec2:DescribeInstanceTypes"
        ]
        Resource = ["*"]
      }
    ]
  })
}

# IAM Role for Postrix pods to access resources on AWS
resource "aws_iam_role" "resources_role" {
  name = "${var.cluster_name}-resources-role"
  
  # Trust relationship policy that allows EKS to assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
      }
    ]
  })
}

# IAM Policy for accessing resources on AWS
resource "aws_iam_policy" "resources_policy" {
  name        = "${var.cluster_name}-resources-policy"
  description = "Policy that allows access to the resources on AWS"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "arn:aws:secretsmanager:us-east-1:384389382109:secret:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::*",  # All buckets
          "arn:aws:s3:::*/*" # All objects in all buckets
        ]
      }
    ]
  })
}

# Attach the policy to the role
resource "aws_iam_role_policy_attachment" "resources_attachment" {
  role       = aws_iam_role.resources_role.name
  policy_arn = aws_iam_policy.resources_policy.arn
}
