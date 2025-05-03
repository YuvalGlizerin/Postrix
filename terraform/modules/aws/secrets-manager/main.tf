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
    password     = "",
    host         = "",
    port         = ""
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret" "redis" {
  name = "redis"
}

resource "aws_secretsmanager_secret_version" "redis_version" {
  secret_id     = aws_secretsmanager_secret.redis.id
  secret_string = jsonencode({
    password     = ""
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret" "elasticsearch" {
  name = "elasticsearch"
}

resource "aws_secretsmanager_secret_version" "elasticsearch_version" {
  secret_id     = aws_secretsmanager_secret.elasticsearch.id
  secret_string = jsonencode({
    password     = ""
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret" "creatomate" {
  name = "creatomate"
}

resource "aws_secretsmanager_secret_version" "creatomate_version" {
  secret_id     = aws_secretsmanager_secret.creatomate.id
  secret_string = jsonencode({
    api_key     = "",
    api_key_trial = ""
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}
