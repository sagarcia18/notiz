import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { PageView } from '../features/pages/PageView';
import { HomePage } from '../features/system/HomePage';
import { TrashPage } from '../features/trash/TrashPage';
import { AppLayout } from './AppLayout';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'pages/:pageId', element: <PageView /> },
      { path: 'trash', element: <TrashPage /> },
    ],
  },
]);

export function App(): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
