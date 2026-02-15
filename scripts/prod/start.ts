import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs';

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
    const envLocalPath = 'apps/remote-latex-compiler/.env.local';
    const envProductionPath = 'apps/remote-latex-compiler/.env.production';
    
    if (!fs.existsSync(envLocalPath)) {
      console.error(chalk.red('[X] Missing .env.local with secrets'));
      console.log(chalk.yellow('Create it from .env.example:'));
      console.log(chalk.gray('  cp apps/remote-latex-compiler/.env.example apps/remote-latex-compiler/.env.local'));
      console.log(chalk.gray('  # Then edit .env.local with your secrets'));
      process.exit(1);
    }

    console.log(chalk.cyan('Starting remote LaTeX compiler (production mode)...'));
    console.log(chalk.gray('  Using config from: .env.production'));
    console.log(chalk.gray('  Using secrets from: .env.local'));
    
    await execa('docker', ['compose', 'up', '--build', '-d'], {
      cwd: 'apps/remote-latex-compiler',
      stdio: 'inherit',
      env: {
        ...process.env,
        COMPOSE_FILE: 'docker-compose.yml',
      },
    });

    console.log(chalk.green('[+] Remote compiler started'));
    console.log(chalk.gray('    Health: http://localhost:9000/health'));
    console.log(chalk.gray('    Logs: pnpm prod:logs'));
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
