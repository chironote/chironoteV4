import { isNativePlatform } from '../../services/nativePlatform';
import { useEffect, useState } from 'react';
export default function useDesktopSave() {
  const [desktop, setDesktop] = useState(() => window.matchMedia?.('(min-width: 900px) and (pointer: fine)').matches === true);
  useEffect(() => {
    const media = window.matchMedia?.('(min-width: 900px) and (pointer: fine)');
    if (!media) return undefined;
    const update = () => setDesktop(media.matches); media.addEventListener?.('change', update); update();
    return () => media.removeEventListener?.('change', update);
  }, []);
  return isNativePlatform() || desktop;
}
