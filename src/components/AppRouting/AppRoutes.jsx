import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthWrapper from '../AppShell/AuthWrapper';

const ConversionLandingPage = lazy(() => import('../LandingPage/ConversionLandingPage'));
const ConsiderationLandingPage = lazy(() => import('../LandingPage/ConsiderationLandingPage'));
const TutorialPage = lazy(() => import('../LandingPage/TutorialPage'));
const BlogList = lazy(() => import('../Blog/BlogList'));
const BlogPost = lazy(() => import('../Blog/BlogPost'));

function AppRoutes() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/ai-chiropractic-soap-notes" replace />} />
        <Route path="/ai-chiropractic-soap-notes" element={<ConsiderationLandingPage />} />
        <Route path="/learn-more" element={<ConversionLandingPage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/app/*" element={<AuthWrapper />} />
        <Route path="*" element={<Navigate to="/ai-chiropractic-soap-notes" replace />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
