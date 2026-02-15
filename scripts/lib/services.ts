export type ServiceType = 'wails' | 'vite' | 'docker' | 'process';

export interface Service {
  name: string;
  type: ServiceType;
  port: number | null;
  healthCheck: string | null;
  healthCheckTimeout: number;
  startCommand: string | null;
  stopCommand: string | null;
  dependsOn: string[];
  dockerContainer?: string;
  env?: Record<string, string>;
}

export const SERVICES: Record<string, Service> = {
  desktop: {
    name: 'Desktop App',
    type: 'wails',
    port: null,
    healthCheck: null,
    healthCheckTimeout: 0,
    startCommand: 'cd apps/desktop && wails dev',
    stopCommand: null,
    dependsOn: [],
  },
  website: {
    name: 'Website',
    type: 'vite',
    port: 3000,
    healthCheck: 'http://localhost:3000',
    healthCheckTimeout: 30000,
    startCommand: 'cd apps/website && pnpm dev',
    stopCommand: null,
    dependsOn: [],
  },
  'local-compiler': {
    name: 'Local LaTeX Compiler',
    type: 'docker',
    port: 8080,
    healthCheck: 'http://localhost:8080/health',
    healthCheckTimeout: 60000,
    startCommand: 'cd apps/local-latex-compiler && docker compose up --build',
    stopCommand: 'cd apps/local-latex-compiler && docker compose down',
    dependsOn: [],
    dockerContainer: 'treefrog-local-latex-compiler',
  },
  'remote-compiler': {
    name: 'Remote LaTeX Compiler',
    type: 'docker',
    port: 9000,
    healthCheck: 'http://localhost:9000/health',
    healthCheckTimeout: 90000,
    startCommand: 'cd apps/remote-latex-compiler && docker compose --env-file .env.development up --build',
    stopCommand: 'cd apps/remote-latex-compiler && docker compose down',
    dependsOn: ['redis'],
    dockerContainer: 'treefrog-remote-latex-compiler',
  },
  redis: {
    name: 'Redis',
    type: 'docker',
    port: 6379,
    healthCheck: 'redis-cli ping',
    healthCheckTimeout: 10000,
    startCommand: null,
    stopCommand: null,
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
