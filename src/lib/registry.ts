import * as fs from 'fs';
import * as path from 'path';
import { RegistryZ, type Registry, type RegistryPlatform } from '../types';

const REGISTRY_PATH = path.join(__dirname, '../../registry/platforms.json');

let _registry: Registry | null = null;

export function loadRegistry(): Registry {
  if (_registry) return _registry;
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf-8');
  _registry = RegistryZ.parse(JSON.parse(raw));
  return _registry;
}

export function findPlatform(nameOrAlias: string): RegistryPlatform | null {
  const registry = loadRegistry();
  const needle = nameOrAlias.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  return registry.platforms.find(p =>
    p.id === needle ||
    p.aliases.some(a => a.toLowerCase() === needle)
  ) ?? null;
}

export function listPlatforms(): RegistryPlatform[] {
  return loadRegistry().platforms;
}

export function listAuditedPlatforms(): RegistryPlatform[] {
  return loadRegistry().platforms.filter(p => p.audit_result !== null);
}
