# The access token was created manually in Docker Hub, not managed by Terraform

resource "docker_hub_repository" "joby" {
  namespace   = var.namespace
  name        = "joby"
  description = "Joby docker repository"
  private     = false
}

resource "docker_hub_repository" "capish" {
  namespace   = var.namespace
  name        = "capish"
  description = "Capish docker repository"
  private     = false
}

resource "docker_hub_repository" "cannon" {
  namespace   = var.namespace
  name        = "cannon"
  description = "Cannon docker repository"
  private     = false
}