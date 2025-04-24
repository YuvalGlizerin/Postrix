import os from 'os';

import { Client } from '@elastic/elasticsearch';

interface Metadata {
  [key: string]: unknown;
}

interface LogEntry {
  '@timestamp': string;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug' | 'trace';
  message: string;
  service: string;
}

const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 5000;
const NODE = 'https://elasticsearch.postrix.io';
const hostname = os.hostname();

export class Logger {
  private client: Client;
  private serviceName: string;
  private batchLogs: LogEntry[] = [];
  private flushInterval = setInterval(() => {
    this.flush().catch(err => console.error('Error flushing logs:', err));
  }, FLUSH_INTERVAL_MS);

  constructor(options: { node?: string; serviceName: string; password: string }) {
    this.serviceName = options.serviceName;

    // Create client with authentication and version compatibility fix
    this.client = new Client({
      node: options.node || NODE,
      auth: {
        username: 'elastic', // Default to elastic user
        password: options.password
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async logger(level: 'log' | 'info' | 'warn' | 'error' | 'debug' | 'trace', message: string, metadata: Metadata = {}) {
    const logEntry = {
      '@timestamp': new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      hostname,
      ...metadata
    };

    // Add to batch
    this.batchLogs.push(logEntry);

    // Log to console immediately
    console[level](message, metadata);

    // Flush if we've reached batch size
    if (this.batchLogs.length >= BATCH_SIZE) {
      await this.flush();
    }
  }

  async flush() {
    if (this.batchLogs.length === 0) {
      return;
    }

    const logs = [...this.batchLogs];
    this.batchLogs = [];

    try {
      // Generate index name in format logs-YYYY.MM.DD
      const indexName = `logs-${new Date().toISOString().split('T')[0].replace(/-/g, '.')}`;

      // Use bulk API for more efficient indexing
      const operations = logs.flatMap(doc => [{ index: { _index: indexName } }, doc]);

      await this.client.bulk({ operations });
    } catch (error) {
      // Log error and re-add logs to be sent on next flush
      console.error('Failed to send logs to Elasticsearch:', error);
      this.batchLogs = [...logs, ...this.batchLogs];
    }
  }

  async log(message: string, metadata: Metadata = {}) {
    return this.logger('log', message, metadata);
  }

  async info(message: string, metadata: Metadata = {}) {
    return this.logger('info', message, metadata);
  }

  async warn(message: string, metadata: Metadata = {}) {
    return this.logger('warn', message, metadata);
  }

  async error(message: string, metadata: Metadata = {}) {
    return this.logger('error', message, metadata);
  }

  async debug(message: string, metadata: Metadata = {}) {
    return this.logger('debug', message, metadata);
  }

  async trace(message: string, metadata: Metadata = {}) {
    return this.logger('trace', message, metadata);
  }

  async close() {
    clearInterval(this.flushInterval);
    await this.flush();
    await this.client.close();
  }
}
