# The access token was created manually in Docker Hub, not managed by Terraform

resource "docker_hub_repository" "core" {
  namespace   = var.namespace
  name        = "core"
  description = "Core docker repository"
  private     = false
}
