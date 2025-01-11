# Postrix Terraform

# Secrets Terraform/GitHub

We don't want to store secrets in our repo, so we set them in the UI and then import them to terraform.

# Github Secrets

When changing the secret manually on the website, terraform recognizes changes to the secrets and re-applies them on the next terraform apply.
This is nothing to worry about, since it will not change the value so it is an empty apply run that you will need to only run once.

# Github Projects

I failed to find a way to create/import a github project via terraform, so we will manage them manually.

# Import example

```
terraform import module.aws_credentials.aws_iam_access_key.postrix <resource_id>
```

# Renaming Terraform Modules

Terraform doesn't support renaming modules, so we need to move the module to the new name and then run `terraform state mv` to update the state.

Example:
```
terraform state mv module.github_general module.github
```
