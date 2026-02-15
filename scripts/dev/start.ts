import chalk from 'chalk';
import { execa, type ExecaChildProcess } from 'execa';
import fs from 'fs';
import path from 'path';
import { 
  SERVICES, 
  PROFILES, 
  getProfile, 
  checkHttpHealth, 
  checkRedisHealth,
  getContainerStatus,
} from '../lib/index.js';

interface StartOptions {
  profile: string;
  logDir?: string;
  noTerminal?: boolean;
  noHealthCheck?: boolean;
  detach?: boolean;
}

interface RunningProcess {
  name: string;
  process: ExecaChildProcess | null;
  type: 'docker' | 'process';
}

const runningProcesses: Map<string, RunningProcess> = new Map();
const logWriters: Map<string, fs.WriteStream> = new Map();

function parseArgs(): StartOptions {
  const args = process.argv.slice(2);
  const options: StartOptions = {
    profile: args.find(arg => !arg.startsWith('--')) || 'desktop-local',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--log-dir') {
      options.logDir = args[++i];
    } else if (arg === '--no-terminal') {
      options.noTerminal = true;
    } else if (arg === '--no-health-check') {
      options.noHealthCheck = true;
    } else if (arg === '--detach' || arg === '-d') {
      options.detach = true;
    }
  }

  return options;
}

function setupLogging(serviceKey: string, logDir: string): fs.WriteStream | null {
  if (!logDir) return null;
  
  const logPath = path.join(logDir, `${serviceKey}.log`);
  fs.mkdirSync(logDir, { recursive: true });
  
  const stream = fs.createWriteStream(logPath, { flags: 'a' });
  logWriters.set(serviceKey, stream);
  
  return stream;
}

function log(serviceKey: string, message: string, stream?: fs.WriteStream) {
  const timestamp = new Date().toISOString();
  const prefix = chalk.cyan(`[${timestamp}] [${serviceKey}]`);
  const fullMessage = `${prefix} ${message}`;
  
  if (!process.env.LOG_DIR || !process.env.NO_TERMINAL) {
    console.log(fullMessage);
  }
  
  if (stream) {
    stream.write(`[${timestamp}] [${serviceKey}] ${message}\n`);
  }
}

async function waitForServiceHealth(
  serviceKey: string, 
  timeout: number,
  logStream?: fs.WriteStream
): Promise<boolean> {
  const service = SERVICES[serviceKey];
  if (!service || !service.healthCheck) return true;

  log(serviceKey, `Waiting for health check (timeout: ${timeout}ms)...`, logStream);

  if (serviceKey === 'redis') {
    const result = await checkRedisHealth();
    return result.healthy;
  }

  if (service.healthCheck.startsWith('http')) {
    const result = await checkHttpHealth(service.healthCheck, 5000);
    const start = Date.now();
    
    while (!result.healthy && Date.now() - start < timeout) {
      await new Promise(r => setTimeout(r, 2000));
      const check = await checkHttpHealth(service.healthCheck!, 5000);
      if (check.healthy) {
        log(serviceKey, `Health check passed (${check.responseTime}ms)`, logStream);
        return true;
      }
    }
    
    if (!result.healthy) {
      log(serviceKey, `Health check failed: ${result.error}`, logStream);
      return false;
    }
  }

  return true;
}

async function startService(
  serviceKey: string, 
  options: StartOptions,
  logStream?: fs.WriteStream
): Promise<boolean> {
  const service = SERVICES[serviceKey];
  if (!service) {
    console.error(chalk.red(`Unknown service: ${serviceKey}`));
    return false;
  }

  log(serviceKey, `Starting ${service.name}...`, logStream);

  // Check if Docker service is already running
  if (service.type === 'docker' && service.dockerContainer) {
    const status = await getContainerStatus(service.dockerContainer);
    if (status === 'running') {
      log(serviceKey, 'Container already running', logStream);
      runningProcesses.set(serviceKey, { name: serviceKey, process: null, type: 'docker' });
      return true;
    }
  }

  if (!service.startCommand) {
    log(serviceKey, 'No start command defined (dependency service)', logStream);
    return true;
  }

  try {
    const [cmd, ...args] = service.startCommand.split(' ');
    
    if (options.detach) {
      // Run detached (fire and forget)
      const proc = execa(cmd, args, {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, ...service.env },
      });
      proc.unref();
      runningProcesses.set(serviceKey, { name: serviceKey, process: null, type: 'docker' });
      log(serviceKey, 'Started in detached mode', logStream);
    } else {
      // Run attached with output handling
      const proc = execa(cmd, args, {
        stdio: 'pipe',
        env: { ...process.env, ...service.env },
        reject: false,
      });

      runningProcesses.set(serviceKey, { name: serviceKey, process: proc, type: 'process' });

      // Handle stdout
      proc.stdout?.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          log(serviceKey, message, logStream);
        }
      });

      // Handle stderr
      proc.stderr?.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          log(serviceKey, chalk.yellow(message), logStream);
        }
      });

      proc.catch(err => {
        log(serviceKey, chalk.red(`Process error: ${err.message}`), logStream);
      });
    }

    // Wait for health check if needed
    if (!options.noHealthCheck && service.healthCheck) {
      const healthy = await waitForServiceHealth(serviceKey, service.healthCheckTimeout, logStream);
      if (!healthy) {
        log(serviceKey, chalk.red('Health check failed'), logStream);
        return false;
      }
    } else {
      // Small delay to let service start
      await new Promise(r => setTimeout(r, 1000));
    }

    log(serviceKey, chalk.green('Started successfully'), logStream);
    return true;
  } catch (err) {
    log(serviceKey, chalk.red(`Failed to start: ${err}`), logStream);
    return false;
  }
}

async function startProfile(options: StartOptions): Promise<void> {
  const profile = getProfile(options.profile);
  
  if (!profile) {
    console.error(chalk.red(`Unknown profile: ${options.profile}`));
    console.log(chalk.yellow('Available profiles:'));
    Object.keys(PROFILES).forEach(key => {
      console.log(`  ${key}: ${PROFILES[key].description}`);
    });
    process.exit(1);
  }

  console.log(chalk.bold.blue(`\n[*] Starting profile: ${profile.name}`));
  console.log(chalk.gray(`   ${profile.description}`));
  console.log(chalk.gray(`   Services: ${profile.services.join(', ')}`));
  console.log();

  // Setup log directory if specified
  let logStream: fs.WriteStream | undefined;
  if (options.logDir) {
    fs.mkdirSync(options.logDir, { recursive: true });
    console.log(chalk.gray(`   Logs directory: ${options.logDir}`));
  }

  // Start services in order
  for (const serviceKey of profile.startupOrder) {
    const service = SERVICES[serviceKey];
    const serviceLogDir = options.logDir;
    let serviceLogStream: fs.WriteStream | undefined;
    
    if (serviceLogDir) {
      serviceLogStream = setupLogging(serviceKey, serviceLogDir) ?? undefined;
    }

    const success = await startService(serviceKey, options, serviceLogStream);
    
    if (!success) {
      console.error(chalk.red(`\n[X] Failed to start ${serviceKey}`));
      console.log(chalk.yellow('Stopping started services...'));
      await cleanup();
      process.exit(1);
    }

    // Small delay between services
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(chalk.bold.green('\n[+] All services started successfully!'));
  console.log(chalk.gray('   Press Ctrl+C to stop all services'));
  console.log();

  // Keep process alive if not detached
  if (!options.detach) {
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n\nStopping all services...'));
      await cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await cleanup();
      process.exit(0);
    });

    // Keep process alive
    await new Promise(() => {});
  }
}

async function cleanup(): Promise<void> {
  // Close log writers
  for (const stream of logWriters.values()) {
    stream.end();
  }

  // Stop running processes
  for (const [key, running] of runningProcesses) {
    const service = SERVICES[key];
    
    if (running.process && !running.process.killed) {
      running.process.kill('SIGTERM');
      console.log(chalk.gray(`   Stopped ${key}`));
    }
    
    if (service?.stopCommand) {
      try {
        const [cmd, ...args] = service.stopCommand.split(' ');
        await execa(cmd, args, { timeout: 30000 });
        console.log(chalk.gray(`   Stopped ${key} (via stop command)`));
      } catch (err) {
        console.log(chalk.yellow(`   Warning: Could not stop ${key}: ${err}`));
      }
    }
  }

  runningProcesses.clear();
  logWriters.clear();
}

// Main entry
const options = parseArgs();
startProfile(options).catch(async (err) => {
  console.error(chalk.red('Fatal error:'), err);
  await cleanup();
  process.exit(1);
});
