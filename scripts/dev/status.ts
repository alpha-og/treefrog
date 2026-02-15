import chalk from 'chalk';
import { execa } from 'execa';
import { SERVICES, getContainerStatus, checkHttpHealth, checkRedisHealth, checkPortHealth } from '../lib/index.js';

interface ServiceStatus {
  key: string;
  name: string;
  status: 'running' | 'stopped' | 'unknown';
  port: number | null;
  health: 'healthy' | 'unhealthy' | 'unknown';
  responseTime: number | null;
}

async function getServiceStatus(serviceKey: string): Promise<ServiceStatus> {
  const service = SERVICES[serviceKey];
  if (!service) {
    return {
      key: serviceKey,
      name: 'Unknown',
      status: 'unknown',
      port: null,
      health: 'unknown',
      responseTime: null,
    };
  }

  let status: 'running' | 'stopped' | 'unknown' = 'unknown';
  let health: 'healthy' | 'unhealthy' | 'unknown' = 'unknown';
  let responseTime: number | null = null;

  // Check status based on service type
  if (service.type === 'docker' && service.dockerContainer) {
    status = await getContainerStatus(service.dockerContainer);
  } else if (service.port) {
    const portResult = await checkPortHealth(service.port);
    status = portResult.healthy ? 'running' : 'stopped';
  }

  // Check health if running
  if (status === 'running' && service.healthCheck) {
    if (serviceKey === 'redis') {
      const result = await checkRedisHealth();
      health = result.healthy ? 'healthy' : 'unhealthy';
      responseTime = result.responseTime;
    } else if (service.healthCheck.startsWith('http')) {
      const result = await checkHttpHealth(service.healthCheck);
      health = result.healthy ? 'healthy' : 'unhealthy';
      responseTime = result.responseTime;
    }
  }

  return {
    key: serviceKey,
    name: service.name,
    status,
    port: service.port,
    health,
    responseTime,
  };
}

function formatStatus(status: 'running' | 'stopped' | 'unknown'): string {
  switch (status) {
    case 'running':
      return chalk.green('running');
    case 'stopped':
      return chalk.red('stopped');
    default:
      return chalk.gray('unknown');
  }
}

function formatHealth(health: 'healthy' | 'unhealthy' | 'unknown', responseTime: number | null): string {
  switch (health) {
    case 'healthy':
      return chalk.green(`[OK]${responseTime ? ` (${responseTime}ms)` : ''}`);
    case 'unhealthy':
      return chalk.red('[X]');
    default:
      return chalk.gray('-');
  }
}

async function main(): Promise<void> {
  console.log(chalk.bold.blue('\n[*] Treefrog Service Status\n'));

  const statuses: ServiceStatus[] = [];

  for (const key of Object.keys(SERVICES)) {
    const status = await getServiceStatus(key);
    statuses.push(status);
  }

  // Table header
  const header = [
    chalk.bold('Service').padEnd(22),
    chalk.bold('Status').padEnd(12),
    chalk.bold('Port').padEnd(8),
    chalk.bold('Health'),
  ].join(' │ ');

  console.log(chalk.gray('─'.repeat(55)));
  console.log(header);
  console.log(chalk.gray('─'.repeat(55)));

  // Table rows
  for (const s of statuses) {
    const statusStr = formatStatus(s.status).padEnd(20);
    const portStr = s.port ? String(s.port).padEnd(6) : '-'.padEnd(6);
    const healthStr = formatHealth(s.health, s.responseTime);

    const row = [
      s.name.padEnd(20),
      statusStr,
      portStr,
      healthStr,
    ].join(' │ ');

    console.log(row);
  }

  console.log(chalk.gray('─'.repeat(55)));

  // Summary
  const running = statuses.filter(s => s.status === 'running').length;
  const total = statuses.length;

  console.log();
  console.log(chalk.gray(`  ${running}/${total} services running`));

  // Active profiles detection
  const activeProfiles: string[] = [];
  const runningServices = statuses.filter(s => s.status === 'running').map(s => s.key);

  if (runningServices.includes('local-compiler') && runningServices.includes('desktop') && !runningServices.includes('remote-compiler')) {
    activeProfiles.push('desktop-local');
  }
  if (runningServices.includes('remote-compiler') && runningServices.includes('website') && runningServices.includes('desktop')) {
    activeProfiles.push('desktop-remote');
  }
  if (runningServices.includes('remote-compiler') && runningServices.includes('website') && !runningServices.includes('desktop')) {
    activeProfiles.push('website-compiler');
  }
  if (runningServices.includes('remote-compiler') && !runningServices.includes('website') && !runningServices.includes('desktop')) {
    activeProfiles.push('compiler-only');
  }
  if (runningServices.includes('local-compiler') && !runningServices.includes('desktop')) {
    activeProfiles.push('local-only');
  }

  if (activeProfiles.length > 0) {
    console.log(chalk.gray(`  Active profiles: ${activeProfiles.join(', ')}`));
  }

  console.log();
}

main().catch(err => {
  console.error(chalk.red('Error:'), err);
  process.exit(1);
});
