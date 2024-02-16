# Requires authentication: gcloud auth application-default login

# provider "google" {
#   project = "postrix"
#   region  = "us-central1"
# }

# resource "random_id" "default" {
#   byte_length = 8
# }

# resource "google_storage_bucket" "default" {
#   name                        = "${random_id.default.hex}-gcf-source" # Every bucket name must be globally unique
#   location                    = "US"
#   uniform_bucket_level_access = true
# }

# data "archive_file" "default" {
#   type        = "zip"
#   output_path = "function-source.zip"
#   source_dir  = "./services/core/"
# }
# resource "google_storage_bucket_object" "object" {
#   name   = "function-source.zip"
#   bucket = google_storage_bucket.default.name
#   source = data.archive_file.default.output_path # Add path to the zipped function source code
# }

# resource "google_cloudfunctions2_function" "default" {
#   name        = "function-v2"
#   location    = "us-central1"
#   description = "Core function"

#   build_config {
#     runtime     = "nodejs20"
#     entry_point = "helloWorld2" # Set the entry point
#     source {
#       storage_source {
#         bucket = google_storage_bucket.default.name
#         object = google_storage_bucket_object.object.name
#       }
#     }
#   }

#   service_config {
#     max_instance_count = 1
#     available_memory   = "256M"
#     timeout_seconds    = 60
#   }
# }

# resource "google_cloud_run_service_iam_member" "member" {
#   location = google_cloudfunctions2_function.default.location
#   service  = google_cloudfunctions2_function.default.name
#   role     = "roles/run.invoker"
#   member   = "allUsers"
# }

# output "function_uri" {
#   value = google_cloudfunctions2_function.default.service_config[0].uri
# }







provider "google" {
  project = "postrix"
  region  = "us-central1"
}

resource "random_id" "default" {
  byte_length = 8
}

resource "google_storage_bucket" "cloud_functions_bucket" {
  name     = "postrix-bucket-${random_id.default.hex}"
  location = "US"
}

resource "google_storage_bucket_object" "hello_world_function_archive" {
  name   = "function-source-${random_id.default.hex}.zip"
  bucket = google_storage_bucket.cloud_functions_bucket.name
  source = "function-source.zip"
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
