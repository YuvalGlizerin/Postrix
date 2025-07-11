resource "aws_s3_bucket" "test_reports" {
  bucket = "postrix-test-reports"
}

resource "aws_s3_bucket_public_access_block" "test_reports" {
  bucket = aws_s3_bucket.test_reports.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_website_configuration" "test_reports" {
  bucket = aws_s3_bucket.test_reports.id

  index_document {
    suffix = "test-report.html"
  }

  depends_on = [aws_s3_bucket_public_access_block.test_reports]
}

resource "aws_s3_bucket_policy" "test_reports" {
  bucket = aws_s3_bucket.test_reports.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.test_reports.arn}/*"
      },
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.test_reports]
}

# S3 bucket for storing Capish video files
resource "aws_s3_bucket" "capish_videos" {
  bucket = "capish-videos"
}

# Make the bucket publicly accessible
resource "aws_s3_bucket_public_access_block" "capish_videos_access" {
  bucket = aws_s3_bucket.capish_videos.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Add a public bucket policy
resource "aws_s3_bucket_policy" "capish_videos_policy" {
  bucket = aws_s3_bucket.capish_videos.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.capish_videos.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.capish_videos_access]
}

# S3 bucket for storing PostgreSQL backups
resource "aws_s3_bucket" "postgresql_backups" {
  bucket = "postrix-postgresql-backups"
}

# Lifecycle configuration for PostgreSQL backups bucket
resource "aws_s3_bucket_lifecycle_configuration" "postgresql_backups" {
  bucket = aws_s3_bucket.postgresql_backups.id

  rule {
    id     = "expire_after_30_days"
    status = "Enabled"

    filter {}

    expiration {
      days = 30
    }
  }
}
