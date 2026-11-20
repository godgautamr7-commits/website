/* Stand-alone usage examples for the two integrated components. */
import { MemoryRouter } from 'react-router-dom';
import { Component as SignInCard } from '@/components/ui/sign-in-card-2';
import { LiquidNavbar, NimbusIcons } from '@/components/ui/liquid-glass-navbar';

export const SignInDemo = () => (
  <MemoryRouter>
    <div className="flex h-screen w-full items-center justify-center">
      <SignInCard />
    </div>
  </MemoryRouter>
);

export const NavbarDemo = () => (
  <div className="flex min-h-screen w-full items-center justify-center" style={{ background: '#DCEBF5' }}>
    <LiquidNavbar
      tone="light"
      defaultActive={0}
      items={[
        { label: 'Home', icon: NimbusIcons.home, fx: 'glow' },
        { label: 'Explore', icon: NimbusIcons.globe, fx: 'spin' },
        { label: 'Flights', icon: NimbusIcons.plane, fx: 'plane' },
        { label: 'Weather', icon: NimbusIcons.drop, fx: 'drop' },
        { label: 'Profile', icon: NimbusIcons.user, fx: 'wave' },
      ]}
    />
  </div>
);
