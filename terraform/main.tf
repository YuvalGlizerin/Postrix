# Requires authentication: gcloud auth application-default login

terraform {
  required_providers {
    google = {
      source = "hashicorp/google"
      version = "4.52.0"
    }
  }
}

provider "google" {
  project = var.project
  region  = var.region
  zone    = var.zone
}

resource "google_artifact_registry_repository" "artifact_registry_production" {
  provider      = google
  location      = var.region
  repository_id = "production-docker"
  format        = "DOCKER"
}

resource "google_cloud_run_service" "core" {
  name     = "core-service"
  location = "${var.region}"

  template {
    spec {
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project}/${google_artifact_registry_repository.artifact_registry_production.repository_id}/core:latest"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}
