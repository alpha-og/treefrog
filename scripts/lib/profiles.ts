import type { Service } from './services.js';
import { SERVICES } from './services.js';

export interface Profile {
  name: string;
  description: string;
  services: string[];
  startupOrder: string[];
  env?: Record<string, string>;
}

export const PROFILES: Record<string, Profile> = {
  'desktop-local': {
    name: 'Desktop + Local Compiler',
    description: 'Desktop app with local compiler (no auth required)',
    services: ['local-compiler', 'desktop'],
    startupOrder: ['local-compiler', 'desktop'],
  },
  'desktop-remote': {
    name: 'Desktop + Remote Compiler',
    description: 'Desktop app with remote compiler and website (auth required)',
    services: ['remote-compiler', 'website', 'desktop'],
    startupOrder: ['remote-compiler', 'website', 'desktop'],
  },
  'website-compiler': {
    name: 'Website + Compiler',
    description: 'Website with remote compiler backend',
    services: ['remote-compiler', 'website'],
    startupOrder: ['remote-compiler', 'website'],
  },
  'full': {
    name: 'Full Stack',
    description: 'All services running together',
    services: ['local-compiler', 'remote-compiler', 'website', 'desktop'],
    startupOrder: ['local-compiler', 'remote-compiler', 'website', 'desktop'],
  },
  'compiler-only': {
    name: 'Remote Compiler Only',
    description: 'Just the remote compiler with Redis',
    services: ['remote-compiler'],
    startupOrder: ['remote-compiler'],
  },
  'local-only': {
    name: 'Local Compiler Only',
    description: 'Just the local compiler',
    services: ['local-compiler'],
    startupOrder: ['local-compiler'],
  },
  'website-only': {
    name: 'Website Only',
    description: 'Just the website',
    services: ['website'],
    startupOrder: ['website'],
  },
  'desktop-only': {
    name: 'Desktop Only',
    description: 'Just the desktop app (requires external compiler)',
    services: ['desktop'],
    startupOrder: ['desktop'],
  },
};

export function getProfile(key: string): Profile | undefined {
  return PROFILES[key];
}

export function getAllProfiles(): string[] {
  return Object.keys(PROFILES);
}

export function resolveDependencies(services: string[]): string[] {
  const resolved = new Set<string>();
  const pending = [...services];

  while (pending.length > 0) {
    const service = pending.shift()!;
    if (resolved.has(service)) continue;

    const serviceDef = SERVICES[service];
    if (!serviceDef) continue;

    let canAdd = true;
    for (const dep of serviceDef.dependsOn) {
      if (!resolved.has(dep)) {
        canAdd = false;
        pending.unshift(service);
        pending.unshift(dep);
        break;
      }
    }

    if (canAdd) {
      resolved.add(service);
    }
  }

  return Array.from(resolved);
}
