variable "domain" {
  description = "The domain name"
  type        = string
}

variable "zone_id" {
  description = "The Route53 zone ID"
  type        = string
}

resource "aws_acm_certificate" "cert" {
  domain_name       = var.domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# 2. Create DNS records to validate domain ownership
resource "aws_route53_record" "cert_validation" {
  # Create a record for each domain validation option
  for_each = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true                # Allow overwriting existing records
  name            = each.value.name     # DNS record name
  records         = [each.value.record] # DNS record value
  ttl             = 60                  # Time to live in seconds
  type            = each.value.type     # Record type (usually CNAME)
  zone_id         = var.zone_id  # Your hosted zone
}

# 3. Wait for certificate validation to complete
resource "aws_acm_certificate_validation" "cert" {
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
