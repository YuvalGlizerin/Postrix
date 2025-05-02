import { fromIni } from '@aws-sdk/credential-providers';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secrets: Record<string, string> = {};

const secretsClient = new SecretsManagerClient({
  region: 'us-east-1',
  ...(process.env.ENV === 'local' ? { credentials: fromIni() } : {})
});

for (const [key, value] of Object.entries(process.env)) {
  if (!value?.startsWith('/secrets/')) {
    continue;
  }

  try {
    // Extract the secret path without the '/secrets/' prefix
    const parts = value.substring('/secrets/'.length).split('/');
    const secretBase = parts[0];
    const secretKey = parts[1];

    // Fetch the secret from AWS Secrets Manager
    const command = new GetSecretValueCommand({ SecretId: secretBase });
    const response = await secretsClient.send(command);

    if (response.SecretString) {
      const { [secretKey]: secretValue } = JSON.parse(response.SecretString);
      secrets[key] = secretValue;
      console.log(`Secret loaded for ${key}`);
    }
  } catch (error) {
    console.error(`Failed to load secret for ${key}:`, error);
  }
}

export default secrets;
