import chalk from 'chalk';
import { execa } from 'execa';

interface DockerBuildOptions {
  service?: string;
  all: boolean;
  push: boolean;
  tag?: string;
  env: 'development' | 'production';
}

function parseArgs(): DockerBuildOptions {
  const args = process.argv.slice(2);
  const options: DockerBuildOptions = {
    all: false,
    env: 'development',
    push: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--all') {
      options.all = true;
    } else if (arg === '--push') {
      options.push = true;
    } else if (arg === '--tag') {
      options.tag = args[++i];
    } else if (arg === '--env') {
      options.env = args[++i] as 'development' | 'production';
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
  },
  'remote-compiler': {
    name: 'Remote LaTeX Compiler',
    composeDir: 'apps/remote-latex-compiler',
    imageName: 'treefrog-remote-latex-compiler',
    ghcrImage: 'ghcr.io/alpha-og/treefrog/remote-latex-compiler',
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

  const envFile = options.env === 'production' ? '.env.production' : '.env.development';
  const tag = options.tag || 'latest';

  try {
    // Build using docker compose
    const composeArgs = ['compose'];
    
    if (options.env !== 'production') {
      composeArgs.push('--env-file', envFile);
    }
    
    composeArgs.push('up', '--build', '-d');

    await execa('docker', composeArgs, {
      cwd: compiler.composeDir,
      stdio: 'inherit',
    });

    console.log(chalk.green(`[+] ${compiler.name} built and started`));

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

if (!options.service && !options.all) {
  console.log(chalk.yellow('Usage: pnpm build:docker <service> [options]'));
  console.log(chalk.gray('\nServices:'));
  Object.keys(COMPILERS).forEach(key => {
    console.log(chalk.gray(`  ${key}: ${COMPILERS[key as keyof typeof COMPILERS].name}`));
  });
  console.log(chalk.gray('\nOptions:'));
  console.log(chalk.gray('  --all          Build all compilers'));
  console.log(chalk.gray('  --env <env>    Environment: development | production (default: development)'));
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
