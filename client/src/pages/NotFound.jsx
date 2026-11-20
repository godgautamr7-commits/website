import { Link } from 'react-router-dom';
import Icon from '../components/icons';
import { Logo } from '../components/ui';

export default function NotFound() {
  return (
    <div className="relative flex min-h-[75vh] items-center justify-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute right-1/4 top-1/2 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl" />
      </div>
      <div className="relative z-10 mx-auto max-w-lg text-center">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <p className="font-display text-[92px] font-bold leading-none text-gradient-neon sm:text-[130px]">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">This world hasn&apos;t been generated yet</h1>
        <p className="mt-3 text-sm text-slate-400">
          The page you&apos;re looking for doesn&apos;t exist, was moved, or the chunk failed to load. Let&apos;s get you back to safety.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/" className="btn-primary"><Icon name="home" size={17} /> Back to home</Link>
          <Link to="/plans" className="btn-ghost"><Icon name="layers" size={17} /> Browse hosting plans</Link>
        </div>
        <p className="mt-8 text-xs text-slate-500">
          Need help? <Link to="/contact" className="font-semibold text-cyan-300 hover:underline">Contact support</Link>
        </p>
      </div>
    </div>
  );
}
