import chalk from 'chalk';
import { SERVICES, getContainerStatus, getContainerLogs } from '../lib/index.js';

interface LogsOptions {
  service: string;
  follow: boolean;
  tail: number;
  since: string;
}

function parseArgs(): LogsOptions {
  const args = process.argv.slice(2);
  const options: LogsOptions = {
    service: '',
    follow: false,
    tail: 100,
    since: '',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-f' || arg === '--follow') {
      options.follow = true;
    } else if (arg === '--tail') {
      options.tail = parseInt(args[++i], 10) || 100;
    } else if (arg === '--since') {
      options.since = args[++i];
    } else if (!arg.startsWith('--')) {
      options.service = arg;
    }
  }

  return options;
}

async function showLogs(options: LogsOptions): Promise<void> {
  const service = SERVICES[options.service];

  if (!service) {
    console.error(chalk.red(`Unknown service: ${options.service}`));
    console.log(chalk.yellow('Available services:'));
    Object.keys(SERVICES).forEach(key => {
      console.log(`  ${key}: ${SERVICES[key].name}`);
    });
    process.exit(1);
  }

  // Check if service is running
  if (service.type === 'docker' && service.dockerContainer) {
    const status = await getContainerStatus(service.dockerContainer);
    if (status !== 'running') {
      console.log(chalk.yellow(`Service ${service.name} is not running`));
      process.exit(0);
    }

    console.log(chalk.bold.blue(`\n[*] Logs for ${service.name}\n`));

    await getContainerLogs(service.dockerContainer, {
      follow: options.follow,
      tail: options.tail,
      since: options.since,
    });
  } else {
    console.log(chalk.yellow(`Logs not available for ${service.name}`));
    console.log(chalk.gray('Only Docker services support log viewing'));
  }
}

const options = parseArgs();

if (!options.service) {
  console.log(chalk.yellow('Usage: pnpm dev:logs <service> [options]'));
  console.log(chalk.gray('\nOptions:'));
  console.log(chalk.gray('  -f, --follow    Follow log output'));
  console.log(chalk.gray('  --tail <n>      Number of lines to show (default: 100)'));
  console.log(chalk.gray('  --since <dur>   Show logs since duration (e.g., "10m")'));
  console.log(chalk.gray('\nServices:'));
  Object.keys(SERVICES).forEach(key => {
    const s = SERVICES[key];
    if (s.type === 'docker') {
      console.log(chalk.gray(`  ${key}: ${s.name}`));
    }
  });
  process.exit(0);
}

showLogs(options).catch(err => {
  console.error(chalk.red('Error:'), err);
  process.exit(1);
});
