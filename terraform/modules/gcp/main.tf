# Create a test storage bucket
# You can remove this after you add some real resources to the project
resource "google_storage_bucket" "terraform_test" {
  name          = "postrix-terraform-test-${var.project_id}"
  location      = var.region
  force_destroy = true  # Allow Terraform to destroy bucket even if it contains objects

  uniform_bucket_level_access = true

  labels = {
    managed_by = "terraform"
    purpose    = "test"
  }
}
