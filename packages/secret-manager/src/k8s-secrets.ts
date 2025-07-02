/* eslint-disable no-console */ // Cannot use logger yet because I need to get the secrets first to initialize it
import * as fs from 'fs';

import * as k8s from '@kubernetes/client-node';

const secrets: Record<string, string> = {};
const clusterName = process.env.CLUSTER_NAME as string;
let k8sApi: k8s.CoreV1Api | null = null;
const kc = new k8s.KubeConfig();
const inCluster = fs.existsSync('/var/run/secrets/kubernetes.io/serviceaccount/token');

try {
  if (!inCluster) {
    // Local mode: use kubeconfig and set context to cluster
    kc.loadFromDefault();

    // Find and set context to specified cluster
    const targetContext = kc
      .getContexts()
      .find(context => context.name.includes(clusterName) || context.cluster.includes(clusterName));

    if (targetContext) {
      kc.setCurrentContext(targetContext.name);
      console.log(`Using Kubernetes context: ${targetContext.name}`);
    } else {
      console.warn(`${clusterName} cluster context not found. Available contexts:`, {
        contexts: kc
          .getContexts()
          .map(c => c.name)
          .join(', ')
      });
      console.warn('Falling back to current context. You may want to check your kubeconfig.');
    }
  } else {
    // Production mode: use in-cluster config (service account)
    kc.loadFromCluster();
    console.log('Using in-cluster Kubernetes config');
  }

  k8sApi = kc.makeApiClient(k8s.CoreV1Api);
} catch (error) {
  if (!inCluster) {
    console.error(
      `Failed to load Kubernetes config. Make sure kubectl is configured and you have access to the ${clusterName} cluster:`,
      { error }
    );
  } else {
    console.error('Failed to load in-cluster Kubernetes config. Ensure service account has proper RBAC permissions:', {
      error
    });
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
    console.error(`Failed to load secret ${secretName}/${secretKey} from Kubernetes API:`, { error });
  }
};

// Note: We now use Kubernetes API for both local and production modes
// No filesystem-based secret loading needed

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

      // Use Kubernetes API for both local and production modes
      await loadSecretFromAPI(namespace, secretName, secretKey, key);
    } catch (error) {
      console.error(`Failed to load secret for ${key}:`, { error });
    }
  });

await Promise.all(secretPromises);

export default secrets;
