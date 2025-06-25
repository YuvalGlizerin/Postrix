# The access token was created manually in Docker Hub, not managed by Terraform

resource "docker_hub_repository" "whatsapp" {
  namespace   = var.namespace
  name        = "whatsapp"
  description = "Whatsapp docker repository"
  private     = false
}

resource "docker_hub_repository" "cannon" {
  namespace   = var.namespace
  name        = "cannon"
  description = "Cannon docker repository"
  private     = false
}