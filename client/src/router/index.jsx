import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import { 
  HomePage, 
  PlanningPage, 
  JourneyResultPage, 
  SavedJourneys, 
  ErrorPage 
} from '../pages';
import { AuthPage } from '../features/auth';

// Create the router configuration
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: 'planning/:mode',
        element: <PlanningPage />
      },
      {
        path: 'journey-result',
        element: <JourneyResultPage />
      },
      {
        path: 'saved-journeys',
        element: <SavedJourneys />
      },
      {
        path: 'auth',
        element: <AuthPage />
      },
      {
        path: '*',
        element: <Navigate to="/" replace />
      }
    ]
  }
]);
