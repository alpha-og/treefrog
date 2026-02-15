import chalk from 'chalk';
import { execa } from 'execa';
import { SERVICES, PROFILES, getProfile, getContainerStatus, stopContainer } from '../lib/index.js';

interface StopOptions {
  profile?: string;
  all: boolean;
  force: boolean;
}

function parseArgs(): StopOptions {
  const args = process.argv.slice(2);
  const options: StopOptions = {
    all: false,
    force: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--all') {
      options.all = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (!arg.startsWith('--')) {
      options.profile = arg;
    }
  }

  return options;
}

async function stopService(serviceKey: string, force: boolean): Promise<boolean> {
  const service = SERVICES[serviceKey];
  if (!service) {
    console.log(chalk.yellow(`Unknown service: ${serviceKey}`));
    return false;
  }

  console.log(chalk.gray(`  Stopping ${service.name}...`));

  // For Docker services
  if (service.type === 'docker' && service.dockerContainer) {
    const status = await getContainerStatus(service.dockerContainer);
    if (status === 'stopped' || status === 'unknown') {
      console.log(chalk.gray(`  ${serviceKey}: Already stopped`));
      return true;
    }

    // Use stop command if defined (docker compose down)
    if (service.stopCommand && service.cwd) {
      try {
        const [cmd, ...args] = service.stopCommand.split(' ');
        await execa(cmd, args, { 
          cwd: service.cwd,
          timeout: 30000 
        });
        console.log(chalk.green(`  ${serviceKey}: Stopped`));
        return true;
      } catch (err) {
        if (force) {
          const success = await stopContainer(service.dockerContainer);
          if (success) {
            console.log(chalk.green(`  ${serviceKey}: Stopped (forced)`));
          }
          return success;
        }
        console.log(chalk.red(`  ${serviceKey}: Failed to stop - ${err}`));
        return false;
      }
    } else {
      // Direct container stop
      const success = await stopContainer(service.dockerContainer);
      if (success) {
        console.log(chalk.green(`  ${serviceKey}: Stopped`));
      }
      return success;
    }
  }

  // For process-based services, kill by port
  if (service.port) {
    try {
      const { stdout } = await execa('lsof', ['-t', '-i', `:${service.port}`], {
        reject: false,
        timeout: 5000,
      });

      if (stdout.trim()) {
        const pids = stdout.trim().split('\n');
        for (const pid of pids) {
          const signal = force ? 'KILL' : 'TERM';
          await execa('kill', [`-${signal}`, pid], { reject: false });
        }
        console.log(chalk.green(`  ${serviceKey}: Stopped (killed ${pids.length} process(es))`));
      } else {
        console.log(chalk.gray(`  ${serviceKey}: Already stopped`));
      }
      return true;
    } catch (err) {
      console.log(chalk.red(`  ${serviceKey}: Failed to stop - ${err}`));
      return false;
    }
  }

  console.log(chalk.gray(`  ${serviceKey}: No stop method available`));
  return true;
}

async function stopAllServices(force: boolean): Promise<void> {
  console.log(chalk.bold.yellow('\n[*] Stopping all Treefrog services...\n'));

  // Stop in reverse dependency order
  const serviceOrder = [
    'desktop',
    'website',
    'remote-compiler',
    'local-compiler',
    'redis',
  ];

  for (const serviceKey of serviceOrder) {
    await stopService(serviceKey, force);
  }

  console.log(chalk.bold.green('\n[+] All services stopped\n'));
}

async function stopProfile(profileKey: string, force: boolean): Promise<void> {
  const profile = getProfile(profileKey);

  if (!profile) {
    console.error(chalk.red(`Unknown profile: ${profileKey}`));
    console.log(chalk.yellow('Available profiles:'));
    Object.keys(PROFILES).forEach(key => {
      console.log(`  ${key}`);
    });
    process.exit(1);
  }

  console.log(chalk.bold.yellow(`\n[*] Stopping profile: ${profile.name}...\n`));

  // Stop in reverse startup order (dependencies first)
  const stopOrder = [...profile.services].reverse();

  for (const serviceKey of stopOrder) {
    await stopService(serviceKey, force);
  }

  console.log(chalk.bold.green('\n[+] Profile stopped\n'));
}

// Main
const options = parseArgs();

if (options.all) {
  stopAllServices(options.force);
} else if (options.profile) {
  stopProfile(options.profile, options.force);
} else {
  console.log(chalk.yellow('Usage: pnpm dev:stop <profile> | pnpm dev:stop --all'));
  console.log(chalk.gray('\nOptions:'));
  console.log(chalk.gray('  --all     Stop all Treefrog services'));
  console.log(chalk.gray('  --force   Force stop (kill)'));
  console.log(chalk.gray('\nProfiles:'));
  Object.keys(PROFILES).forEach(key => {
    console.log(chalk.gray(`  ${key}`));
  });
  process.exit(0);
}
