import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import * as k8s from '@kubernetes/client-node';

const secrets: Record<string, string> = {};
const isLocal = process.env.ENV === 'local';
const clusterName = process.env.CLUSTER_NAME as string;
const K8S_SECRETS_BASE_PATH = process.env.K8S_SECRETS_BASE_PATH || '/var/run/secrets';
let k8sApi: k8s.CoreV1Api | null = null;

try {
  const kc = new k8s.KubeConfig();

  if (isLocal) {
    // Local mode: use kubeconfig and set context to postrix cluster specifically
    kc.loadFromDefault();

    // Find and set context to postrix cluster
    const postrixContext = kc
      .getContexts()
      .find(context => context.name.includes(clusterName) || context.cluster.includes(clusterName));

    if (postrixContext) {
      kc.setCurrentContext(postrixContext.name);
      console.log(`Using Kubernetes context: ${postrixContext.name}`);
    } else {
      console.warn(
        'Postrix cluster context not found. Available contexts:',
        kc
          .getContexts()
          .map(c => c.name)
          .join(', ')
      );
      console.warn('Falling back to current context. You may want to check your kubeconfig.');
    }
  } else {
    // Production mode: use in-cluster config (service account)
    kc.loadFromCluster();
  }

  k8sApi = kc.makeApiClient(k8s.CoreV1Api);
} catch (error) {
  if (isLocal) {
    console.error(
      'Failed to load Kubernetes config. Make sure kubectl is configured and you have access to the postrix cluster:',
      error
    );
  } else {
    console.error('Failed to load in-cluster Kubernetes config:', error);
  }
}

// Function to load secret from Kubernetes API (for local development)
const loadSecretFromAPI = async (
  namespace: string,
  secretName: string,
  secretKey: string,
  envKey: string
): Promise<void> => {
  if (!k8sApi) {
    console.error(`Cannot load secret ${envKey}: Kubernetes API client not available`);
    return;
  }

  try {
    const response = await k8sApi.readNamespacedSecret({
      name: secretName,
      namespace: namespace
    });

    if (response.data && response.data[secretKey]) {
      // Kubernetes secrets are base64 encoded
      const secretValue = Buffer.from(response.data[secretKey], 'base64').toString('utf8');
      secrets[envKey] = secretValue;
      console.log(`Secret loaded for ${envKey} from Kubernetes API (secret: ${secretName}/${secretKey})`);
    } else {
      console.error(`Secret key '${secretKey}' not found in secret '${secretName}' in namespace '${namespace}'`);
    }
  } catch (error) {
    console.error(`Failed to load secret ${secretName}/${secretKey} from Kubernetes API:`, error);
  }
};

// Function to load secret from filesystem (for production)
const loadSecretFromFile = async (secretName: string, secretKey: string, envKey: string): Promise<void> => {
  try {
    const filePath = join(K8S_SECRETS_BASE_PATH, secretName, secretKey);

    if (!existsSync(filePath)) {
      console.error(`Secret file not found for ${envKey}: ${filePath}`);
      return;
    }

    const secretValue = readFileSync(filePath, 'utf8').trim();
    secrets[envKey] = secretValue;
    console.log(`Secret loaded for ${envKey} from file: ${filePath}`);
  } catch (error) {
    console.error(`Failed to load secret file for ${envKey}:`, error);
  }
};

// Create an array of promises for secret loading
const secretPromises = Object.entries(process.env)
  .filter(([, value]) => value?.startsWith('/k8s-secrets/'))
  .map(async ([key, value]) => {
    try {
      // Extract the secret path without the '/k8s-secrets/' prefix
      // Expected format: /k8s-secrets/namespace/secret-name/key-name
      const secretPath = value!.substring('/k8s-secrets/'.length);
      const parts = secretPath.split('/');

      if (parts.length < 3) {
        console.error(
          `Invalid secret path format for ${key}: ${value}. Expected format: /k8s-secrets/namespace/secret-name/key-name`
        );
        return;
      }

      const namespace = parts[0];
      const secretName = parts[1];
      const secretKey = parts[2];

      if (isLocal) {
        // Local mode: fetch from Kubernetes API
        await loadSecretFromAPI(namespace, secretName, secretKey, key);
      } else {
        // Production mode: read from mounted filesystem
        await loadSecretFromFile(secretName, secretKey, key);
      }
    } catch (error) {
      console.error(`Failed to load secret for ${key}:`, error);
    }
  });

await Promise.all(secretPromises);

export default secrets;
