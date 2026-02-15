import chalk from 'chalk';
import { execa } from 'execa';

async function showProdLogs(): Promise<void> {
  const args = process.argv.slice(2);
  const follow = args.includes('-f') || args.includes('--follow');
  
  const logArgs = ['compose', 'logs'];
  if (follow) {
    logArgs.push('-f');
  }
  logArgs.push('--tail', '100');
  logArgs.push('remote-compiler');

  await execa('docker', logArgs, {
    cwd: 'apps/remote-latex-compiler',
    stdio: 'inherit',
  });
}

showProdLogs().catch(err => {
  console.error(chalk.red('[X] Failed to get logs:'), err);
  process.exit(1);
});
