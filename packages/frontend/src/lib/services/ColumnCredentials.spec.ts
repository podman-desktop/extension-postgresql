import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import ColumnCredentials from './ColumnCredentials.svelte';

test('displays the user and toggles password visibility', async () => {
  const user = userEvent.setup();
  render(ColumnCredentials, {
    object: {
      running: true,
      name: 'postgresql',
      imageName: 'docker.io/library/postgres',
      imageVersion: '17',
      containerId: 'container-1',
      engineId: 'engine-1',
      port: 5432,
      dbName: 'postgres',
      user: 'postgres',
      password: 'test-password',
      pgadmin: false,
    },
  });

  expect(screen.getByText('postgres')).toBeVisible();
  expect(screen.queryByText('test-password')).not.toBeInTheDocument();
  const passwordToggle = screen.getByRole('button', { name: '********' });

  await user.click(passwordToggle);
  expect(passwordToggle).toHaveTextContent('test-password');

  await user.click(passwordToggle);
  expect(passwordToggle).toHaveTextContent('********');
  expect(screen.queryByText('test-password')).not.toBeInTheDocument();
});
