'use client';

import clsx from 'clsx';
import { KeyRound, LayoutList, Loader2, LogOut, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useId, useState } from 'react';
import { adminApi, ApiError, type AdminUser } from '@/lib/api';
import { BRAND } from '@/lib/brand';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { ErrorText, FieldLabel } from './ui';

const UserContext = createContext<AdminUser | null>(null);

/** The logged-in team member (only valid inside <AdminShell>). */
export function useAdminUser(): AdminUser {
  const u = useContext(UserContext);
  if (!u) throw new Error('useAdminUser outside AdminShell');
  return u;
}

type Gate = { kind: 'loading' } | { kind: 'login'; needsSetup: boolean } | { kind: 'in'; user: AdminUser } | { kind: 'down'; message: string };

/** Auth gate + header for every /admin page. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [gate, setGate] = useState<Gate>({ kind: 'loading' });

  const check = useCallback(async () => {
    try {
      const { user } = await adminApi.me();
      setGate({ kind: 'in', user });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        try {
          const { needsSetup } = await adminApi.setupStatus();
          setGate({ kind: 'login', needsSetup });
        } catch (e2) {
          setGate({ kind: 'down', message: e2 instanceof ApiError ? e2.message : 'The server is not responding.' });
        }
      } else {
        setGate({ kind: 'down', message: e instanceof ApiError ? e.message : 'The server is not responding.' });
      }
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  if (gate.kind === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand" aria-label="Loading" />
      </div>
    );
  }
  if (gate.kind === 'down') {
    return (
      <Centered title="Can’t reach the server">
        <p className="text-[14px] text-ink-2">{gate.message}</p>
        <Button className="mt-5" onClick={() => void check()}>
          Try again
        </Button>
      </Centered>
    );
  }
  if (gate.kind === 'login') return <LoginScreen needsSetup={gate.needsSetup} onIn={(user) => setGate({ kind: 'in', user })} />;

  return (
    <UserContext.Provider value={gate.user}>
      <div className="min-h-dvh bg-paper">
        <AdminHeader user={gate.user} onLogout={() => setGate({ kind: 'login', needsSetup: false })} />
        <main id="main" className="mx-auto max-w-[84rem] px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
          {children}
        </main>
      </div>
    </UserContext.Provider>
  );
}

function AdminHeader({ user, onLogout }: { user: AdminUser; onLogout: () => void }) {
  const path = usePathname() ?? '';
  const [busy, setBusy] = useState(false);
  const nav = [
    { href: '/admin/', label: 'Leads', Icon: LayoutList, active: path === '/admin/' || path.startsWith('/admin/lead') },
    ...(user.role === 'admin' ? [{ href: '/admin/team/', label: 'Team', Icon: Users, active: path.startsWith('/admin/team') }] : []),
    { href: '/admin/account/', label: 'Account', Icon: KeyRound, active: path.startsWith('/admin/account') },
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[84rem] items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo compact />
          <span className="hidden rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white sm:inline">
            BDE panel
          </span>
        </div>
        <nav aria-label="Panel" className="flex items-center gap-1">
          {nav.map(({ href, label, Icon, active }) => (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-2.5 text-[14px] font-semibold transition-colors sm:px-3',
                active ? 'bg-brand-soft/70 text-brand' : 'text-ink-2 hover:bg-ink/[0.05] hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="max-sm:sr-only">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-right leading-tight md:block">
            <span className="block text-[13.5px] font-semibold text-ink">{user.name}</span>
            <span className="block text-[12px] text-muted">{user.role === 'admin' ? 'Admin' : 'BDE'}</span>
          </span>
          <Button
            variant="quiet"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await adminApi.logout();
              } finally {
                onLogout();
              }
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="max-sm:sr-only">Log out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

function LoginScreen({ needsSetup, onIn }: { needsSetup: boolean; onIn: (u: AdminUser) => void }) {
  const ids = { name: useId(), email: useId(), pass: useId() };
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = needsSetup ? await adminApi.setup({ name, email, password }) : await adminApi.login({ email, password });
      onIn(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Centered title={needsSetup ? 'Create the admin account' : 'BDE panel'}>
      <p className="text-[14px] leading-relaxed text-ink-2">
        {needsSetup
          ? 'No accounts exist yet. This first account becomes the admin — you can add BDEs afterwards.'
          : `Log in to see ${BRAND.product} leads.`}
      </p>
      <form onSubmit={submit} className="mt-5 grid gap-3.5 text-left">
        {needsSetup && (
          <div>
            <FieldLabel htmlFor={ids.name}>Your name</FieldLabel>
            <input id={ids.name} className="field" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div>
          <FieldLabel htmlFor={ids.email}>Email</FieldLabel>
          <input
            id={ids.email}
            className="field"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor={ids.pass}>Password{needsSetup && <span className="font-normal text-muted"> (8+ characters)</span>}</FieldLabel>
          <input
            id={ids.pass}
            className="field"
            type="password"
            autoComplete={needsSetup ? 'new-password' : 'current-password'}
            required
            minLength={needsSetup ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" size="lg" disabled={busy} className="mt-1 w-full">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {needsSetup ? 'Create admin account' : 'Log in'}
        </Button>
      </form>
    </Centered>
  );
}

function Centered({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[24rem] text-center">
        <div className="flex justify-center">
          <Logo compact />
        </div>
        <div className="mt-6 rounded-[22px] border border-line bg-card px-6 py-7 shadow-card">
          <h1 className="font-display text-[24px] font-medium text-ink">{title}</h1>
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
