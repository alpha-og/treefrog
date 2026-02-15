import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const ENV_FILES = [
  { path: 'apps/remote-latex-compiler/.env.local', required: false, description: 'Active config (gitignored)' },
  { path: 'apps/remote-latex-compiler/.env.development', required: true, description: 'Development template' },
  { path: 'apps/remote-latex-compiler/.env.production', required: true, description: 'Production template' },
  { path: 'apps/remote-latex-compiler/.env.example', required: true, description: 'Example template' },
  { path: 'apps/desktop/frontend/.env.development', required: false, description: 'Desktop dev config' },
  { path: 'apps/desktop/frontend/.env.production', required: false, description: 'Desktop prod config' },
  { path: 'apps/website/.env.local', required: false, description: 'Website config' },
  { path: 'apps/website/.env.example', required: true, description: 'Website example' },
];

function checkEnvFiles(): void {
  console.log(chalk.bold.blue('\n[*] Environment Configuration Check\n'));

  let allGood = true;

  for (const file of ENV_FILES) {
    const exists = fs.existsSync(file.path);
    const status = exists ? chalk.green('[OK]') : (file.required ? chalk.red('[X]') : chalk.yellow('[?]'));
    const required = file.required ? '(required)' : '(optional)';
    
    console.log(`  ${status} ${file.path} ${chalk.gray(required)}`);
    
    if (!exists && file.required) {
      allGood = false;
    }
  }

  console.log();

  // Check for missing critical files
  const missingRequired = ENV_FILES.filter(f => f.required && !fs.existsSync(f.path));
  
  if (missingRequired.length > 0) {
    console.log(chalk.yellow('Missing required files. Create them from .env.example:'));
    for (const file of missingRequired) {
      const examplePath = file.path.replace(/\.local$|\.development$|\.production$/, '.example');
      if (fs.existsSync(examplePath)) {
        console.log(chalk.gray(`  cp ${examplePath} ${file.path}`));
      }
    }
    process.exit(1);
  }

  if (!fs.existsSync('apps/remote-latex-compiler/.env.local')) {
    console.log(chalk.yellow('Tip: Copy a template to .env.local for active configuration:'));
    console.log(chalk.gray('  pnpm env:dev   # Use development settings'));
    console.log(chalk.gray('  pnpm env:prod  # Use production settings'));
  }

  console.log(chalk.bold.green('\n[+] Environment check complete\n'));
}

checkEnvFiles();
