variable "project" {}
variable "region" {}
variable "zone" {}
variable "artifactory_repository_id" {}
variable "env" {}
variable "domain" {}
variable "domain_prefix" {}

resource "google_cloud_run_service" "core" {
  provider  = google
  project   = var.project
  name      = "core"
  location  = var.region

  template {
    spec {
      containers {
        image =  "us-docker.pkg.dev/cloudrun/container/hello"

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

  lifecycle {
    ignore_changes = [
      template[0].spec[0].containers[0].image,
    ]
  }
}

resource "google_cloud_run_service_iam_member" "public_invoker" {
  provider = google
  project  = var.project
  service  = google_cloud_run_service.core.name
  location = google_cloud_run_service.core.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_domain_mapping" "core_domain_mapping" {
  provider = google
  project  = var.project
  location = var.region
  name     = "${var.domain_prefix}${var.domain}"

  metadata {
    namespace = var.project
  }
  spec {
    route_name = google_cloud_run_service.core.name
  }
}

# resource "godaddy-dns_record" "cname_core_dev" {
#   depends_on = [google_cloud_run_domain_mapping.core_domain_mapping]

#   provider = godaddy-dns
#   domain = var.domain
#   name = trimsuffix(var.domain_prefix, ".")
#   type = "CNAME"
#   data = "ghs.googlehosted.com"
#   ttl = 600
# }
