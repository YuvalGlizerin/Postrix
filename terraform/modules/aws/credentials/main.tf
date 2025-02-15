resource "aws_iam_user" "postrix" {
  name = "postrix"
}

resource "aws_iam_user_policy_attachment" "admin" {
  user       = aws_iam_user.postrix.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_access_key" "postrix" {
  user    = aws_iam_user.postrix.name
  status  = "Active"
}

# IAM Role for GitHub Actions
resource "aws_iam_role" "github_actions" {
  name = "github-actions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::384389382109:oidc-provider/token.actions.githubusercontent.com"
        }
        Condition = {
          StringLike = {
            "token.actions.githubusercontent.com:sub": "repo:YuvalGlizerin/Postrix:*"
          }
          StringEquals = {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
          }
        }
      }
    ]
  })
}

resource "aws_eks_access_entry" "github_actions" {
  cluster_name  = "postrix"
  principal_arn = aws_iam_role.github_actions.arn
  type          = "STANDARD"
  user_name     = "github-actions"
}

resource "aws_eks_access_policy_association" "github_actions_admin" {
  cluster_name  = "postrix"
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
  principal_arn = aws_iam_role.github_actions.arn

  access_scope {
    type = "cluster"
  }

  depends_on = [aws_eks_access_entry.github_actions]
}

resource "aws_iam_role_policy" "github_actions_policy" {
  name = "github-actions-policy"
  role = aws_iam_role.github_actions.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters",
          "eks:AccessKubernetesApi"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "github_actions_s3_policy" {
  name = "github-actions-s3-policy"
  role = aws_iam_role.github_actions.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::postrix-test-reports",
          "arn:aws:s3:::postrix-test-reports/*"
        ]
      }
    ]
  })
}

# Create the OIDC provider for GitHub Actions
resource "aws_iam_openid_connect_provider" "github_actions" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}