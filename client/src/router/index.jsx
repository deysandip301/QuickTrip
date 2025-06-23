import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import HomePage from '../components/HomePage';
import PlanningPage from '../components/PlanningPage';
import JourneyResultPage from '../components/JourneyResultPage';
import SavedJourneys from '../components/SavedJourneys';
import AuthPage from '../components/AuthPage';
import ErrorPage from '../components/ErrorPage';

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
