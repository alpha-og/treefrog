import chalk from 'chalk';
import { execa } from 'execa';

async function showProdLogs(): Promise<void> {
  await execa('docker', ['compose', 'logs', '-f', 'remote-latex-compiler'], {
    cwd: 'apps/remote-latex-compiler',
    stdio: 'inherit',
  });
}

showProdLogs().catch(err => {
  console.error(chalk.red('[X] Failed to get logs:'), err);
  process.exit(1);
});
