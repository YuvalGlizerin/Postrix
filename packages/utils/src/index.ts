function isRunningInCluster() {
  return process.env.KUBERNETES_SERVICE_HOST !== undefined;
}

function isAdhoc() {
  return process.env.NAMESPACE?.endsWith('-adhoc');
}

const utils = { isRunningInCluster, isAdhoc };

export default utils;
