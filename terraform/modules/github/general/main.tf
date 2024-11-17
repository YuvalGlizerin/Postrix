variable "domain" {
  description = "The domain name"
  type        = string
}

resource "github_repository" "repo" {
  name        = "Postrix"
  description = "Open source infrastructure project"
  visibility  = "public"
  homepage_url = var.domain

  has_downloads = true
  has_issues = true
  has_projects = true
  vulnerability_alerts = true
}
