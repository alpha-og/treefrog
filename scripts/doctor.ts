import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs';

async function checkCommand(name: string, cmd: string, args: string[] = ['--version']): Promise<boolean> {
  try {
    const { stdout } = await execa(cmd, args, { timeout: 5000, reject: false });
    const version = stdout.split('\n')[0];
    console.log(chalk.green(`  [OK] ${name}: ${version}`));
    return true;
  } catch {
    console.log(chalk.red(`  [X] ${name}: not found`));
    return false;
  }
}

async function checkFile(description: string, filePath: string): Promise<boolean> {
  const exists = fs.existsSync(filePath);
  if (exists) {
    console.log(chalk.green(`  [OK] ${description}`));
    return true;
  } else {
    console.log(chalk.yellow(`  [!] ${description}: not found`));
    return false;
  }
}

async function doctor(): Promise<void> {
  console.log(chalk.bold.blue('\n[*] Treefrog Environment Check\n'));

  console.log(chalk.bold('Core Requirements:'));
  await checkCommand('Node.js', 'node');
  await checkCommand('pnpm', 'pnpm');
  await checkCommand('Go', 'go');

  console.log();
  console.log(chalk.bold('Desktop App:'));
  await checkCommand('Wails', 'wails', ['version']);

  console.log();
  console.log(chalk.bold('Docker:'));
  const dockerOk = await checkCommand('Docker', 'docker');
  if (dockerOk) {
    try {
      const { stdout } = await execa('docker', ['info', '--format', '{{.ServerVersion}}'], {
        timeout: 5000,
        reject: false,
      });
      if (stdout) {
        console.log(chalk.green(`  [OK] Docker Server: ${stdout}`));
      }
    } catch {
      // Docker info failed
    }
  }

  console.log();
  console.log(chalk.bold('Environment Files:'));
  await checkFile('Remote compiler .env.development', 'apps/remote-latex-compiler/.env.development');
  await checkFile('Remote compiler .env.production', 'apps/remote-latex-compiler/.env.production');
  await checkFile('Desktop frontend .env.development', 'apps/desktop/frontend/.env.development');
  await checkFile('Website .env.local', 'apps/website/.env.local');

  console.log();
  console.log(chalk.bold('Go Workspace:'));
  await checkFile('go.work', 'go.work');
  await checkFile('go.work.sum', 'go.work.sum');

  console.log();
  console.log(chalk.bold('pnpm Workspace:'));
  await checkFile('pnpm-workspace.yaml', 'pnpm-workspace.yaml');
  await checkFile('pnpm-lock.yaml', 'pnpm-lock.yaml');

  console.log();
  console.log(chalk.bold.green('[+] Environment check complete\n'));
}

doctor().catch(err => {
  console.error(chalk.red('[X] Check failed:'), err);
  process.exit(1);
});
