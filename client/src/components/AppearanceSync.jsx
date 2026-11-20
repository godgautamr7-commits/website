import { useEffect } from 'react';
import { useContent } from '../context/ContentContext';
import { useTheme } from '../context/themeContext';

/* Pushes the admin's saved appearance (from /home) into the theme system. */
export default function AppearanceSync() {
  const { data } = useContent();
  const { setAdminAppearance } = useTheme();
  const appearance = data?.appearance;
  useEffect(() => { if (appearance) setAdminAppearance(appearance); }, [appearance, setAdminAppearance]);
  return null;
}
