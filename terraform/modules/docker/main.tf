# The access token was created manually in Docker Hub, not managed by Terraform

resource "docker_hub_repository" "joby" {
  namespace   = var.namespace
  name        = "joby"
  description = "Joby docker repository"
  private     = false
}
