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

resource "google_cloud_run_service" "core" {
  provider  = google
  project   = var.project
  name      = "core-service"
  location  = var.region

  template {
    spec {
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project}/${var.artifactory_repository_id}/core:latest"

        env {
          name  = "ENV"
          value = var.env
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  autogenerate_revision_name = true
}

resource "google_cloud_run_service_iam_member" "public_invoker" {
  service  = google_cloud_run_service.core.name
  location = google_cloud_run_service.core.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
