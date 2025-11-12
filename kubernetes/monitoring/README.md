# Prometheus & Grafana Stack

This deployment uses the `kube-prometheus-stack` Helm chart, which includes:
- **Prometheus** - Metrics collection and storage
- **Grafana** - Visualization and dashboards
- **AlertManager** - Alert management and routing
- **Node Exporter** - Node-level metrics
- **kube-state-metrics** - Kubernetes object metrics
- **Prometheus Operator** - Manages Prometheus instances

## Components

### Prometheus
- **URL**: https://prometheus.postrix.io
- **Purpose**: Time-series database for metrics
- **Storage**: 50GB persistent volume (gp3-prometheus)
- **Retention**: 30 days

### Grafana
- **URL**: https://grafana.postrix.io
- **Purpose**: Dashboards and visualization
- **Storage**: 10GB persistent volume (gp3-grafana)
- **Credentials**: 
  - Username: `admin`
  - Password: Stored in sealed secret `monitoring-auth`

### AlertManager
- **URL**: https://alertmanager.postrix.io
- **Purpose**: Alert routing and management
- **Storage**: 5GB persistent volume (gp3-alertmanager)

## Pre-installed Dashboards

The setup includes these popular Grafana dashboards:
1. **Kubernetes Cluster** (ID: 7249) - Overview of your cluster
2. **Node Exporter** (ID: 1860) - Detailed node metrics

## Deployment

Deploy using helmfile:

```bash
# Deploy to specific environment
helmfile -e dev sync

# Or deploy just monitoring stack
helmfile -e dev -l app=monitoring sync
```

## Initial Setup Steps

1. **Grafana password**:
   - Password is managed via sealed secret in `templates/secret.yaml`
   - Username is `admin` (configured in values)
   - To change password: update the sealed secret

2. **Configure AlertManager** (Optional):
   - Add notification channels (Slack, email, PagerDuty, etc.)
   - Edit the AlertManager configuration in the values file

3. **Add custom dashboards**:
   - Import dashboards from [Grafana Dashboard Library](https://grafana.com/grafana/dashboards/)
   - Or create your own

## Monitoring Your Applications

To enable monitoring for your applications, create a `ServiceMonitor`:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-app
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
    - port: metrics
      interval: 30s
```

Your application needs to expose metrics at `/metrics` endpoint in Prometheus format.

## Useful PromQL Queries

```promql
# CPU usage by pod
sum(rate(container_cpu_usage_seconds_total[5m])) by (pod)

# Memory usage by namespace
sum(container_memory_usage_bytes) by (namespace)

# HTTP request rate
rate(http_requests_total[5m])

# Pod restart count
kube_pod_container_status_restarts_total
```

## Troubleshooting

### Prometheus not scraping metrics
1. Check if ServiceMonitor exists: `kubectl get servicemonitor -A`
2. Verify ServiceMonitor selector matches your service labels
3. Check Prometheus targets: https://prometheus.postrix.io/targets

### Grafana dashboard not loading
1. Check if Prometheus datasource is configured correctly
2. Verify Prometheus is running: `kubectl get pods -n monitoring`
3. Test Prometheus query in Prometheus UI first

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [kube-prometheus-stack Chart](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)

