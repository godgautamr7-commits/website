/* Sign-in card (3D tilt, travelling light-beam border, glass body).
   Ported from the "sign-in-card-2" prompt to this project's stack
   (Vite + React + JSX): `next/link` -> react-router `Link`, TypeScript removed.

   It is a controlled component so it can drive the real login form, and it
   falls back to its own state when used stand-alone (see demo.jsx).
   `transparent` (default) drops the full-screen black/purple backdrop so the
   site background shows through the glass card. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Mail, Lock, Eye, EyeClosed, ArrowRight, User } from 'lucide-react';

import { cn } from '@/lib/utils';

/* Arbitrary radii (rounded-[..]) on purpose: the Legacy theme squares every
   `.rounded-xl / .rounded-2xl` class, and this card must stay curved. */
function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-10 w-full min-w-0 rounded-full border border-transparent bg-white/5 px-3 py-1 text-base text-white outline-none',
        'placeholder:text-white/30 transition-all duration-300 focus:border-white/20 focus:bg-white/10 md:text-sm',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-rose-400/60',
        className,
      )}
      {...props}
    />
  );
}

export function Component({
  title = 'Welcome Back',
  subtitle = 'Sign in to continue',
  logo = 'S',
  identifierLabel = 'Email address',
  identifierPlaceholder,
  identifierType = 'email',
  identifierAutoComplete = 'username',
  identifier: identifierProp,
  onIdentifierChange,
  password: passwordProp,
  onPasswordChange,
  remember: rememberProp,
  onRememberChange,
  loading: loadingProp,
  error,
  onSubmit,
  forgotTo = '/contact',
  forgotLabel = 'Forgot password?',
  signupTo = '/register',
  signupPrompt = "Don't have an account?",
  signupLabel = 'Sign up',
  showGoogle = false,
  onGoogle,
  transparent = true,
  className = '',
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  // stand-alone fallbacks
  const [emailLocal, setEmailLocal] = useState('');
  const [passwordLocal, setPasswordLocal] = useState('');
  const [rememberLocal, setRememberLocal] = useState(false);
  const [loadingLocal, setLoadingLocal] = useState(false);

  const identifier = identifierProp ?? emailLocal;
  const password = passwordProp ?? passwordLocal;
  const rememberMe = rememberProp ?? rememberLocal;
  const isLoading = loadingProp ?? loadingLocal;
  const setIdentifier = (v) => (onIdentifierChange ? onIdentifierChange(v) : setEmailLocal(v));
  const setPassword = (v) => (onPasswordChange ? onPasswordChange(v) : setPasswordLocal(v));
  const setRemember = (v) => (onRememberChange ? onRememberChange(v) : setRememberLocal(v));

  // 3D card effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [8, -8]);
  const rotateY = useTransform(mouseX, [-300, 300], [-8, 8]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };
  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) { onSubmit(e); return; }
    setLoadingLocal(true);
    setTimeout(() => setLoadingLocal(false), 2000);
  };

  const IdentifierIcon = identifierType === 'email' ? Mail : User;

  return (
    <div className={cn('relative flex w-full items-center justify-center', !transparent && 'min-h-screen overflow-hidden bg-black', className)}>
      {!transparent && <div className="absolute inset-0 bg-gradient-to-b from-purple-500/40 via-purple-700/50 to-black" />}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-sm"
        style={{ perspective: 1500 }}
      >
        <motion.div
          className="relative"
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileHover={{ z: 10 }}
        >
          <div className="group relative">
            {/* soft pulsing glow behind the card */}
            <motion.div
              className="absolute -inset-[1px] rounded-[1.75rem] opacity-0 transition-opacity duration-700 group-hover:opacity-70"
              animate={{
                boxShadow: [
                  '0 0 10px 2px rgba(255,255,255,0.03)',
                  '0 0 15px 5px rgba(255,255,255,0.06)',
                  '0 0 10px 2px rgba(255,255,255,0.03)',
                ],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', repeatType: 'mirror' }}
            />

            {/* travelling light beams around the border */}
            <div className="absolute -inset-[1px] overflow-hidden rounded-[1.75rem]">
              {[
                { side: 'top-0 left-0 h-[3px] w-[50%] bg-gradient-to-r', prop: 'left', delay: 0 },
                { side: 'top-0 right-0 h-[50%] w-[3px] bg-gradient-to-b', prop: 'top', delay: 0.6 },
                { side: 'bottom-0 right-0 h-[3px] w-[50%] bg-gradient-to-r', prop: 'right', delay: 1.2 },
                { side: 'bottom-0 left-0 h-[50%] w-[3px] bg-gradient-to-b', prop: 'bottom', delay: 1.8 },
              ].map((b) => (
                <motion.div
                  key={b.prop}
                  className={`absolute ${b.side} from-transparent via-white to-transparent opacity-70`}
                  initial={{ filter: 'blur(2px)' }}
                  animate={{
                    [b.prop]: ['-50%', '100%'],
                    opacity: [0.3, 0.7, 0.3],
                    filter: ['blur(1px)', 'blur(2.5px)', 'blur(1px)'],
                  }}
                  transition={{
                    [b.prop]: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: b.delay },
                    opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: b.delay },
                    filter: { duration: 1.5, repeat: Infinity, repeatType: 'mirror', delay: b.delay },
                  }}
                />
              ))}
            </div>

            {/* border glow on hover */}
            <div className="absolute -inset-[0.5px] rounded-[1.75rem] bg-gradient-to-r from-white/10 via-white/20 to-white/10 opacity-0 transition-opacity duration-500 group-hover:opacity-70" />

            {/* transparent glass body */}
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl">
              <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                  backgroundImage: 'linear-gradient(135deg, currentColor 0.5px, transparent 0.5px), linear-gradient(45deg, currentColor 0.5px, transparent 0.5px)',
                  backgroundSize: '30px 30px',
                }}
              />

              {/* logo + heading */}
              <div className="relative mb-5 space-y-1 text-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', duration: 0.8 }}
                  className="relative mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10"
                >
                  {typeof logo === 'string'
                    ? <span className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-lg font-bold text-transparent">{logo}</span>
                    : logo}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl font-bold text-white"
                >
                  {title}
                </motion.h1>

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-xs text-white/60">
                  {subtitle}
                </motion.p>
              </div>

              <form onSubmit={handleSubmit} className="relative space-y-4" noValidate>
                {error && (
                  <div role="alert" className="rounded-[1rem] border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>
                )}

                <div className="space-y-3">
                  {/* identifier */}
                  <motion.div
                    className={`relative ${focusedInput === 'identifier' ? 'z-10' : ''}`}
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <div className="relative flex items-center overflow-hidden rounded-full">
                      <IdentifierIcon className={`absolute left-3 h-4 w-4 transition-all duration-300 ${focusedInput === 'identifier' ? 'text-white' : 'text-white/40'}`} />
                      <Input
                        type={identifierType}
                        autoComplete={identifierAutoComplete}
                        placeholder={identifierPlaceholder || identifierLabel}
                        aria-label={identifierLabel}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        onFocus={() => setFocusedInput('identifier')}
                        onBlur={() => setFocusedInput(null)}
                        className="pl-10 pr-3"
                      />
                      {focusedInput === 'identifier' && (
                        <motion.div
                          layoutId="input-highlight"
                          className="absolute inset-0 -z-10 bg-white/5"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </div>
                  </motion.div>

                  {/* password */}
                  <motion.div
                    className={`relative ${focusedInput === 'password' ? 'z-10' : ''}`}
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <div className="relative flex items-center overflow-hidden rounded-full">
                      <Lock className={`absolute left-3 h-4 w-4 transition-all duration-300 ${focusedInput === 'password' ? 'text-white' : 'text-white/40'}`} />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Password"
                        aria-label="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedInput('password')}
                        onBlur={() => setFocusedInput(null)}
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 grid place-items-center rounded-full"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword
                          ? <Eye className="h-4 w-4 text-white/40 transition-colors duration-300 hover:text-white" />
                          : <EyeClosed className="h-4 w-4 text-white/40 transition-colors duration-300 hover:text-white" />}
                      </button>
                      {focusedInput === 'password' && (
                        <motion.div
                          layoutId="input-highlight"
                          className="absolute inset-0 -z-10 bg-white/5"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* remember me + forgot */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={() => setRemember(!rememberMe)}
                        className="h-4 w-4 appearance-none rounded-full border border-white/20 bg-white/5 transition-all duration-200 checked:border-white checked:bg-white focus:outline-none focus:ring-1 focus:ring-white/30"
                      />
                      {rememberMe && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="pointer-events-none absolute inset-0 flex items-center justify-center text-black"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </motion.div>
                      )}
                    </div>
                    <label htmlFor="remember-me" className="text-xs text-white/60 transition-colors duration-200 hover:text-white/80">Remember me</label>
                  </div>
                  {forgotTo && (
                    <Link to={forgotTo} className="text-xs text-white/60 transition-colors duration-200 hover:text-white">{forgotLabel}</Link>
                  )}
                </div>

                {/* primary action — "aurora" pill */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="btn-aurora group/button relative mt-5 flex h-10 w-full items-center justify-center text-sm font-medium"
                >
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                      </motion.div>
                    ) : (
                      <motion.span key="button-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-1 text-sm font-medium">
                        Sign In
                        <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover/button:translate-x-1" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>

                {showGoogle && (
                  <>
                    <div className="relative mb-5 mt-2 flex items-center">
                      <div className="flex-grow border-t border-white/10" />
                      <span className="mx-3 text-xs text-white/40">or</span>
                      <div className="flex-grow border-t border-white/10" />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={onGoogle}
                      className="btn-glass flex h-10 w-full items-center justify-center gap-2 text-xs"
                    >
                      <span className="flex h-4 w-4 items-center justify-center">G</span>
                      Sign in with Google
                    </motion.button>
                  </>
                )}

                {signupTo && (
                  <p className="mt-4 text-center text-xs text-white/60">
                    {signupPrompt}{' '}
                    <Link to={signupTo} className="relative inline-block font-medium text-white transition-colors duration-300 hover:text-white/70">{signupLabel}</Link>
                  </p>
                )}
              </form>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default Component;
