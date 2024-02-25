output "url" {
  value = google_cloud_run_service.core.status[0].url
}