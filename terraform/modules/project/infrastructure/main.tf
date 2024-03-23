variable "project" {}
variable "region" {}
variable "zone" {}
variable "artifactory_repository_id" {}
variable "env" {}

resource "google_project_service" "enable_cloud_resource_manager_api" {
  project = var.project
  service = "cloudresourcemanager.googleapis.com"
}

resource "google_project_service" "enable_artifact_registry_api" {
  project = var.project
  service = "artifactregistry.googleapis.com"
  depends_on = [
    google_project_service.enable_cloud_resource_manager_api,
  ]
}

resource "google_project_service" "enable_cloud_run_api" {
  project = var.project
  service = "run.googleapis.com"
  depends_on = [
    google_project_service.enable_cloud_resource_manager_api,
  ]
}

resource "google_project_service" "enable_iam_api" {
  project = var.project
  service = "iam.googleapis.com"
  depends_on = [
    google_project_service.enable_cloud_resource_manager_api,
  ]
}

resource "google_artifact_registry_repository" "artifact_registry" {
  depends_on = [google_project_service.enable_artifact_registry_api]

  provider      = google
  project       = var.project
  location      = var.region
  repository_id = var.artifactory_repository_id
  format        = "DOCKER"

  cleanup_policies {
    id          = "keep-prod-release"
    action      = "KEEP"

    condition {
      tag_state = "TAGGED"
      tag_prefixes = ["prod"]
    }
  }

  cleanup_policies {
    id          = "keep-minimum-versions"
    action      = "KEEP"

    most_recent_versions {
      keep_count = 5
    }
  }

  cleanup_policies {
    id          = "gc-untagged"
    action      = "DELETE"

    condition {
      tag_state = "UNTAGGED"
      older_than = "2592000s" # 30 days
    }
  }
}

