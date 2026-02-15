import chalk from 'chalk';
import { execa } from 'execa';

interface ProdOptions {
  service: string;
  env: 'production';
}

function parseArgs(): ProdOptions {
  const args = process.argv.slice(2);
  const options: ProdOptions = {
    service: args.find(arg => !arg.startsWith('--')) || 'compiler',
    env: 'production',
  };

  return options;
}

async function startProd(options: ProdOptions): Promise<void> {
  console.log(chalk.bold.blue('\n[*] Starting production services...\n'));

  if (options.service === 'compiler') {
    console.log(chalk.cyan('Starting remote LaTeX compiler (production mode)...'));
    
    await execa('docker', ['compose', '--env-file', '.env.production', 'up', '--build', '-d'], {
      cwd: 'apps/remote-latex-compiler',
      stdio: 'inherit',
    });

    console.log(chalk.green('[+] Remote compiler started'));
  } else {
    console.log(chalk.yellow(`Unknown production service: ${options.service}`));
    console.log(chalk.gray('Available: compiler'));
    process.exit(1);
  }

  console.log(chalk.bold.green('\n[+] Production services running\n'));
}

const options = parseArgs();
startProd(options).catch(err => {
  console.error(chalk.red('[X] Failed to start:'), err);
  process.exit(1);
});
