import { execa } from 'execa';

export interface DockerContainerInfo {
  name: string;
  status: 'running' | 'stopped' | 'unknown';
  ports: string[];
}

export async function isDockerRunning(): Promise<boolean> {
  try {
    await execa('docker', ['info'], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export async function getContainerStatus(containerName: string): Promise<'running' | 'stopped' | 'unknown'> {
  try {
    const { stdout } = await execa('docker', [
      'inspect',
      '-f',
      '{{.State.Running}}',
      containerName,
    ], { reject: false, timeout: 5000 });
    
    if (stdout.trim() === 'true') {
      return 'running';
    } else if (stdout.trim() === 'false') {
      return 'stopped';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function stopContainer(containerName: string): Promise<boolean> {
  try {
    await execa('docker', ['stop', containerName], { timeout: 30000 });
    await execa('docker', ['rm', '-f', containerName], { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

export async function getContainerLogs(containerName: string, options: {
  follow?: boolean;
  tail?: number;
  since?: string;
} = {}): Promise<void> {
  const args = ['logs'];
  
  if (options.tail) {
    args.push('--tail', String(options.tail));
  }
  if (options.since) {
    args.push('--since', options.since);
  }
  if (options.follow) {
    args.push('-f');
  }
  
  args.push(containerName);
  
  await execa('docker', args, { stdio: 'inherit' });
}

export async function getContainerPort(containerName: string): Promise<number | null> {
  try {
    const { stdout } = await execa('docker', [
      'port',
      containerName,
    ], { reject: false, timeout: 5000 });
    
    const match = stdout.match(/:(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

export async function waitForHealthyContainer(
  containerName: string,
  options: { timeout?: number; interval?: number } = {}
): Promise<boolean> {
  const timeout = options.timeout ?? 90000;
  const interval = options.interval ?? 2000;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const status = await getContainerStatus(containerName);
    if (status === 'running') {
      try {
        const { stdout } = await execa('docker', [
          'inspect',
          '-f',
          '{{.State.Health.Status}}',
          containerName,
        ], { reject: false, timeout: 5000 });
        
        if (stdout.trim() === 'healthy') {
          return true;
        }
      } catch {
        return status === 'running';
      }
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return false;
}

export async function containerExists(containerName: string): Promise<boolean> {
  try {
    await execa('docker', ['inspect', containerName], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
