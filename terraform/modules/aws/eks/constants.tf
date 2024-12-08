// Generated using `openssl s_client -connect oidc.eks.us-east-1.amazonaws.com:443 -servername oidc.eks.us-east-1.amazonaws.com < /dev/null 2>/dev/null | openssl x509 -fingerprint -noout | cut -d= -f2 | sed 's/://g'`
variable "oidc_thumbprint" {
  description = "The thumbprint of the OIDC provider's certificate"
  type        = string
  default     = "9451AD2B53C7F41FAB22886CC07D482085336561"
}
