output "production_repository_url" {
  value = module.infrastructure["production"].repository_url
}

output "development_repository_url" {
  value = module.infrastructure["development"].repository_url
}

output "production_core_url" {
  value = module.core["production"].service_url
}

output "development_core_url" {
  value = module.core["development"].service_url
}
