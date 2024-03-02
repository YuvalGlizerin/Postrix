output "production_url" {
  value = module.postrix_production.service_url
}

output "sandbox_url" {
  value = module.postrix_sandbox.service_url
}
