import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function PWARedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone ||
      document.referrer.includes('android-app://');

    if (isPWA && location.pathname === '/') {
      navigate('/app');
    }
  }, [navigate, location]);

  return null;
}

export default PWARedirect;
