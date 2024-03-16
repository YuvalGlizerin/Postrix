output "repository_url" {
  value = "https://${var.region}-docker.pkg.dev/${var.project}/${var.artifactory_repository_id}"
}