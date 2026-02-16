export type ServiceType = 'docker' | 'process';

export interface Service {
  name: string;
  type: ServiceType;
  port: number | null;
  healthCheck: string | null;
  healthCheckTimeout: number;
  startCommand?: string;
  stopCommand?: string;
  cwd?: string;
  dependsOn: string[];
  dockerContainer?: string;
  envFile?: string;
  env?: Record<string, string>;
}

export const SERVICES: Record<string, Service> = {
  desktop: {
    name: 'Desktop App',
    type: 'process',
    port: null,
    healthCheck: null,
    healthCheckTimeout: 0,
    startCommand: 'wails dev',
    cwd: 'apps/desktop',
    dependsOn: [],
    env: {
      TREEFROG_DEV: 'true',
      SUPABASE_URL: 'https://pmlqyqkitngxqmqfevke.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_vyUbGPkiA8_hDT74wuf4sg_KvTdxPUq',
    },
  },
  website: {
    name: 'Website',
    type: 'process',
    port: 3000,
    healthCheck: 'http://localhost:3000',
    healthCheckTimeout: 30000,
    startCommand: 'pnpm dev',
    cwd: 'apps/website',
    dependsOn: [],
  },
  'local-compiler': {
    name: 'Local LaTeX Compiler',
    type: 'docker',
    port: 8080,
    healthCheck: 'http://localhost:8080/health',
    healthCheckTimeout: 120000,
    startCommand: 'docker compose up --build -d',
    stopCommand: 'docker compose down',
    cwd: 'apps/local-latex-compiler',
    dependsOn: [],
    dockerContainer: 'treefrog-local-latex-compiler',
  },
  'remote-compiler': {
    name: 'Remote LaTeX Compiler',
    type: 'docker',
    port: 9000,
    healthCheck: 'http://localhost:9000/health',
    healthCheckTimeout: 120000,
    startCommand: 'docker compose up --build -d',
    stopCommand: 'docker compose down',
    cwd: 'apps/remote-latex-compiler',
    dependsOn: [],  // Redis is handled by compose.yml
    dockerContainer: 'treefrog-remote-latex-compiler',
    envFile: '.env.local',
  },
  redis: {
    name: 'Redis',
    type: 'docker',
    port: 6379,
    healthCheck: null,
    healthCheckTimeout: 30000,
    // No startCommand - only used for status checking
    // Redis is started via compose.yml when using remote-compiler
    dependsOn: [],
    dockerContainer: 'treefrog-redis',
  },
};

export function getService(key: string): Service | undefined {
  return SERVICES[key];
}

export function getAllServices(): string[] {
  return Object.keys(SERVICES);
}
