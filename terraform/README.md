# Postrix Terraform

# Secrets Terraform/GitHub

We don't want to store secrets in our repo, so we set them in the UI and then import them to terraform.

# Github Projects

I failed to find a way to create/import a github project via terraform, so we will manage them manually.

# Renaming Terraform Modules

Terraform doesn't support renaming modules, so we need to move the module to the new name and then run `terraform state mv` to update the state.

Example:
```
terraform state mv module.github_general module.github
```
