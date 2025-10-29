function isRunningInCluster() {
  return process.env.KUBERNETES_SERVICE_HOST !== undefined;
}

const utils = { isRunningInCluster };

export default utils;
