import chalk from 'chalk';
import { execa } from 'execa';

async function buildCLI(): Promise<void> {
  console.log(chalk.bold.blue('\n[*] Building local CLI...\n'));

  await execa('go', ['build', '-o', 'latex-local', './cmd'], {
    cwd: 'apps/local-cli',
    stdio: 'inherit',
  });

  console.log(chalk.bold.green('\n[+] Build complete: apps/local-cli/latex-local\n'));
}

buildCLI().catch(err => {
  console.error(chalk.red('[X] Build failed:'), err);
  process.exit(1);
});
