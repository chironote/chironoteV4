import { useEffect, useState } from 'react';
import { isNativePlatform } from '../../services/nativePlatform';
export default function useDesktopSave() {
  const [desktop, setDesktop] = useState(() => window.matchMedia?.('(min-width: 900px) and (pointer: fine)').matches === true);
  useEffect(() => {
    const media = window.matchMedia?.('(min-width: 900px) and (pointer: fine)');
    if (!media) return undefined;
    const update = () => setDesktop(media.matches); media.addEventListener?.('change', update); update();
    return () => media.removeEventListener?.('change', update);
  }, []);
  // Installed apps support Save on phones; mobile browsers retain the web gate.
  return isNativePlatform() || desktop;
}
