variable "project" {}
variable "region" {}
variable "zone" {}
variable "artifactory_repository_id" {}
variable "env" {}

resource "google_project_service" "enable_artifact_registry_api" {
  service = "artifactregistry.googleapis.com"
  project = var.project
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

