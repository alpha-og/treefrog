import chalk from 'chalk';
import { execa, type ExecaChildProcess } from 'execa';
import fs from 'fs';
import path from 'path';
import { 
  SERVICES, 
  PROFILES, 
  getProfile,
  type Service,
  checkHttpHealth,
  isDockerRunning,
  getContainerStatus,
  waitForHealthyContainer,
} from '../lib/index.js';

interface StartOptions {
  profile: string;
  logDir?: string;
  noHealthCheck?: boolean;
  detach?: boolean;
}

interface RunningProcess {
  name: string;
  process: ExecaChildProcess | null;
  type: 'docker' | 'process';
  cwd?: string;
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
  
  console.log(fullMessage);
  
  if (stream) {
    stream.write(`[${timestamp}] [${serviceKey}] ${message}\n`);
  }
}

async function checkDockerAvailable(): Promise<boolean> {
  const available = await isDockerRunning();
  if (!available) {
    console.error(chalk.red('\n[X] Docker is not running. Please start Docker and try again.\n'));
    return false;
  }
  return true;
}

async function checkServiceHealth(
  serviceKey: string,
  service: Service,
  timeout: number,
  logStream?: fs.WriteStream
): Promise<boolean> {
  if (!service.healthCheck) return true;
  
  log(serviceKey, `Waiting for health check (timeout: ${timeout}ms)...`, logStream);
  
  // For Docker services, wait for container health
  if (service.type === 'docker' && service.dockerContainer) {
    const healthy = await waitForHealthyContainer(service.dockerContainer, { timeout });
    if (healthy) {
      log(serviceKey, 'Container health check passed', logStream);
    } else {
      log(serviceKey, 'Container health check failed', logStream);
    }
    return healthy;
  }
  
  // For HTTP health checks
  if (service.healthCheck.startsWith('http')) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      const result = await checkHttpHealth(service.healthCheck, 5000);
      if (result.healthy) {
        log(serviceKey, `Health check passed (${result.responseTime}ms)`, logStream);
        return true;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    
    log(serviceKey, 'Health check failed: timeout', logStream);
    return false;
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
      runningProcesses.set(serviceKey, { 
        name: serviceKey, 
        process: null, 
        type: 'docker',
        cwd: service.cwd 
      });
      
      // Still check health if requested
      if (!options.noHealthCheck && service.healthCheck) {
        const healthy = await checkServiceHealth(serviceKey, service, service.healthCheckTimeout, logStream);
        if (!healthy) {
          log(serviceKey, chalk.yellow('Warning: Service may not be healthy'), logStream);
        }
      }
      return true;
    }
  }

  // Skip services without startCommand (they're managed by other services like compose)
  if (!service.startCommand) {
    log(serviceKey, 'No start command (managed by compose or external)', logStream);
    return true;
  }

  try {
    const [cmd, ...args] = service.startCommand.split(' ');
    
    if (service.type === 'docker') {
      // Docker compose command
      const execOptions: Record<string, unknown> = {
        timeout: 300000, // 5 minutes for build
      };
      
      if (service.cwd) {
        execOptions.cwd = service.cwd;
      }
      
      await execa(cmd, args, execOptions);
      runningProcesses.set(serviceKey, { 
        name: serviceKey, 
        process: null, 
        type: 'docker',
        cwd: service.cwd 
      });
      log(serviceKey, 'Container started', logStream);
    } else {
      // Process-based service (wails, pnpm dev)
      const execOptions: Record<string, unknown> = {
        stdio: options.detach ? 'ignore' : 'pipe',
        reject: false,
      };
      
      if (service.cwd) {
        execOptions.cwd = service.cwd;
      }
      
      const proc = execa(cmd, args, execOptions);

      if (options.detach) {
        proc.unref();
        runningProcesses.set(serviceKey, { 
          name: serviceKey, 
          process: null, 
          type: 'process',
          cwd: service.cwd 
        });
        log(serviceKey, 'Started in detached mode', logStream);
      } else {
        runningProcesses.set(serviceKey, { 
          name: serviceKey, 
          process: proc, 
          type: 'process',
          cwd: service.cwd 
        });

        proc.stdout?.on('data', (data) => {
          const message = data.toString().trim();
          if (message) {
            log(serviceKey, message, logStream);
          }
        });

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
    }

    // Wait for health check if needed
    if (!options.noHealthCheck && service.healthCheck) {
      const healthy = await checkServiceHealth(serviceKey, service, service.healthCheckTimeout, logStream);
      if (!healthy) {
        log(serviceKey, chalk.red('Health check failed'), logStream);
        return false;
      }
    } else {
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

  // Check Docker availability if any Docker services are needed
  const dockerServices = profile.services.filter(key => SERVICES[key]?.type === 'docker');
  if (dockerServices.length > 0) {
    console.log(chalk.cyan('Checking Docker availability...'));
    const dockerAvailable = await checkDockerAvailable();
    if (!dockerAvailable) {
      process.exit(1);
    }
    console.log(chalk.green('  Docker is available\n'));
  }

  // Setup log directory if specified
  let logStream: fs.WriteStream | undefined;
  if (options.logDir) {
    fs.mkdirSync(options.logDir, { recursive: true });
    console.log(chalk.gray(`   Logs directory: ${options.logDir}`));
  }

  // Resolve dependencies and get startup order
  const startupOrder = resolveStartupOrder(profile.services);

  // Start services in order
  for (const serviceKey of startupOrder) {
    const serviceLogStream = options.logDir ? setupLogging(serviceKey, options.logDir) ?? undefined : undefined;

    const success = await startService(serviceKey, options, serviceLogStream);
    
    if (!success) {
      console.error(chalk.red(`\n[X] Failed to start ${serviceKey}`));
      console.log(chalk.yellow('Stopping started services...'));
      await cleanup();
      process.exit(1);
    }

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

    await new Promise(() => {});
  }
}

function resolveStartupOrder(services: string[]): string[] {
  const resolved: string[] = [];
  const pending = [...services];

  while (pending.length > 0) {
    const service = pending.shift()!;
    if (resolved.includes(service)) continue;

    const serviceDef = SERVICES[service];
    if (!serviceDef) continue;

    // Check if all dependencies are resolved
    const allDepsResolved = serviceDef.dependsOn.every(dep => resolved.includes(dep));
    
    if (allDepsResolved) {
      resolved.push(service);
    } else {
      // Add unresolved dependencies first
      pending.unshift(service);
      for (const dep of serviceDef.dependsOn) {
        if (!resolved.includes(dep)) {
          pending.unshift(dep);
        }
      }
    }
  }

  return resolved;
}

async function cleanup(): Promise<void> {
  for (const stream of logWriters.values()) {
    stream.end();
  }

  const stopOrder = Array.from(runningProcesses.keys()).reverse();
  
  for (const key of stopOrder) {
    const running = runningProcesses.get(key);
    const service = SERVICES[key];
    
    if (running?.process && !running.process.killed) {
      running.process.kill('SIGTERM');
      console.log(chalk.gray(`   Stopped ${key}`));
    }
    
    if (service?.type === 'docker' && service.dockerContainer) {
      try {
        const status = await getContainerStatus(service.dockerContainer);
        if (status === 'running') {
          if (service.stopCommand) {
            const [cmd, ...args] = service.stopCommand.split(' ');
            await execa(cmd, args, { 
              cwd: service.cwd,
              timeout: 30000 
            });
          } else {
            await execa('docker', ['stop', service.dockerContainer], { timeout: 30000 });
          }
          console.log(chalk.gray(`   Stopped ${key}`));
        }
      } catch (err) {
        console.log(chalk.yellow(`   Warning: Could not stop ${key}: ${err}`));
      }
    }
  }

  runningProcesses.clear();
  logWriters.clear();
}

const options = parseArgs();
startProfile(options).catch(async (err) => {
  console.error(chalk.red('Fatal error:'), err);
  await cleanup();
  process.exit(1);
});
