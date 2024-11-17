resource "tfe_policy" "approval_policy" {
  name              = "require-approval"
  description       = "This policy requires manual approval for all changes"
  organization      = "Postrix"
  kind              = "sentinel"
  policy            = <<POLICY
    import "tfplan/v2" as tfplan

    # Define a rule that requires a manual approval flag to be true
    approval_flag = tfplan.config["manual_approval"]

    # Main rule to enforce manual approval
    main = rule {
        approval_flag is true
    }
  POLICY
  enforce_mode = "hard-mandatory"
}
