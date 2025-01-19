#!/usr/bin/env python3

'''
Step 1, Get the public key from the github repo settings:
  gh api -H "Accept: application/vnd.github+json" /repos/YuvalGlizerin/Postrix/actions/secrets/public-key

Step 2, Encrypt the secret value:
  python3 encrypt-github-secret.py <public_key> <secret_value>

Step 3, Update the terraform file with the encrypted value for example:
  github_actions_secret "docker_password" {
    repository      = github_repository.repo.name
    secret_name     = "DOCKER_PASSWORD"
    encrypted_value = "1Itgr11awBCI7VJ+hwH+tNG8fO9A0WqW/T42BRfT5yLk9f7TqNEyk6tFGT7msNQBvZTejhnfxRY="
  }
'''
import sys
from base64 import b64encode
from nacl import encoding, public

def encrypt(public_key: str, secret_value: str) -> str:
    """Encrypt a secret using libsodium"""
    public_key = public.PublicKey(public_key.encode("utf-8"), encoding.Base64Encoder())
    sealed_box = public.SealedBox(public_key)
    encrypted = sealed_box.encrypt(secret_value.encode("utf-8"))
    return b64encode(encrypted).decode("utf-8")

# Get the values from command line
public_key = sys.argv[1]
secret_value = sys.argv[2]

print(encrypt(public_key, secret_value))