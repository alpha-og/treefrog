import chalk from 'chalk';
import { execa } from 'execa';
import { isDockerRunning } from '../lib/index.js';

interface DockerBuildOptions {
  service?: string;
  all: boolean;
  push: boolean;
  tag?: string;
  buildOnly: boolean;
}

function parseArgs(): DockerBuildOptions {
  const args = process.argv.slice(2);
  const options: DockerBuildOptions = {
    all: false,
    push: false,
    buildOnly: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--all') {
      options.all = true;
    } else if (arg === '--push') {
      options.push = true;
    } else if (arg === '--tag') {
      options.tag = args[++i];
    } else if (arg === '--build-only') {
      options.buildOnly = true;
    } else if (!arg.startsWith('--')) {
      options.service = arg;
    }
  }

  return options;
}

const COMPILERS = {
  'local-compiler': {
    name: 'Local LaTeX Compiler',
    composeDir: 'apps/local-latex-compiler',
    imageName: 'treefrog-local-latex-compiler',
    ghcrImage: 'ghcr.io/alpha-og/treefrog/local-latex-compiler',
    hasEnvFile: false,
  },
  'remote-compiler': {
    name: 'Remote LaTeX Compiler',
    composeDir: 'apps/remote-latex-compiler',
    imageName: 'treefrog-remote-latex-compiler',
    ghcrImage: 'ghcr.io/alpha-og/treefrog/remote-latex-compiler',
    hasEnvFile: true,
  },
};

async function buildDockerImage(
  compilerKey: string,
  options: DockerBuildOptions
): Promise<void> {
  const compiler = COMPILERS[compilerKey as keyof typeof COMPILERS];
  if (!compiler) {
    console.error(chalk.red(`Unknown compiler: ${compilerKey}`));
    return;
  }

  console.log(chalk.bold.blue(`\n[*] Building ${compiler.name}...\n`));

  const tag = options.tag || 'latest';

  try {
    if (options.buildOnly) {
      // Just build, don't start
      await execa('docker', [
        'compose', 
        'build',
        '--no-cache' 
      ], {
        cwd: compiler.composeDir,
        stdio: 'inherit',
      });
      console.log(chalk.green(`[+] ${compiler.name} built`));
    } else {
      // Build and start with compose
      await execa('docker', ['compose', 'up', '--build', '-d'], {
        cwd: compiler.composeDir,
        stdio: 'inherit',
      });
      console.log(chalk.green(`[+] ${compiler.name} built and started`));
    }

    // Tag for GHCR if push is requested
    if (options.push) {
      console.log(chalk.cyan(`Tagging for GHCR: ${compiler.ghcrImage}:${tag}`));
      
      await execa('docker', ['tag', `${compiler.imageName}:latest`, `${compiler.ghcrImage}:${tag}`], {
        stdio: 'inherit',
      });

      await execa('docker', ['push', `${compiler.ghcrImage}:${tag}`], {
        stdio: 'inherit',
      });

      console.log(chalk.green(`[+] Pushed ${compiler.ghcrImage}:${tag}`));
    }
  } catch (err) {
    console.error(chalk.red(`[X] Failed to build ${compiler.name}: ${err}`));
    throw err;
  }
}

async function buildAll(options: DockerBuildOptions): Promise<void> {
  console.log(chalk.bold.blue('\n[*] Building all Docker images...\n'));

  for (const compilerKey of Object.keys(COMPILERS)) {
    await buildDockerImage(compilerKey, options);
  }

  console.log(chalk.bold.green('\n[+] All Docker images built\n'));
}

const options = parseArgs();

// Check Docker availability
isDockerRunning().then(available => {
  if (!available) {
    console.error(chalk.red('\n[X] Docker is not running. Please start Docker and try again.\n'));
    process.exit(1);
  }

  if (!options.service && !options.all) {
    console.log(chalk.yellow('Usage: pnpm build:docker <service> [options]'));
    console.log(chalk.gray('\nServices:'));
    Object.keys(COMPILERS).forEach(key => {
      console.log(chalk.gray(`  ${key}: ${COMPILERS[key as keyof typeof COMPILERS].name}`));
    });
    console.log(chalk.gray('\nOptions:'));
    console.log(chalk.gray('  --all          Build all compilers'));
    console.log(chalk.gray('  --build-only   Build without starting containers'));
    console.log(chalk.gray('  --push         Push to GHCR after build'));
    console.log(chalk.gray('  --tag <tag>    Tag for push (default: latest)'));
    process.exit(0);
  }

  if (options.all) {
    buildAll(options).catch(err => {
      console.error(chalk.red('[X] Build failed:'), err);
      process.exit(1);
    });
  } else if (options.service) {
    buildDockerImage(options.service, options).catch(err => {
      console.error(chalk.red('[X] Build failed:'), err);
      process.exit(1);
    });
  }
});
