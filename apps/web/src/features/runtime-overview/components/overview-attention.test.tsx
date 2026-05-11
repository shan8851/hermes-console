import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OverviewAttention, createAttentionHref, getVisibleAttentionItems } from './overview-attention';
import type { AttentionItem, RuntimeOverviewSummary } from '@hermes-console/runtime';

const createAttentionItem = (overrides: Partial<AttentionItem> & Pick<AttentionItem, 'id'>): AttentionItem => ({
  id: overrides.id,
  severity: overrides.severity ?? 'warning',
  domain: overrides.domain ?? 'runtime',
  title: overrides.title ?? overrides.id,
  summary: overrides.summary ?? 'Needs review.',
  ...(overrides.evidence ? { evidence: overrides.evidence } : {}),
  ...(overrides.href ? { href: overrides.href } : {}),
  ...(overrides.profileId ? { profileId: overrides.profileId } : {}),
  ...(overrides.profileLabel ? { profileLabel: overrides.profileLabel } : {}),
  isActionable: overrides.isActionable ?? true,
  isOptionalSurface: overrides.isOptionalSurface ?? false
});

const createOverview = (attentionItems: AttentionItem[]): RuntimeOverviewSummary => ({
  capturedAt: '2026-04-12T08:57:29.000Z',
  verdict: {
    status: 'needs_attention',
    label: 'Needs attention',
    summary: 'There are items to review.'
  },
  warnings: [],
  attentionItems,
  runtimeHealth: [],
  platforms: [],
  access: {
    authProviders: [],
    apiKeys: []
  },
  runtimeProfile: [],
  activity: {
    sessionCount: 0,
    cronAttentionJobs: 0,
    overdueCronJobs: 0,
    contentfulCronJobs: 0,
    memoryPressure: 'healthy'
  },
  installStatus: 'ready',
  availableAgentCount: 1,
  totalAgentCount: 1,
  gatewayState: 'running',
  gatewayUpdatedAt: '2026-04-11T21:57:53.000Z',
  connectedPlatforms: [],
  configuredPlatforms: [],
  configuredPlatformCount: 0,
  updateBehind: 0,
  updateStatus: 'up_to_date',
  doctorIssueCount: 0
});

describe('OverviewAttention', () => {
  it('renders a calm empty state when no attention items exist', () => {
    render(<OverviewAttention overview={createOverview([])} profileScope="all" />);

    expect(screen.getByText('Needs attention')).toBeTruthy();
    expect(screen.getByText('Nothing urgent found.')).toBeTruthy();
  });

  it('shows five items by default and expands the rest on request', () => {
    const items = Array.from({ length: 6 }).map((_, index) =>
      createAttentionItem({
        id: `item-${index}`,
        title: `Attention item ${index}`
      })
    );

    render(<OverviewAttention overview={createOverview(items)} profileScope="all" />);

    expect(screen.getByText('Attention item 0')).toBeTruthy();
    expect(screen.queryByText('Attention item 5')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show all 6' }));

    expect(screen.getByText('Attention item 5')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show less' })).toBeTruthy();
  });

  it('preserves profile scope for profile-aware list links', () => {
    expect(
      createAttentionHref({
        item: createAttentionItem({
          id: 'memory:pressure',
          domain: 'memory',
          href: '/memory'
        }),
        profileScope: 'nigel'
      })
    ).toBe('/memory?profile=nigel');
  });

  it('does not add profile scope to cron detail links that already identify an agent and job', () => {
    expect(
      createAttentionHref({
        item: createAttentionItem({
          id: 'cron:default:nightly',
          domain: 'cron',
          href: '/cron/default/nightly'
        }),
        profileScope: 'default'
      })
    ).toBe('/cron/default/nightly');
  });

  it('keeps the preview helper stable for collapsed and expanded states', () => {
    const items = Array.from({ length: 7 }).map((_, index) =>
      createAttentionItem({
        id: `item-${index}`
      })
    );

    expect(getVisibleAttentionItems({ expanded: false, items })).toHaveLength(5);
    expect(getVisibleAttentionItems({ expanded: true, items })).toHaveLength(7);
  });
});
