# The access token was created manually in Docker Hub, not managed by Terraform

resource "docker_hub_repository" "postrix" {
  name        = "postrix"
  namespace   = "yuvadius"
  description = "Postrix Docker repository"
  private     = false
}

resource "docker_hub_repository" "postrix-dev" {
  name        = "postrix-dev"
  namespace   = "yuvadius"
  description = "Postrix Development Docker repository"
  private     = false
}
