#!/usr/bin/env node

/*
Step 1, Get the public key from the github repo settings:
  gh api -H "Accept: application/vnd.github+json" /repos/YuvalGlizerin/Postrix/actions/secrets/public-key

Step 2, Encrypt the secret value:
  ts-node encrypt-github-secret.ts <public_key> <secret_value>

Step 3, Update the terraform file with the encrypted value for example:
  github_actions_secret "docker_password" {
    repository      = github_repository.repo.name
    secret_name     = "DOCKER_PASSWORD"
    encrypted_value = "1Itgr11awBCI7VJ+hwH+tNG8fO9A0WqW/T42BRfT5yLk9f7TqNEyk6tFGT7msNQBvZTejhnfxRY="
  }
*/

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sodium = require('tweetnacl-sealedbox-js');

function encrypt(publicKey: string, secretValue: string): string {
  try {
    // Convert the public key from base64 to Uint8Array
    const keyBytes = Buffer.from(publicKey, 'base64');

    // Convert the secret value to Uint8Array
    const messageBytes = Buffer.from(secretValue);

    // Encrypt the secret
    const encryptedBytes = sodium.seal(messageBytes, keyBytes);

    // Return base64 encoded encrypted value
    return Buffer.from(encryptedBytes).toString('base64');
  } catch (error) {
    console.error('Encryption failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Get the values from command line
const publicKey = process.argv[2];
const secretValue = process.argv[3];

if (!publicKey || !secretValue) {
  console.error('Usage: ts-node encrypt-github-secret.ts <public_key> <secret_value>');
  process.exit(1);
}

console.log(encrypt(publicKey, secretValue));
