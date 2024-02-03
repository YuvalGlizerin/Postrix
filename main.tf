provider "google" {
  project = "postrix"
  region  = "us-central1"
}

resource "google_storage_bucket" "cloud_functions_bucket" {
  name     = "postrix-bucket"
  location = "US"
}

resource "google_storage_bucket_object" "hello_world_function_archive" {
  name   = "hello-world.zip"
  bucket = google_storage_bucket.cloud_functions_bucket.name
  source = "hello-world.zip"
}

resource "google_cloudfunctions_function" "hello_world_function" {
  name                  = "hello-world-function"
  description           = "A Hello World Google Cloud Function"
  runtime               = "nodejs20"
  available_memory_mb   = 256
  source_archive_bucket = google_storage_bucket.cloud_functions_bucket.name
  source_archive_object = google_storage_bucket_object.hello_world_function_archive.name
  trigger_http          = true
  entry_point           = "helloWorld"
}

resource "google_cloudfunctions_function_iam_member" "public_invoker" {
  project        = google_cloudfunctions_function.hello_world_function.project
  region         = google_cloudfunctions_function.hello_world_function.region
  cloud_function = google_cloudfunctions_function.hello_world_function.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
}

output "https_trigger_url" {
  value = google_cloudfunctions_function.hello_world_function.https_trigger_url
}
