variable "project" {}
variable "region" {}
variable "zone" {}
variable "artifactory_repository_id" {}
variable "env" {}

resource "google_artifact_registry_repository" "artifact_registry" {
  provider      = google
  project       = var.project
  location      = var.region
  repository_id = var.artifactory_repository_id
  format        = "DOCKER"
}
