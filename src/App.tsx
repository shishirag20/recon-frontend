import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { DataHubPage } from './pages/DataHubPage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import { GenericWorkspacePage } from './pages/GenericWorkspacePage';
import { ARWorkspacePage } from './pages/ARWorkspacePage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { IntercompanyPage } from './pages/IntercompanyPage';
import { NotFoundPage } from './pages/NotFoundPage';

const AppLayout: React.FC = () => {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/data-hub" replace />,
      },
      {
        path: 'data-hub',
        element: <DataHubPage />,
      },
      {
        path: 'reconciliation',
        element: <ReconciliationPage />,
      },
      {
        path: 'reconciliation/:category',
        element: <ReconciliationPage />,
      },
      {
        path: 'reconciliation/workspace/:id',
        element: <GenericWorkspacePage />,
      },
      {
        path: 'reconciliation/ar/:id',
        element: <ARWorkspacePage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'intercompany',
        element: <IntercompanyPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}

export default App;
