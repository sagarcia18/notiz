import type { ReactElement } from 'react';
import { ServerStatus } from './ServerStatus';
import { useHealth } from './useHealth';

export function HomePage(): ReactElement {
  const health = useHealth();
  return (
    <section>
      <h1>Welcome to Notiz</h1>
      <ServerStatus
        isLoading={health.isPending}
        errorMessage={health.error?.message}
        isHealthy={health.data?.status === 'ok'}
      />
    </section>
  );
}
