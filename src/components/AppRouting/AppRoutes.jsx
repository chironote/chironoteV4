import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

const LandingPage = lazy(() => import('../LandingPage/LandingPage'));
const DemoLandingPage = lazy(() => import('../LandingPage/DemoLandingPage'));
const TutorialPage = lazy(() => import('../LandingPage/TutorialPage'));
const BlogList = lazy(() => import('../Blog/BlogList'));
const BlogPost = lazy(() => import('../Blog/BlogPost'));
const AuthWrapper = lazy(() => import('../AppShell/AuthWrapper'));

function AppRoutes() {
  return (
    <Suspense fallback={<div role="status" aria-label="Loading page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>Loading...</div>}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<DemoLandingPage />} />
        <Route path="/ai-chiropractic-soap-notes" element={<Navigate to="/" replace />} />
        <Route path="/learn-more" element={<Navigate to="/" replace />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/app/*" element={<AuthWrapper />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
