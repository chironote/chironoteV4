import React, { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { hasLoadedMetaPixel, updateMetaPixelConsent } from '../../utils/metaPixel';

const LandingPage = lazy(() => import('../LandingPage/LandingPage'));
const DemoLandingPage = lazy(() => import('../LandingPage/DemoLandingPage'));
const TutorialPage = lazy(() => import('../LandingPage/TutorialPage'));
const BlogList = lazy(() => import('../Blog/BlogList'));
const BlogPost = lazy(() => import('../Blog/BlogPost'));
const AuthWrapper = lazy(() => import('../AppShell/AuthWrapper'));

// Removing a script does not unload its listeners. Enter the clinical app in a
// fresh document if this document has loaded the marketing SDK.
export function ApplicationEntry() {
  const location = useLocation();
  const needsFreshDocument = hasLoadedMetaPixel();
  useEffect(() => {
    if (!needsFreshDocument) return;
    updateMetaPixelConsent(false);
    window.location.replace(`${location.pathname}${location.search}${location.hash}`);
  }, [needsFreshDocument, location.pathname, location.search, location.hash]);
  return needsFreshDocument ? null : <AuthWrapper />;
}

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
        <Route path="/app/*" element={<ApplicationEntry />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
