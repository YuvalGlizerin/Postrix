resource "tfe_organization" "postrix" {
  name                                = "Postrix"
  email                               = "yuval.glizerin@postrix.io"
  speculative_plan_management_enabled = false
}

resource "tfe_workspace" "postrix" {
  name                    = "Postrix"
  organization            = tfe_organization.postrix.name
  file_triggers_enabled   = false
  queue_all_runs          = false
}
