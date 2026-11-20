/* Notification bell — soft rounded pill with a number badge, as in the
   reference picture (badge "5", a wider "12" pill, or no badge at all).
   Fed by the site's live announcements; click opens a glass dropdown. */
import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useContent } from '@/context/ContentContext';
import { Rich } from '@/components/Emoji';
import { cn } from '@/lib/utils';

const SEEN_KEY = 'legacycloud_seen_notifications';
const readSeen = () => {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; }
};

export function NotificationBell({ className = '' }) {
  const { data } = useContent();
  const items = (data?.announcements || []).filter((a) => a.is_active);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(readSeen);
  const ref = useRef(null);

  // badge = announcements the visitor has not opened yet
  const unseen = items.filter((a) => !seen.includes(a.id)).length;
  const label = unseen > 99 ? '99+' : String(unseen);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && items.length) {
      const all = Array.from(new Set([...seen, ...items.map((a) => a.id)]));
      // keep the badge visible while the panel is open; clear it on close
      setTimeout(() => {
        setSeen(all);
        try { localStorage.setItem(SEEN_KEY, JSON.stringify(all)); } catch { /* storage unavailable */ }
      }, 1200);
    }
  }

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="bell-pill"
        aria-label={unseen ? `Notifications (${unseen} new)` : 'Notifications'}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bell size={18} strokeWidth={1.7} aria-hidden="true" />
        {unseen > 0 && <span className="bell-badge" data-wide={label.length > 1}>{label}</span>}
      </button>

      {open && (
        <div className="bell-panel" role="region" aria-label="Notifications">
          <p className="bell-panel-head">Notifications</p>
          {items.length === 0 ? (
            <p className="bell-empty">You&apos;re all caught up.</p>
          ) : (
            <ul>
              {items.map((a) => (
                <li key={a.id}>
                  <b><Rich text={a.title} /></b>
                  {a.body ? <span><Rich text={a.body} /></span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
