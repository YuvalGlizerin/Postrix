resource "tfe_organization" "postrix" {
  name                                = var.organization_name
  email                               = var.owner_email
  speculative_plan_management_enabled = false
}

resource "tfe_organization_default_settings" "org_default" {
  organization           = tfe_organization.postrix.name
  default_execution_mode = "remote"
}

resource "tfe_organization_membership" "yuval" {
  organization  = tfe_organization.postrix.name
  email         = var.owner_email
}

resource "tfe_organization_membership" "yuval-eb" {
  organization  = tfe_organization.postrix.name
  email         = "yuvalgliz@equitybee.com"
}

resource "tfe_team" "owners" {
  name         = "owners"
  organization = tfe_organization.postrix.name
}

resource "tfe_team_organization_member" "yuval" {
  team_id = tfe_team.owners.id
  organization_membership_id = tfe_organization_membership.yuval.id
}

resource "tfe_team_organization_member" "yuval-eb" {
  team_id = tfe_team.owners.id
  organization_membership_id = tfe_organization_membership.yuval-eb.id
}

resource "tfe_project" "postrix" {
  organization = tfe_organization.postrix.name
  name         = var.project_name
}

resource "tfe_workspace" "postrix" {
  name                    = var.workspace_name
  organization            = tfe_organization.postrix.name
  file_triggers_enabled   = false
  queue_all_runs          = false
}

resource "tfe_workspace_settings" "postrix" {
  workspace_id   = tfe_workspace.postrix.id
  execution_mode = "remote"
}

resource "tfe_variable_set" "terraform_credentials" {
  name          = "Terraform Credentials"
  organization  = tfe_organization.postrix.name
  global        = true
}

resource "tfe_variable" "tfe_token" {
  key             = "TFE_TOKEN"
  category        = "env"
  sensitive       = true # value not tracked if sensitive is true
  variable_set_id = tfe_variable_set.terraform_credentials.id
}

resource "tfe_variable_set" "aws_credentials" {
  name          = "AWS Credentials"
  organization  = tfe_organization.postrix.name
  global        = true
}

resource "tfe_variable" "aws_access_key_id" {
  key             = "AWS_ACCESS_KEY_ID"
  category        = "env"
  sensitive       = true # value not tracked if sensitive is true
  variable_set_id = tfe_variable_set.aws_credentials.id
}

resource "tfe_variable" "aws_secret_access_key" {
  key             = "AWS_SECRET_ACCESS_KEY"
  category        = "env"
  sensitive       = true # value not tracked if sensitive is true
  variable_set_id = tfe_variable_set.aws_credentials.id
}

resource "tfe_variable_set" "github_credentials" {
  name          = "GitHub Credentials"
  organization  = tfe_organization.postrix.name
  global        = true
}

resource "tfe_variable" "github_token" {
  key             = "GITHUB_TOKEN"
  category        = "env"
  sensitive       = true # value not tracked if sensitive is true
  variable_set_id = tfe_variable_set.github_credentials.id
}
