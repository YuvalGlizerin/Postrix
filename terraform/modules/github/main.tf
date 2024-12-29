variable "domain" {
  description = "The domain name"
  type        = string
}

resource "github_repository" "repo" {
  name            = var.repo_name
  description     = "Open source infrastructure project"
  visibility      = "public"
  homepage_url    = var.domain

  has_downloads       = true
  has_issues          = true
  has_projects        = true
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

  enforce_admins = true
}

resource "github_repository_collaborator" "yuval-eb" {
  repository = github_repository.repo.name
  username   = "yuvalglizerin-eb"
  permission = "admin"
}

# Failed to create/import project via terraform, resource will be managed manually
# resource "github_repository_project" "project" {
#   name       = "Postrix"
#   repository = github_repository.repo.id
# }

resource "github_actions_secret" "terraform_api_token" {
  repository      = github_repository.repo.name
  secret_name     = "TERRAFORM_API_TOKEN"
}

resource "github_actions_secret" "docker_hub_username" {
  repository      = github_repository.repo.name
  secret_name     = "DOCKER_USERNAME"
}

resource "github_actions_secret" "docker_hub_password" {
  repository      = github_repository.repo.name
  secret_name     = "DOCKER_PASSWORD"
}
