import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

interface CleanOptions {
  deep: boolean;
}

function parseArgs(): CleanOptions {
  const args = process.argv.slice(2);
  return {
    deep: args.includes('--deep'),
  };
}

function removeIfExists(targetPath: string): void {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
    console.log(chalk.gray(`  Removed: ${targetPath}`));
  }
}

function clean(options: CleanOptions): void {
  console.log(chalk.bold.blue('\n[*] Cleaning build artifacts...\n'));

  // Desktop build artifacts
  removeIfExists('apps/desktop/build/bin');

  // Backend binaries
  removeIfExists('apps/remote-latex-compiler/server');
  removeIfExists('apps/local-latex-compiler/server');
  removeIfExists('apps/local-cli/latex-local');

  // Coverage files
  removeIfExists('apps/remote-latex-compiler/coverage.out');

  // Dist directories
  const distDirs = [
    'apps/desktop/frontend/dist',
    'apps/website/dist',
    'packages/types/dist',
    'packages/supabase/dist',
    'packages/services/dist',
    'packages/ui/dist',
  ];

  for (const dir of distDirs) {
    removeIfExists(dir);
  }

  // Cache directories
  const cacheDirs = [
    'apps/desktop/frontend/.vite',
    'apps/website/.vite',
  ];

  for (const dir of cacheDirs) {
    removeIfExists(dir);
  }

  if (options.deep) {
    console.log(chalk.bold.yellow('\n[*] Deep clean: removing node_modules...\n'));

    const nodeModulesDirs = [
      'node_modules',
      'apps/desktop/frontend/node_modules',
      'apps/website/node_modules',
      'packages/types/node_modules',
      'packages/supabase/node_modules',
      'packages/services/node_modules',
      'packages/ui/node_modules',
      'packages/eslint-config/node_modules',
    ];

    for (const dir of nodeModulesDirs) {
      removeIfExists(dir);
    }

    console.log(chalk.bold.green('\n[+] Deep clean complete\n'));
  } else {
    console.log(chalk.bold.green('\n[+] Clean complete\n'));
  }
}

const options = parseArgs();
clean(options);
