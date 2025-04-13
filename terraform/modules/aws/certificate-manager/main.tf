variable "certificates" {
  description = "List of certificate configurations"
  type = list(object({
    domain      = string
    zone_id     = string
    subdomains  = list(string)  # List of subdomains to include, e.g. ["*", "*.dev"]
  }))
}

# Create a single certificate with all domains as SANs
resource "aws_acm_certificate" "combined_cert" {
  domain_name = var.certificates[0].domain
  
  # Use compact to remove null values, then distinct to remove duplicates
  subject_alternative_names = distinct(compact(flatten([
    for cert in var.certificates : concat(
      # Skip the primary domain to avoid duplication
      cert.domain != var.certificates[0].domain ? [cert.domain] : [],
      # Add requested subdomains for this domain
      [for subdomain in cert.subdomains : 
        subdomain == "*" ? "*.${cert.domain}" : 
        "${subdomain}.${cert.domain}"
      ]
    )
  ])))
  
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Create DNS records to validate domain ownership
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.combined_cert.domain_validation_options : dvo.domain_name => {
      name    = dvo.resource_record_name
      record  = dvo.resource_record_value
      type    = dvo.resource_record_type
      zone_id = lookup({
        for cert in var.certificates : cert.domain => cert.zone_id
      }, length(regexall("\\*\\.", dvo.domain_name)) > 0 ? 
         # Extract the base domain from wildcard subdomains
         replace(dvo.domain_name, "/^\\*\\./", "") :
         # For non-wildcard domains, check if it's a subdomain
         length(split(".", dvo.domain_name)) > 2 ?
           # Extract base domain from subdomain (e.g., dev.example.com -> example.com)
           join(".", slice(split(".", dvo.domain_name), 1, length(split(".", dvo.domain_name)))) :
           # Use domain as is
           dvo.domain_name,
      var.certificates[0].zone_id)
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = each.value.zone_id
}

# Wait for certificate validation to complete
resource "aws_acm_certificate_validation" "cert" {
  certificate_arn = aws_acm_certificate.combined_cert.arn
  
  validation_record_fqdns = [
    for record in aws_route53_record.cert_validation : record.fqdn
  ]
}

# Output the certificate ARN
output "certificate_arn" {
  description = "The ARN of the combined certificate"
  value       = aws_acm_certificate.combined_cert.arn
}
