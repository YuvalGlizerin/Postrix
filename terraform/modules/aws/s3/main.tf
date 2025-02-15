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
    suffix = "index.html"
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

output "test_reports_bucket_website_endpoint" {
  value = "http://${aws_s3_bucket.test_reports.bucket}.s3-website-${data.aws_region.current.name}.amazonaws.com"
}

data "aws_region" "current" {}
