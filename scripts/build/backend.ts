import chalk from 'chalk';
import { execa } from 'execa';

async function buildBackend(): Promise<void> {
  console.log(chalk.bold.blue('\n[*] Building remote LaTeX compiler backend...\n'));

  await execa('go', ['build', '-o', 'server', './cmd/server'], {
    cwd: 'apps/remote-latex-compiler',
    stdio: 'inherit',
  });

  console.log(chalk.bold.green('\n[+] Build complete: apps/remote-latex-compiler/server\n'));
}

buildBackend().catch(err => {
  console.error(chalk.red('[X] Build failed:'), err);
  process.exit(1);
});
