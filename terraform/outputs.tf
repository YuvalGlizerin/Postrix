output "production_url" {
  value = module.core["production"].service_url
}

output "sandbox_url" {
  value = module.core["development"].service_url
}
