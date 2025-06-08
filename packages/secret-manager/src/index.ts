import awsSecrets from './aws-secrets.ts';
import k8sSecrets from './k8s-secrets.ts';

const secrets = { ...awsSecrets, ...k8sSecrets };

export default secrets;
