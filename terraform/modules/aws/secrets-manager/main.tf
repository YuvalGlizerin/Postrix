// We manage aws secrets manually in the secrets manager
// We only save the metadata here but not the secret values

resource "aws_secretsmanager_secret" "capish_whatsapp_api" {
  name = "capish-whatsapp-api"
}

resource "aws_secretsmanager_secret_version" "capish_whatsapp_api_version" {
  secret_id     = aws_secretsmanager_secret.capish_whatsapp_api.id
  secret_string = jsonencode({
    phone_id     = "",
    access_token = ""
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret" "postgres" {
  name = "postgres"
}

resource "aws_secretsmanager_secret_version" "postgres_version" {
  secret_id     = aws_secretsmanager_secret.postgres.id
  secret_string = jsonencode({
    username     = "",
    password     = ""
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}