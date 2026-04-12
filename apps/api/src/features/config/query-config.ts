import { readHermesInstallationResult } from '@/features/inventory/read-installation';
import { readHermesConfig } from '@/features/config/read-config';
import { createHermesQueryResult } from '@hermes-console/runtime';
import type { HermesConfigIndex, HermesQueryIssue, HermesQueryResult } from '@hermes-console/runtime';

export function readHermesConfigQuery(): HermesQueryResult<HermesConfigIndex> {
  const installation = readHermesInstallationResult();
  const config = readHermesConfig();
  const issues: HermesQueryIssue[] = [...installation.issues];

  if (!installation.data.hermesRootExists) {
    issues.push({
      id: 'config-hermes-root-missing',
      code: 'missing_path',
      severity: 'error',
      summary: 'Hermes root not found',
      detail: 'Configuration could not be read because the configured Hermes root does not exist.',
      path: installation.data.paths.hermesRoot.path
    });
  }

  if (config.files.length === 0) {
    issues.push({
      id: 'config-no-files',
      code: 'missing_path',
      severity: 'warning',
      summary: 'No config files found',
      detail: 'No config.yaml files were found for any discovered agent.',
      path: installation.data.paths.hermesRoot.path
    });
  }

  return createHermesQueryResult({
    data: config,
    capturedAt: new Date().toISOString(),
    status: !installation.data.hermesRootExists
      ? 'missing'
      : issues.length > 0 || installation.data.status === 'partial'
        ? 'partial'
        : 'ready',
    issues
  });
}
