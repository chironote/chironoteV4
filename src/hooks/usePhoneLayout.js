import { useEffect, useState } from 'react';

const positiveDimension = value => Number.isFinite(value) && value > 0;

export const isPhoneLayout = (viewport = window) => {
  const screen = viewport.screen;
  const phoneScreen = positiveDimension(screen?.width) && positiveDimension(screen?.height) &&
    Math.min(screen.width, screen.height) <= 600;
  return (positiveDimension(viewport.innerWidth) && viewport.innerWidth <= 600) || phoneScreen;
};

export default function usePhoneLayout() {
  const [phoneLayout, setPhoneLayout] = useState(() => isPhoneLayout());
  useEffect(() => {
    const update = () => setPhoneLayout(isPhoneLayout());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  return phoneLayout;
}
