# Fluent Bit Log Collection

This directory contains the configuration for Fluent Bit, which collects logs from all Kubernetes pods and sends them to Elasticsearch.

## Overview

Fluent Bit is deployed as a DaemonSet in the `elastic` namespace, ensuring it runs on every node in the cluster to collect logs from all pods.

## Architecture

- **Deployment Type**: DaemonSet (one pod per node)
- **Namespace**: `elastic` (same as Elasticsearch for easy secret access)
- **Helm Chart**: Official Fluent Bit chart from [fluent.github.io/helm-charts](https://fluent.github.io/helm-charts)
- **Documentation**: https://docs.fluentbit.io/manual/installation/downloads/kubernetes

## Configuration

### Input
- Collects logs from `/var/log/containers/*.log`
- Uses `docker` and `cri` multiline parsers
- 5MB memory buffer limit per file

### Processing
- Adds Kubernetes metadata (pod name, namespace, labels, annotations)
- Merges JSON log lines
- Enriches logs with pod and container information

### Output
- **Destination**: Elasticsearch in the `elastic` namespace
- **Host**: `elasticsearch.elastic.svc.cluster.local:9200`
- **Authentication**: Uses `elasticsearch-auth` secret
- **Index Pattern**: `kubernetes-YYYY.MM.DD`
- **Format**: Logstash format with Kubernetes prefix

## Access Logs

### Via Elasticsearch API
```bash
# Get indices
kubectl exec -n elastic elasticsearch-master-0 -- \
  curl -k -u elastic:PASSWORD \
  https://localhost:9200/_cat/indices/kubernetes-*?v

# Search logs
kubectl exec -n elastic elasticsearch-master-0 -- \
  curl -k -u elastic:PASSWORD \
  https://localhost:9200/kubernetes-*/_search?size=10
```

### Via Kibana
Access Kibana at `https://kibana.postrix.io` to visualize and search logs with a web interface.

## Monitoring

Check Fluent Bit status:
```bash
# View pods
kubectl get pods -n elastic -l app.kubernetes.io/name=fluent-bit

# Check logs
kubectl logs -n elastic -l app.kubernetes.io/name=fluent-bit --tail=50

# View metrics
kubectl port-forward -n elastic svc/fluent-bit 2020:2020
curl http://localhost:2020/api/v1/metrics
```

## Deployment

Deploy or update:
```bash
cd /Users/yuvadius/Desktop/Postrix/kubernetes
helmfile sync -l app=fluent-bit
```

## Troubleshooting

### Pods Not Starting
Check events:
```bash
kubectl describe pod -n elastic <pod-name>
```

### Logs Not Appearing in Elasticsearch
1. Check Fluent Bit logs for errors:
   ```bash
   kubectl logs -n elastic -l app.kubernetes.io/name=fluent-bit --tail=100
   ```

2. Verify Elasticsearch connectivity:
   ```bash
   kubectl exec -n elastic <fluent-bit-pod> -- \
     curl -k https://elasticsearch.elastic.svc.cluster.local:9200
   ```

3. Check indices:
   ```bash
   kubectl exec -n elastic elasticsearch-master-0 -- \
     curl -k -u elastic:PASSWORD \
     https://localhost:9200/_cat/indices?v
   ```

### High Memory Usage
Adjust `resources.limits.memory` in `values/defaults.yaml`

## Configuration Files

- `values/defaults.yaml`: Main configuration
- Referenced in `helmfile.yaml` for deployment

