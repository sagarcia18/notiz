import type { ReactElement } from 'react';
import styles from './ServerStatus.module.css';

interface ServerStatusProps {
  isLoading: boolean;
  isHealthy: boolean;
  errorMessage: string | undefined;
}

export function ServerStatus({
  isLoading,
  isHealthy,
  errorMessage,
}: ServerStatusProps): ReactElement {
  if (isLoading) {
    return <p className={styles.muted}>Checking server…</p>;
  }
  if (errorMessage !== undefined || !isHealthy) {
    return <p className={styles.error}>Server unreachable: {errorMessage ?? 'unknown error'}</p>;
  }
  return <p className={styles.ok}>Server and database are running.</p>;
}
