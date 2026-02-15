import chalk from 'chalk';
import { execa } from 'execa';

interface BuildOptions {
  allPlatforms: boolean;
  platform?: string;
}

function parseArgs(): BuildOptions {
  const args = process.argv.slice(2);
  const options: BuildOptions = {
    allPlatforms: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--all-platforms' || arg === '--all') {
      options.allPlatforms = true;
    } else if (arg === '--platform') {
      options.platform = args[++i];
    }
  }

  return options;
}

async function buildFrontend(): Promise<void> {
  console.log(chalk.bold.blue('\n[*] Building frontend...\n'));

  await execa('pnpm', ['install'], {
    cwd: 'apps/desktop/frontend',
    stdio: 'inherit',
  });

  await execa('pnpm', ['build'], {
    cwd: 'apps/desktop/frontend',
    stdio: 'inherit',
  });

  console.log(chalk.green('[+] Frontend built'));
}

async function generateWailsBindings(): Promise<void> {
  console.log(chalk.bold.blue('\n[*] Generating Wails bindings...\n'));

  await execa('wails', ['build', '-s'], {
    cwd: 'apps/desktop',
    stdio: 'inherit',
  });

  console.log(chalk.green('[+] Wails bindings generated'));
}

async function buildDesktop(options: BuildOptions): Promise<void> {
  console.log(chalk.bold.blue('\n[*] Building Treefrog desktop app...\n'));

  // Step 1: Generate bindings
  await generateWailsBindings();

  // Step 2: Build frontend
  await buildFrontend();

  // Step 3: Build desktop app
  if (options.allPlatforms) {
    console.log(chalk.bold.blue('\n[*] Building for all platforms...\n'));

    const platforms = [
      { name: 'macOS (Intel)', platform: 'darwin/amd64' },
      { name: 'macOS (Apple Silicon)', platform: 'darwin/arm64' },
      { name: 'Windows', platform: 'windows/amd64' },
      { name: 'Linux', platform: 'linux/amd64' },
    ];

    for (const { name, platform } of platforms) {
      console.log(chalk.cyan(`Building for ${name}...`));
      try {
        await execa('wails', ['build', '-platform', platform], {
          cwd: 'apps/desktop',
          stdio: 'inherit',
        });
        console.log(chalk.green(`[+] ${name} build complete`));
      } catch (err) {
        console.error(chalk.red(`[X] ${name} build failed: ${err}`));
      }
    }
  } else if (options.platform) {
    console.log(chalk.cyan(`Building for platform: ${options.platform}...`));
    await execa('wails', ['build', '-platform', options.platform], {
      cwd: 'apps/desktop',
      stdio: 'inherit',
    });
  } else {
    // Build for current platform
    console.log(chalk.cyan('Building for current platform...'));
    await execa('wails', ['build'], {
      cwd: 'apps/desktop',
      stdio: 'inherit',
    });
  }

  console.log(chalk.bold.green('\n[+] Build complete: apps/desktop/build/bin/\n'));
}

const options = parseArgs();

buildDesktop(options).catch(err => {
  console.error(chalk.red('[X] Build failed:'), err);
  process.exit(1);
});
