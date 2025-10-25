# Logger Package

A smart logging package that adapts to your environment:
- **Local Development**: Sends logs directly to Elasticsearch API
- **Cloud/Kubernetes**: Outputs JSON to stdout for Fluent Bit collection

## How It Works

### Local Environment
When running locally (outside Kubernetes), the logger:
1. Batches log entries
2. Sends them directly to Elasticsearch via HTTP API
3. Uses the external Elasticsearch endpoint (`https://elasticsearch.postrix.io`)

### Cloud Environment (dev/prod)
When running in Kubernetes, the logger:
1. Outputs structured JSON logs to stdout
2. Fluent Bit (running as a DaemonSet) collects these logs
3. Fluent Bit enriches them with Kubernetes metadata
4. Fluent Bit sends them to Elasticsearch cluster

**Benefit**: No direct Elasticsearch connections from pods, better security, centralized log collection.

## Detection Logic

The logger automatically detects the environment by checking for the `KUBERNETES_SERVICE_HOST` environment variable:
- If present → Running in Kubernetes → Use stdout (Fluent Bit)
- If absent → Running locally → Use Elasticsearch API

## Usage

```typescript
import { Logger } from 'logger';

const logger = new Logger('my-service');

// All methods work the same way in both environments
await logger.info('Server started', { port: 3000 });
await logger.error('Failed to connect', { error: err });
await logger.debug('Debug info', { data: someData });
```

## Log Structure

Logs are structured as JSON with the following fields:

```json
{
  "@timestamp": "2025-10-25T13:30:00.000Z",
  "level": "info",
  "message": "Server started",
  "service": "my-service",
  "hostname": "pod-name-xyz",
  "port": 3000
}
```

### In Kubernetes (via Fluent Bit)
Fluent Bit adds additional metadata:

```json
{
  "@timestamp": "2025-10-25T13:30:00.000Z",
  "level": "info",
  "message": "Server started",
  "service": "my-service",
  "hostname": "pod-name-xyz",
  "port": 3000,
  "kubernetes": {
    "pod_name": "my-service-abc123",
    "namespace_name": "prod",
    "labels": { ... },
    "annotations": { ... }
  }
}
```

## Log Levels

- `logger.log()` - General logs
- `logger.info()` - Informational messages
- `logger.warn()` - Warnings
- `logger.error()` - Errors (automatically extracts error stack traces)
- `logger.debug()` - Debug information
- `logger.trace()` - Detailed trace information

## Cleanup

```typescript
// Flush remaining logs and close connections (local only)
await Logger.close();
```

Note: In cloud environments, this is a no-op as logs are sent to stdout immediately.
