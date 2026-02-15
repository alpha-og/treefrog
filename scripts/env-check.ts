import chalk from 'chalk';
import fs from 'fs';

const ENV_FILES = [
  // Remote compiler - secrets in .env.local, config in .env.development/.env.production
  { path: 'apps/remote-latex-compiler/.env.local', required: true, description: 'Secrets (gitignored)', secrets: true },
  { path: 'apps/remote-latex-compiler/.env.development', required: true, description: 'Dev config (committed)' },
  { path: 'apps/remote-latex-compiler/.env.production', required: true, description: 'Prod config (committed)' },
  { path: 'apps/remote-latex-compiler/.env.example', required: true, description: 'Template' },
  
  // Desktop - all VITE_ vars are safe
  { path: 'apps/desktop/frontend/.env.development', required: true, description: 'Dev config (committed)' },
  { path: 'apps/desktop/frontend/.env.production', required: true, description: 'Prod config (committed)' },
  { path: 'apps/desktop/frontend/.env.example', required: true, description: 'Template' },
  
  // Website - all VITE_ vars are safe
  { path: 'apps/website/.env.development', required: true, description: 'Dev config (committed)' },
  { path: 'apps/website/.env.production', required: true, description: 'Prod config (committed)' },
  { path: 'apps/website/.env.example', required: true, description: 'Template' },
];

function checkEnvFiles(): void {
  console.log(chalk.bold.blue('\n[*] Environment Configuration Check\n'));

  let allGood = true;

  for (const file of ENV_FILES) {
    const exists = fs.existsSync(file.path);
    const status = exists ? chalk.green('[OK]') : chalk.red('[X]');
    const secretTag = file.secrets ? chalk.magenta('(secrets)') : '';
    const required = file.required ? '(required)' : '(optional)';
    
    console.log(`  ${status} ${file.path} ${chalk.gray(required)} ${secretTag}`);
    
    if (!exists && file.required) {
      allGood = false;
    }
  }

  console.log();

  const missingRequired = ENV_FILES.filter(f => f.required && !fs.existsSync(f.path));
  
  if (missingRequired.length > 0) {
    console.log(chalk.yellow('\nMissing required files:'));
    for (const file of missingRequired) {
      if (file.secrets) {
        console.log(chalk.gray(`  cp apps/remote-latex-compiler/.env.example ${file.path}`));
        console.log(chalk.gray(`  # Edit ${file.path} and add your secrets`));
      } else {
        const examplePath = file.path.replace(/\.development$|\.production$/, '.example');
        console.log(chalk.gray(`  Create ${file.path} from ${examplePath}`));
      }
    }
    process.exit(1);
  }

  console.log(chalk.bold.green('\n[+] Environment check complete\n'));
  console.log(chalk.gray('Structure:'));
  console.log(chalk.gray('  .env.development/.env.production - Config (committed)'));
  console.log(chalk.gray('  .env.local - Secrets (gitignored)'));
}

checkEnvFiles();
