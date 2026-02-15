import { execa } from 'execa';
import http from 'http';

export interface HealthCheckResult {
  healthy: boolean;
  responseTime: number;
  error?: string;
}

export async function checkHttpHealth(url: string, timeout = 5000): Promise<HealthCheckResult> {
  const start = Date.now();
  
  return new Promise((resolve) => {
    const req = http.request(url, {
      method: 'GET',
      timeout,
    }, (res) => {
      const responseTime = Date.now() - start;
      if (res.statusCode === 200) {
        resolve({ healthy: true, responseTime });
      } else {
        resolve({ 
          healthy: false, 
          responseTime, 
          error: `HTTP ${res.statusCode}` 
        });
      }
    });
    
    req.on('error', (err) => {
      resolve({ 
        healthy: false, 
        responseTime: Date.now() - start, 
        error: err.message 
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ 
        healthy: false, 
        responseTime: Date.now() - start, 
        error: 'timeout' 
      });
    });
    
    req.end();
  });
}

export async function checkRedisHealth(host = 'localhost', port = 6379): Promise<HealthCheckResult> {
  const start = Date.now();
  
  try {
    const { stdout } = await execa('redis-cli', ['-h', host, '-p', String(port), 'ping'], {
      timeout: 5000,
      reject: false,
    });
    
    const responseTime = Date.now() - start;
    if (stdout.includes('PONG')) {
      return { healthy: true, responseTime };
    }
    return { healthy: false, responseTime, error: stdout || 'no response' };
  } catch (err) {
    return { 
      healthy: false, 
      responseTime: Date.now() - start, 
      error: err instanceof Error ? err.message : 'unknown error' 
    };
  }
}

export async function checkPortHealth(port: number): Promise<HealthCheckResult> {
  const start = Date.now();
  
  try {
    const { stdout } = await execa('lsof', ['-i', `:${port}`], {
      timeout: 5000,
      reject: false,
    });
    
    const responseTime = Date.now() - start;
    if (stdout.includes('LISTEN')) {
      return { healthy: true, responseTime };
    }
    return { healthy: false, responseTime, error: 'port not in use' };
  } catch {
    return { 
      healthy: false, 
      responseTime: Date.now() - start, 
      error: 'port check failed' 
    };
  }
}

export async function waitForHealth(
  checkFn: () => Promise<HealthCheckResult>,
  options: { timeout?: number; interval?: number } = {}
): Promise<HealthCheckResult> {
  const timeout = options.timeout ?? 60000;
  const interval = options.interval ?? 2000;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const result = await checkFn();
    if (result.healthy) {
      return result;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return { healthy: false, responseTime: Date.now() - start, error: 'timeout waiting for health' };
}
