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

resource "google_artifact_registry_repository" "my_repository" {
  provider = google

  location      = var.region
  repository_id = "my-docker-repo"
  description   = "Docker repository"
  format        = "DOCKER"

  labels = {
    environment = "production"
  }
}

resource "google_cloud_run_service" "default" {
  name     = "express-app-service"
  location = "us-central1"

  template {
    spec {
      containers {
        image = "gcr.io/${var.project}/express-app:latest"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}
