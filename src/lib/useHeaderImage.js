import { useEffect, useState } from 'react';
import defaultLogo from '../assets/logo-180x180.png';

export default function useHeaderImage() {
  const [url, setUrl] = useState(defaultLogo);
  useEffect(() => {
    let image;
    const reset = () => {
      try { localStorage.removeItem('hfl_header_art'); } catch { /* Storage may be disabled. */ }
      setUrl(defaultLogo);
    };
    try {
      const stored = localStorage.getItem('hfl_header_art');
      if (!stored) return;
      const parsed = new URL(stored, location.href);
      if (!(parsed.origin === location.origin && ['http:', 'https:'].includes(parsed.protocol)) && !/^data:image\/(png|jpeg|gif|webp);base64,/i.test(stored)) { reset(); return; }
      image = new Image();
      image.onload = () => setUrl(stored);
      image.onerror = reset;
      image.src = stored;
    } catch { reset(); }
    return () => { if (image) { image.onload = null; image.onerror = null; } };
  }, []);
  return url;
}
