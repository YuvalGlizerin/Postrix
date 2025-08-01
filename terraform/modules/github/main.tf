variable "domain" {
  description = "The domain name"
  type        = string
}

resource "github_repository" "repo" {
  name            = var.repo_name
  description     = "Open source infrastructure project"
  visibility      = "public"
  homepage_url    = var.domain
  has_downloads   = true
  has_issues      = true
  has_projects    = true
  vulnerability_alerts = true
}

resource "github_branch" "main" {
  repository = github_repository.repo.name
  branch     = "main"
}

resource "github_branch_default" "default"{
  repository = github_repository.repo.name
  branch     = github_branch.main.branch
}

resource "github_branch_protection" "main" {
  repository_id = github_repository.repo.name
  pattern       = github_branch.main.branch

  required_pull_request_reviews {
    require_last_push_approval = false
    dismiss_stale_reviews = false
    require_code_owner_reviews = false
    required_approving_review_count = 0
  }

  enforce_admins = false
}

resource "github_repository_collaborator" "yuval-eb" {
  repository = github_repository.repo.name
  username   = "yuvalglizerin-eb"
  permission = "admin"
}

resource "github_repository_collaborator" "ilia-gl" {
  repository = github_repository.repo.name
  username   = "ilia-gl"
  permission = "push"
}

# Failed to create/import project via terraform, resource will be managed manually
# resource "github_repository_project" "project" {
#   name       = "Postrix"
#   repository = github_repository.repo.id
# }

resource "github_actions_secret" "terraform_api_token" {
  repository      = github_repository.repo.name
  secret_name     = "TERRAFORM_API_TOKEN"
  encrypted_value = "Ohpp08TDrx0/9cy4wt8MXa6bFaCwCHu01hPBesiwanws0Oz4wW+7xLHvZFEyAtTdybpXlWhI98RshXcjp/mxkgoxObtmozwV8M8Ty+xQOTWMjZj0kBQp2wzasYBpMcy8Z+sGEZ/GeZ0b1r9W1Rl/o/AYcQ6Tdd/ZdnFpXhWGt6f+YR+dz6MibEed"
}

resource "github_actions_secret" "docker_username" {
  repository      = github_repository.repo.name
  secret_name     = "DOCKER_USERNAME"
  encrypted_value = "1Itgr11awBCI7VJ+hwH+tNG8fO9A0WqW/T42BRfT5yLk9f7TqNEyk6tFGT7msNQBvZTejhnfxRY="
}

resource "github_actions_secret" "docker_password" {
  repository      = github_repository.repo.name
  secret_name     = "DOCKER_PASSWORD"
  encrypted_value = "G4zAqUUMSPw8le1RNmJBNR1uh0UeEkrBTBpaeVNKo3VkaBoTKD6iTQ+W4M/3OtFmAd4SpnS0UqeyzhkVZyw1vUT8s+Z5J0pLoWtzH0MEIMS4TwFN"
}

resource "github_actions_secret" "database_instance_url" {
  repository      = github_repository.repo.name
  secret_name     = "DATABASE_INSTANCE_URL"
  encrypted_value = "p8nxvspcuzzQC+KcDvQstqnxwTO8ZLKrK/+A/YLl/UXzuhIBUl/zcfsb/DiRqmHt/+KwKHjqEsYDrmrncV928OMpUmeq3y6D34YutyXsso5G2JOXBmz6/ZBSxg4rUTsR8/IZ8VN7ApXQJkk="
}

resource "github_actions_secret" "database_instance_password" {
  repository      = github_repository.repo.name
  secret_name     = "DATABASE_INSTANCE_PASSWORD"
  encrypted_value = "vZ1D2EQe5APae0oQb1UGygB/Pc9gA77hXTrPF9NXJztnMVAduH4VVFahp/8Oy3GNpnfOh0Xo33kGpg=="
}

resource "github_actions_secret" "aws_access_key_id" {
  repository      = github_repository.repo.name
  secret_name     = "AWS_ACCESS_KEY_ID"
  encrypted_value = "3YUXE5WuoGWn5PYzWvyT4kSshYgfwPAadnzVnm7O/SPrJxS4jIbwaiPgS5xK7dyOZRfcy+m6+uAo8rv7XAVlV8X+H6k="
}

resource "github_actions_secret" "aws_secret_access_key" {
  repository      = github_repository.repo.name
  secret_name     = "AWS_SECRET_ACCESS_KEY"
  encrypted_value = "kGWgjInJ3EafZdbQol7QmPodZYOlFRw58X1yFD37OC9+3wpTF4UWgrLK8DoIRAEXKa+O+9GNBm5LYrAyvr5n16AfJVcvMh19S+Oj0n9GDRcM0iqnawtMxg=="
}
