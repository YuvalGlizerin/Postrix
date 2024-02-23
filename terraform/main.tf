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

resource "google_cloudfunctions_function" "core" {
  name                  = "core"
  runtime               = var.runtime
  available_memory_mb   = 256
  trigger_http          = true
  min_instances         = 1
  max_instances         = 1
}
