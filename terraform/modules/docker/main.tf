# resource "docker_access_token" "postrix" {
#   token_label = "Postrix Access Token"
#   scopes      = ["repo:read", "repo:write", "repo:delete"]
# }

# resource "docker_hub_repository" "postrix" {
#   name        = "postrix"
#   namespace   = "yuvadius"
#   description = "Postrix Docker repository"
#   private     = false
# }

# resource "docker_hub_repository" "postrix-dev" {
#   name        = "postrix-dev"
#   namespace   = "yuvadius"
#   description = "Postrix Dev Docker repository"
#   private     = false
# }
