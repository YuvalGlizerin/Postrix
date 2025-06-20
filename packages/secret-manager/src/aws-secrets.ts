/* eslint-disable no-console */ // Cannot use logger yet because I need to get the secrets first to initialize it
import { fromIni } from '@aws-sdk/credential-providers';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secrets: Record<string, string> = {};

const secretsClient = new SecretsManagerClient({
  region: 'us-east-1',
  ...(process.env.IS_LOCAL_DEV === 'true' ? { credentials: fromIni() } : {})
});

// Create an array of promises for secret fetching
const secretPromises = Object.entries(process.env)
  .filter(([, value]) => value?.startsWith('/aws-secrets/'))
  .map(async ([key, value]) => {
    try {
      // Extract the secret path without the '/aws-secrets/' prefix
      const parts = value!.substring('/aws-secrets/'.length).split('/');
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
  });

await Promise.all(secretPromises);

export default secrets;
