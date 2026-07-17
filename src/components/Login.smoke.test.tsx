import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Login } from './Login';

describe('Login render', () => {
  it('mounts without throwing and shows the key fields', () => {
    const qc = new QueryClient();
    const html = renderToString(
      <QueryClientProvider client={qc}>
        <Login onConnected={() => {}} />
      </QueryClientProvider>,
    );
    expect(html).toContain('Server URL');
    expect(html).toContain('Sync ID');
    expect(html).toContain('encryption key');
    expect(html).toContain('Analyze my finances');
  });
});
