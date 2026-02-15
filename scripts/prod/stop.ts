import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs';

async function stopProd(): Promise<void> {
  console.log(chalk.bold.yellow('\n[*] Stopping production services...\n'));

  await execa('docker', ['compose', 'down'], {
    cwd: 'apps/remote-latex-compiler',
    stdio: 'inherit',
  });

  console.log(chalk.bold.green('\n[+] Production services stopped\n'));
}

stopProd().catch(err => {
  console.error(chalk.red('[X] Failed to stop:'), err);
  process.exit(1);
});
