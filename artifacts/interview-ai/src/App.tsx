import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, BarChart3, BookOpen, BriefcaseBusiness, Check,
  ChevronDown, CircleAlert, Clock3, FileText, GraduationCap, Headphones,
  LayoutDashboard, LockKeyhole, Menu, Mic, MicOff, Play, Plus, RotateCcw, Save,
  Settings, Sparkles, Target, UserRound, UsersRound, X,
} from 'lucide-react';
import {
  getGetDashboardQueryKey, getGetInterviewQueryKey, getGetProfileQueryKey,
  getGetInterviewSessionQueryKey, getListInterviewsQueryKey, useCreateInterview,
  useGetDashboard, useGetInterview, useGetInterviewSession, useGetProfile,
  useHealthCheck, useListInterviews, useSubmitInterviewAnswer, useUpdateProfile,
} from '@workspace/api-client-react';
import type { InterviewInput, InterviewSummary } from '@workspace/api-client-react';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Route, Switch, Link, Redirect, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { InterviewReadinessPage, QuestionBankPage, StudyPlanPage } from '@/pages/preparation';

const queryClient = new QueryClient();
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const cn = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ');
const formatDate = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
const initials = (name = 'Candidate') => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

function Logo({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" className="group inline-flex items-center gap-2.5" data-testid="link-logo">
    <span className={cn('grid size-9 place-items-center rounded-lg transition-transform group-hover:-rotate-6', inverse ? 'bg-secondary text-primary' : 'bg-primary text-primary-foreground')}><span className="font-display text-lg font-bold">i</span></span>
    <span className={cn('font-display text-lg font-bold tracking-tight', inverse ? 'text-sidebar-foreground' : 'text-foreground')}>Interview<span className={inverse ? 'text-secondary' : 'text-[hsl(var(--secondary))]'}>AI</span></span>
  </Link>;
}

function Button({ children, variant = 'primary', className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'outline' }) {
  return <button className={cn(
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
    variant === 'primary' && 'bg-primary text-primary-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md',
    variant === 'secondary' && 'bg-secondary text-secondary-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md',
    variant === 'outline' && 'border border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted',
    variant === 'ghost' && 'text-muted-foreground hover:bg-muted hover:text-foreground',
    className,
  )} {...props}>{children}</button>;
}

function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'amber' | 'teal' | 'red' }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[.12em]', tone === 'amber' && 'bg-secondary/20 text-[hsl(27_78%_34%)]', tone === 'teal' && 'bg-accent text-accent-foreground', tone === 'red' && 'bg-destructive/10 text-destructive', tone === 'muted' && 'bg-muted text-muted-foreground')}>{children}</span>;
}

function LoadingBlock({ label = 'Loading your practice studio' }: { label?: string }) {
  return <div className="grid min-h-[360px] place-items-center rounded-2xl border border-border bg-card p-8" data-testid="status-loading">
    <div className="w-full max-w-sm space-y-4">
      <div className="h-3 w-24 animate-pulse-soft rounded-full bg-muted" />
      <div className="h-8 w-3/4 animate-pulse-soft rounded-lg bg-muted" />
      <div className="h-3 w-full animate-pulse-soft rounded-full bg-muted" />
      <div className="h-3 w-5/6 animate-pulse-soft rounded-full bg-muted" />
      <p className="pt-3 text-center font-mono-ui text-[11px] uppercase tracking-[.18em] text-muted-foreground">{label}</p>
    </div>
  </div>;
}

function ErrorBlock({ onRetry, label = 'We could not load this view.' }: { onRetry?: () => void; label?: string }) {
  return <div className="grid min-h-[280px] place-items-center rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center" data-testid="status-error">
    <div><CircleAlert className="mx-auto mb-3 size-8 text-destructive" /><p className="font-display text-xl font-semibold">{label}</p><p className="mt-2 text-sm text-muted-foreground">Check your connection, then try again.</p>{onRetry && <Button variant="outline" onClick={onRetry} className="mt-5"><RotateCcw className="size-4" /> Try again</Button>}</div>
  </div>;
}

function EmptyBlock({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="grid min-h-[270px] place-items-center rounded-2xl border border-dashed border-border bg-card p-8 text-center" data-testid="status-empty"><div><span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground"><BookOpen className="size-5" /></span><p className="font-display text-xl font-semibold">{title}</p><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>{action && <div className="mt-5">{action}</div>}</div></div>;
}

function ScoreRing({ score, size = 'large' }: { score: number; size?: 'large' | 'small' }) {
  return <div className={cn('relative grid shrink-0 place-items-center rounded-full', size === 'large' ? 'size-40' : 'size-14')} style={{ background: `conic-gradient(hsl(var(--secondary)) ${score * 3.6}deg, hsl(var(--muted)) 0deg)` }} data-testid={`score-ring-${score}`}>
    <div className={cn('grid place-items-center rounded-full bg-card', size === 'large' ? 'size-[126px]' : 'size-11')}><span className={cn('font-display font-bold', size === 'large' ? 'text-4xl' : 'text-base')}>{score}</span>{size === 'large' && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">out of 100</span>}</div>
  </div>;
}

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const nav = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/interviews', label: 'Interviews', icon: Headphones },
    { href: '/readiness', label: 'Interview Readiness', icon: BriefcaseBusiness },
    { href: '/question-bank', label: 'Question Bank', icon: BookOpen },
    { href: '/study-plan', label: 'Study Plan', icon: GraduationCap },
    { href: '/profile', label: 'Profile', icon: UserRound },
  ];
  return <div className="noise min-h-[100dvh] bg-background">
    <header className="sticky top-0 z-10 border-b border-border/70 bg-background/90 backdrop-blur-md lg:hidden">
      <div className="flex items-center justify-between px-4 py-3"><Logo /><Button variant="ghost" className="min-h-9 px-2" onClick={() => setOpen((value) => !value)} aria-label="Open navigation" data-testid="button-mobile-menu">{open ? <X className="size-5" /> : <Menu className="size-5" />}</Button></div>
      {open && <nav className="border-t border-border px-4 py-3" data-testid="nav-mobile">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold', location === href ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')} data-testid={`link-mobile-${label.toLowerCase()}`}><Icon className="size-4" />{label}</Link>)}</nav>}
    </header>
    <aside className="fixed inset-y-0 left-0 hidden w-[248px] flex-col bg-sidebar px-5 py-6 lg:flex">
      <Logo inverse />
       <div className="mt-12 px-3 font-mono-ui text-[10px] uppercase tracking-[.2em] text-sidebar-foreground/40">Your practice room</div>
       <nav className="mt-3 space-y-1.5" data-testid="nav-sidebar">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn('group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors', location === href ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground')} data-testid={`link-sidebar-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon className="size-[18px] transition-transform group-hover:scale-110" />{label}</Link>)}</nav>
      <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-4"><div className="flex items-start gap-3"><Sparkles className="mt-0.5 size-4 text-sidebar-primary" /><div><p className="text-sm font-semibold text-sidebar-foreground">Practice with intent.</p><p className="mt-1 text-xs leading-5 text-sidebar-foreground/55">One focused session beats an hour of scrolling.</p></div></div><Link href="/interviews/new" className="mt-4 flex min-h-10 items-center justify-center rounded-lg bg-sidebar-primary px-3 text-xs font-bold text-sidebar-primary-foreground hover:brightness-105" data-testid="link-sidebar-new-interview">Start practice</Link></div>
      <div className="mt-5 flex items-center gap-3 border-t border-sidebar-border pt-5"><div className="grid size-9 place-items-center rounded-full bg-sidebar-primary font-mono-ui text-xs font-bold text-sidebar-primary-foreground" data-testid="text-sidebar-avatar">AR</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-sidebar-foreground">Alex Rivera</p><p className="truncate text-xs text-sidebar-foreground/45">Software candidate</p></div><Link href="/profile" className="ml-auto text-sidebar-foreground/50 hover:text-sidebar-foreground" data-testid="link-sidebar-settings"><Settings className="size-4" /></Link></div>
    </aside>
    <main className="lg:pl-[248px]">{children}</main>
  </div>;
}

function PageFrame({ eyebrow, title, description, action, children }: { eyebrow?: string; title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-7 lg:px-10 lg:py-11"><div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="font-mono-ui text-[10px] font-medium uppercase tracking-[.22em] text-muted-foreground">{eyebrow}</p>}<h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl" data-testid="text-page-title">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>{action}</div>{children}</div>;
}

function Landing() {
  const health = useHealthCheck();
  return <div className="noise min-h-[100dvh] overflow-hidden bg-background">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8"><Logo /><nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex"><a href="#method" className="hover:text-foreground">The method</a><a href="#signal" className="hover:text-foreground">What you measure</a><a href="#footer" className="hover:text-foreground">About</a></nav><div className="flex items-center gap-2"><Link href="/sign-in" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground sm:block" data-testid="link-landing-sign-in">Sign in</Link><Link href="/sign-up" className="inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md" data-testid="link-landing-sign-up">Start practicing <ArrowRight className="ml-2 size-4" /></Link></div></header>
    <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:pb-28 lg:pt-28"><div className="absolute -right-24 top-20 -z-0 size-80 rounded-full bg-secondary/15 blur-3xl" /><div className="grid items-center gap-14 lg:grid-cols-[1.02fr_.98fr]"><div className="relative z-[1] animate-rise-in"><Badge tone="amber">Interview practice, with signal</Badge><h1 className="mt-7 max-w-[720px] font-display text-[clamp(3.4rem,8vw,7.8rem)] font-semibold leading-[.9] tracking-[-.07em]">Know where<br /><span className="text-[hsl(var(--secondary))]">you stand.</span></h1><p className="mt-8 max-w-xl text-lg leading-8 text-muted-foreground">InterviewAI turns preparation into a practice loop you can trust: answer real questions, see the gaps, and walk into the next room clearer.</p><div className="mt-9 flex flex-wrap items-center gap-3"><Link href="/sign-up" className="inline-flex min-h-12 items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md hover:-translate-y-0.5 hover:shadow-lg" data-testid="link-hero-start">Build your readiness <ArrowRight className="ml-2 size-4" /></Link><Link href="/sign-in" className="inline-flex min-h-12 items-center rounded-xl border border-border bg-card px-5 text-sm font-bold hover:border-primary/40" data-testid="link-hero-sign-in">I have an account</Link></div><div className="mt-12 flex items-center gap-3 text-xs text-muted-foreground"><span className={cn('size-2 rounded-full', health.isError ? 'bg-destructive' : 'bg-[hsl(var(--secondary))]')} /><span data-testid="status-health">{health.isLoading ? 'Checking studio status' : health.isError ? 'Studio reconnecting' : 'Practice studio online'}</span></div></div>
      <div className="relative z-[1] animate-rise-in [animation-delay:120ms]"><div className="relative rounded-[2rem] border border-border bg-card p-4 shadow-xl sm:p-6"><div className="absolute -left-7 top-16 hidden rounded-xl border border-border bg-primary px-4 py-3 text-primary-foreground shadow-lg sm:block"><p className="font-mono-ui text-[10px] uppercase tracking-wider text-primary-foreground/60">Readiness</p><p className="mt-1 font-display text-2xl font-bold">72<span className="text-sm font-medium">/100</span></p></div><div className="rounded-[1.35rem] bg-primary p-6 text-primary-foreground sm:p-8"><div className="flex items-start justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary-foreground/50">Today’s practice</p><p className="mt-3 font-display text-2xl font-semibold">Behavioral clarity</p></div><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><Target className="size-5" /></span></div><div className="mt-8 h-2 overflow-hidden rounded-full bg-primary-foreground/15"><div className="h-full w-[72%] rounded-full bg-secondary" /></div><div className="mt-3 flex justify-between text-xs text-primary-foreground/55"><span>Current signal</span><span>72 / 100</span></div></div><div className="grid grid-cols-2 gap-3 p-2 pt-5 sm:grid-cols-3"><div className="rounded-xl bg-muted p-4"><p className="font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">Clarity</p><p className="mt-2 font-display text-2xl font-semibold">81</p><p className="mt-1 text-xs text-[hsl(169_35%_35%)]">+8 this week</p></div><div className="rounded-xl bg-muted p-4"><p className="font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">Sessions</p><p className="mt-2 font-display text-2xl font-semibold">06</p><p className="mt-1 text-xs text-muted-foreground">this month</p></div><div className="col-span-2 rounded-xl border border-dashed border-border p-4 sm:col-span-1"><p className="font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">Next move</p><p className="mt-2 text-sm font-semibold">Tell the story, not the timeline.</p></div></div></div><div className="absolute -bottom-5 -right-3 flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 shadow-lg"><span className="grid size-7 place-items-center rounded-lg bg-accent text-accent-foreground"><Check className="size-4" /></span><span className="text-xs font-semibold">Progress you can explain</span></div></div></div></section>
    <section id="method" className="border-y border-border bg-card"><div className="mx-auto grid max-w-7xl gap-0 px-5 sm:px-8 md:grid-cols-3">{[['01', 'Practice in context', 'Choose the role, level, and interview style you are actually preparing for.'], ['02', 'See the signal', 'Get a clear score across communication, depth, structure, and confidence.'], ['03', 'Return with intent', 'Your next recommendation is specific enough to act on tonight.']].map(([number, title, copy]) => <div key={number} className="border-border py-10 md:border-r md:px-8 md:py-14 first:md:pl-0 last:md:border-r-0"><span className="font-mono-ui text-xs text-[hsl(var(--secondary))]">{number}</span><h2 className="mt-7 font-display text-2xl font-semibold">{title}</h2><p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">{copy}</p></div>)}</div></section>
    <section id="signal" className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:py-28"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.22em] text-muted-foreground">A better prep loop</p><h2 className="mt-4 max-w-lg font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Preparation should leave a trail.</h2><p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">Not a transcript graveyard. A living picture of what is getting sharper and what deserves your next hour.</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-border bg-card p-6 shadow-sm"><BarChart3 className="size-5 text-[hsl(var(--secondary))]" /><h3 className="mt-10 font-display text-xl font-semibold">Readiness, not vanity metrics</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">A single score grounded in the dimensions interviewers actually notice.</p></div><div className="rounded-2xl border border-border bg-primary p-6 text-primary-foreground shadow-md sm:translate-y-8"><UsersRound className="size-5 text-secondary" /><h3 className="mt-10 font-display text-xl font-semibold">A coach that stays on your side</h3><p className="mt-2 text-sm leading-6 text-primary-foreground/65">Direct feedback, no theater. Just the next move that makes sense for you.</p></div></div></section>
    <footer id="footer" className="border-t border-border px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><Logo /><span>InterviewAI · Build the answer before you need it.</span></div></footer>
  </div>;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: 'hsl(34 92% 45%)',
    colorForeground: 'hsl(222 31% 17%)',
    colorMutedForeground: 'hsl(221 12% 45%)',
    colorDanger: 'hsl(4 62% 48%)',
    colorBackground: 'hsl(43 38% 97%)',
    colorInput: 'hsl(42 34% 94%)',
    colorInputForeground: 'hsl(222 31% 17%)',
    colorNeutral: 'hsl(40 18% 78%)',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '0.85rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[hsl(43_38%_97%)] rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'font-display text-2xl font-semibold text-foreground',
    headerSubtitle: 'text-muted-foreground',
    socialButtonsBlockButtonText: 'text-foreground',
    formFieldLabel: 'text-foreground',
    footerActionLink: 'text-foreground underline decoration-secondary',
    footerActionText: 'text-muted-foreground',
    dividerText: 'text-muted-foreground',
    identityPreviewEditButton: 'text-foreground',
    formFieldSuccessText: 'text-[hsl(169_35%_35%)]',
    alertText: 'text-destructive',
    logoBox: 'mb-5',
    logoImage: 'max-h-10',
    socialButtonsBlockButton: 'border-border bg-card',
    formButtonPrimary: 'bg-primary text-primary-foreground hover:opacity-90',
    formFieldInput: 'border-input bg-background text-foreground',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-border',
    alert: 'border-destructive/20 bg-destructive/5',
    otpCodeFieldInput: 'border-input bg-background text-foreground',
    formFieldRow: 'gap-2',
    main: 'bg-transparent',
  },
};

function SignInPage() {
  return <div className="grid min-h-[100dvh] place-items-center bg-background px-4 py-8"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}

function SignUpPage() {
  return <div className="grid min-h-[100dvh] place-items-center bg-background px-4 py-8"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
}

function Protected({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="grid min-h-[100dvh] place-items-center bg-background"><LoadingBlock label="Loading your practice studio" /></div>;
  if (!isSignedIn) return <Redirect to="/" />;
  return <>{children}</>;
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <Landing />;
  return isSignedIn ? <Redirect to="/dashboard" /> : <Landing />;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const previousUserRef = useMemo(() => ({ id: undefined as string | null | undefined }), []);
  const client = useQueryClient();
  useEffect(() => addListener(({ user }) => {
    const userId = user?.id ?? null;
    if (previousUserRef.id !== undefined && previousUserRef.id !== userId) client.clear();
    previousUserRef.id = userId;
  }), [addListener, client, previousUserRef]);
  return null;
}

function DashboardPage() {
  const query = useGetDashboard();
  if (query.isLoading) return <AppShell><PageFrame eyebrow="Readiness overview" title="Your practice room"><LoadingBlock /></PageFrame></AppShell>;
  if (query.isError || !query.data) return <AppShell><PageFrame eyebrow="Readiness overview" title="Your practice room"><ErrorBlock onRetry={() => query.refetch()} /></PageFrame></AppShell>;
  const dashboard = query.data;
  const activeInterview = dashboard.recentInterviews.find((interview) => interview.status === 'in_progress');
  const practiceHref = activeInterview ? `/interviews/${activeInterview.id}/session` : '/interviews/new';
  return <AppShell><PageFrame eyebrow="Readiness overview" title={`Good to see you, ${dashboard.candidate.fullName.split(' ')[0]}.`} description="A clear read on where your interview signal is today—and the one move that will improve it next." action={<Link href={practiceHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-bold text-secondary-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md" data-testid="link-dashboard-new-interview"><Plus className="size-4" />{activeInterview ? 'Resume interview' : 'New interview'}</Link>}><div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-md sm:p-8"><div className="absolute -right-12 -top-16 size-64 rounded-full border border-secondary/15" /><div className="relative z-[1] flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between"><div className="max-w-md"><Badge tone="amber">{dashboard.readinessLabel}</Badge><h2 className="mt-5 font-display text-3xl font-semibold tracking-tight">Your readiness is taking shape.</h2><p className="mt-3 text-sm leading-6 text-primary-foreground/65">{dashboard.readinessDescription}</p><Link href={practiceHref} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:gap-3" data-testid="link-dashboard-practice-next">{activeInterview ? 'Resume your session' : dashboard.recommendation.action} <ArrowRight className="size-4 transition-all" /></Link></div><ScoreRing score={dashboard.readinessScore} /></div></section><section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"><div className="flex items-center justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Next best move</p><h2 className="mt-2 font-display text-2xl font-semibold">{activeInterview ? 'Finish your open session' : dashboard.recommendation.title}</h2></div><span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground"><Target className="size-5" /></span></div><p className="mt-4 text-sm leading-6 text-muted-foreground">{activeInterview ? `You have answered part of your ${activeInterview.type} interview. Keep going while the context is fresh.` : dashboard.recommendation.description}</p><div className="mt-5 flex flex-wrap gap-2"><Badge tone="teal">{activeInterview ? 'In progress' : dashboard.recommendation.category}</Badge><Badge>{dashboard.recommendation.duration}</Badge></div></section></div><section className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><div className="rounded-2xl border border-border bg-card p-6 shadow-sm"><div className="flex items-center justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Readiness dimensions</p><h2 className="mt-2 font-display text-2xl font-semibold">Your signal, by category</h2></div><BarChart3 className="size-5 text-muted-foreground" /></div><div className="mt-7 grid gap-4 sm:grid-cols-2">{dashboard.metrics.map((metric) => <div key={metric.label} className="rounded-xl bg-muted/60 p-4" data-testid={`metric-${metric.label.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-center justify-between"><span className="text-sm font-semibold">{metric.label}</span><span className="font-display text-xl font-bold">{metric.value}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-secondary" style={{ width: `${metric.value}%` }} /></div><p className={cn('mt-2 font-mono-ui text-[10px]', metric.change >= 0 ? 'text-[hsl(169_35%_35%)]' : 'text-destructive')}>{metric.change >= 0 ? '+' : ''}{metric.change} from last check</p></div>)}</div></div><div className="rounded-2xl border border-border bg-card p-6 shadow-sm"><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Focus areas</p><h2 className="mt-2 font-display text-2xl font-semibold">Worth your attention</h2><div className="mt-6 space-y-4">{dashboard.weakAreas.length === 0 ? <p className="text-sm text-muted-foreground">No weak areas yet. Keep practicing to reveal your next edge.</p> : dashboard.weakAreas.map((area) => <div key={area.name} className="flex items-center gap-3" data-testid={`weak-area-${area.name.toLowerCase().replaceAll(' ', '-')}`}><span className={cn('size-2 rounded-full', area.severity === 'high' ? 'bg-destructive' : area.severity === 'medium' ? 'bg-secondary' : 'bg-accent-foreground')} /><span className="flex-1 text-sm font-medium">{area.name}</span><span className="font-mono-ui text-xs text-muted-foreground">{area.score}</span></div>)}</div></div></section><section className="mt-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Momentum</p><h2 className="mt-2 font-display text-2xl font-semibold">Your practice over time</h2></div><span className="font-mono-ui text-xs text-muted-foreground">Last {dashboard.progress.length} sessions</span></div><div className="mt-8 flex h-40 items-end gap-2 sm:gap-4">{dashboard.progress.map((point, index) => <div key={`${point.label}-${index}`} className="flex flex-1 flex-col items-center gap-2" data-testid={`progress-point-${index}`}><div className="flex h-28 w-full items-end rounded-lg bg-muted p-1"><div className="animate-draw-in w-full rounded-md bg-secondary" style={{ height: `${Math.max(point.score, 8)}%`, animationDelay: `${index * 80}ms` }} /></div><span className="font-mono-ui text-[10px] text-muted-foreground">{point.label}</span></div>)}</div></section><section className="mt-5"><div className="mb-4 flex items-center justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Your trail</p><h2 className="mt-2 font-display text-2xl font-semibold">Recent interviews</h2></div><Link href="/interviews" className="text-sm font-semibold text-muted-foreground hover:text-foreground" data-testid="link-dashboard-all-interviews">See all <ArrowRight className="ml-1 inline size-4" /></Link></div>{dashboard.recentInterviews.length === 0 ? <EmptyBlock title="Your first signal starts here." description="Run a focused interview to create your readiness baseline." action={<Link href="/interviews/new" className="inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground" data-testid="link-dashboard-empty-cta">Create interview</Link>} /> : <div className="grid gap-3">{dashboard.recentInterviews.slice(0, 4).map((interview) => <InterviewRow key={interview.id} interview={interview} />)}</div>}</section></PageFrame></AppShell>;
}

function InterviewRow({ interview }: { interview: InterviewSummary }) {
  const href = interview.status === 'in_progress' ? `/interviews/${interview.id}/session` : `/interviews/${interview.id}`;
  return <Link href={href} className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-secondary/60 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-5" data-testid={`row-interview-${interview.id}`}><div className="flex items-center gap-4"><span className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground"><Headphones className="size-5" /></span><div><p className="font-semibold">{interview.title}</p><div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span className="capitalize">{interview.type}</span><span>{interview.questions} questions</span><span>{interview.status === 'in_progress' ? 'In progress' : formatDate(interview.completedAt)}</span></div></div></div><div className="flex items-center gap-5 pl-15 sm:pl-0"><div>{interview.status === 'in_progress' ? <p className="font-mono-ui text-xs font-bold uppercase tracking-wider text-secondary">Resume</p> : <><p className="font-display text-2xl font-bold">{interview.score}</p><p className="font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">score</p></>}</div><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></div></Link>;
}

function ProfilePage() {
  const profileQuery = useGetProfile();
  const update = useUpdateProfile();
  const client = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [skills, setSkills] = useState('');
  const profile = profileQuery.data;
  const current = profile ? { ...profile, ...form } : undefined;
  if (profileQuery.isLoading) return <AppShell><PageFrame eyebrow="Candidate profile" title="Your profile"><LoadingBlock label="Loading your profile" /></PageFrame></AppShell>;
  if (profileQuery.isError || !profile || !current) return <AppShell><PageFrame eyebrow="Candidate profile" title="Your profile"><ErrorBlock onRetry={() => profileQuery.refetch()} /></PageFrame></AppShell>;
  const setField = (field: string, value: string) => setForm((previous) => ({ ...previous, [field]: value }));
  const save = (event: FormEvent) => { event.preventDefault(); update.mutate({ data: { fullName: current.fullName, education: current.education, degree: current.degree, university: current.university, graduationYear: Number(current.graduationYear), experience: current.experience, preferredRole: current.preferredRole, yearsOfExperience: Number(current.yearsOfExperience), skills: (skills || profile.skills.join(', ')).split(',').map((item) => item.trim()).filter(Boolean) } }, { onSuccess: (updated) => { client.setQueryData(getGetProfileQueryKey(), updated); setForm({}); setSkills(updated.skills.join(', ')); } }); };
  return <AppShell><PageFrame eyebrow="Candidate profile" title="Make your context count." description="Your profile helps InterviewAI tune questions to the role you are actually pursuing." action={<div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-[hsl(169_35%_42%)]" />{update.isSuccess ? 'Saved just now' : `Updated ${formatDate(profile.updatedAt)}`}</div>}><form onSubmit={save} className="grid gap-5 xl:grid-cols-[1fr_340px]"><div className="space-y-5"><section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"><div className="flex items-center gap-4 border-b border-border pb-6"><div className="grid size-14 place-items-center rounded-2xl bg-primary font-display text-lg font-bold text-primary-foreground">{initials(current.fullName)}</div><div><p className="font-display text-xl font-semibold">{current.fullName}</p><p className="text-sm text-muted-foreground">{current.email}</p></div></div><div className="mt-7 grid gap-5 sm:grid-cols-2"><Field label="Full name" value={current.fullName} onChange={(value) => setField('fullName', value)} testId="input-profile-name" /><Field label="Preferred role" value={current.preferredRole} onChange={(value) => setField('preferredRole', value)} testId="input-profile-role" /><Field label="University" value={current.university} onChange={(value) => setField('university', value)} testId="input-profile-university" /><Field label="Degree" value={current.degree} onChange={(value) => setField('degree', value)} testId="input-profile-degree" /><Field label="Education focus" value={current.education} onChange={(value) => setField('education', value)} testId="input-profile-education" /><Field label="Graduation year" type="number" value={String(current.graduationYear)} onChange={(value) => setField('graduationYear', value)} testId="input-profile-year" /><Field label="Years of experience" type="number" value={String(current.yearsOfExperience)} onChange={(value) => setField('yearsOfExperience', value)} testId="input-profile-experience" /><Field label="Skills (comma separated)" value={skills || profile.skills.join(', ')} onChange={setSkills} testId="input-profile-skills" /></div><label className="mt-5 block"><span className="mb-2 block text-sm font-semibold">Experience snapshot</span><textarea value={current.experience} onChange={(event) => setField('experience', event.target.value)} rows={5} className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm leading-6 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20" placeholder="What have you built, learned, or led?" data-testid="input-profile-summary" /></label></section><div className="flex items-center justify-end gap-3"><Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-muted-foreground hover:bg-muted" data-testid="link-profile-cancel">Cancel</Link><Button type="submit" variant="secondary" disabled={update.isPending} data-testid="button-profile-save"><Save className="size-4" />{update.isPending ? 'Saving…' : 'Save profile'}</Button></div>{update.isError && <p className="text-right text-sm text-destructive" data-testid="status-profile-error">Could not save your profile. Try again.</p>}</div><aside className="h-fit rounded-2xl border border-border bg-primary p-6 text-primary-foreground shadow-md sm:p-7"><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary-foreground/55">Profile signal</p><div className="mt-5 flex items-center gap-5"><ScoreRing score={profile.profileCompletion} size="small" /><div><p className="font-display text-3xl font-bold">{profile.profileCompletion}%</p><p className="mt-1 text-xs text-primary-foreground/55">complete</p></div></div><p className="mt-7 text-sm leading-6 text-primary-foreground/65">A sharper profile gives your practice more useful context. Add the details an interviewer would ask about.</p><div className="mt-7 space-y-3 border-t border-primary-foreground/10 pt-5">{[['Role', current.preferredRole], ['School', current.university], ['Skills', `${profile.skills.length} listed`]].map(([label, value]) => <div className="flex items-center justify-between text-xs" key={label}><span className="text-primary-foreground/50">{label}</span><span className="font-semibold">{value || 'Add detail'}</span></div>)}</div></aside></form></PageFrame></AppShell>;
}

function Field({ label, value, onChange, type = 'text', testId }: { label: string; value: string; onChange: (value: string) => void; type?: string; testId: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span><input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20" data-testid={testId} /></label>;
}

function InterviewsPage() {
  const [filter, setFilter] = useState('all');
  const params = filter === 'all' ? undefined : { type: filter as 'technical' | 'hr' | 'behavioral' | 'project' | 'coding' | 'mixed' };
  const query = useListInterviews(params, { query: { queryKey: getListInterviewsQueryKey(params) } });
  const filters = ['all', 'technical', 'behavioral', 'coding', 'project', 'hr'];
  return <AppShell><PageFrame eyebrow="Practice trail" title="Interviews" description="Every session is a useful signal. Revisit the pattern, not just the score." action={<Link href="/interviews/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-bold text-secondary-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md" data-testid="link-interviews-new"><Plus className="size-4" /> New interview</Link>}><div className="mb-6 flex gap-2 overflow-x-auto pb-1" data-testid="filter-interviews">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={cn('min-h-9 shrink-0 rounded-lg px-3 text-xs font-bold capitalize transition', filter === item ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')} data-testid={`button-filter-${item}`}>{item}</button>)}</div>{query.isLoading ? <LoadingBlock label="Finding your practice trail" /> : query.isError ? <ErrorBlock onRetry={() => query.refetch()} /> : !query.data || query.data.length === 0 ? <EmptyBlock title={filter === 'all' ? 'No interviews yet.' : `No ${filter} interviews yet.`} description="Set up a focused session and your first score will appear here." action={<Link href="/interviews/new" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground" data-testid="link-interviews-empty-cta"><Plus className="size-4" /> Start an interview</Link>} /> : <div className="space-y-3">{query.data.map((interview) => <InterviewRow interview={interview} key={interview.id} />)}</div>}</PageFrame></AppShell>;
}

function InterviewNewPage() {
  const [, setLocation] = useLocation();
  const create = useCreateInterview();
  const [input, setInput] = useState<InterviewInput>({ type: 'mixed', difficulty: 'intermediate', questionCount: 10, answerMode: 'text', source: 'general' });
  const update = <K extends keyof InterviewInput>(key: K, value: InterviewInput[K]) => setInput((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); create.mutate({ data: input }, { onSuccess: (interview) => setLocation(`/interviews/${interview.id}/session`) }); };
  return <AppShell><PageFrame eyebrow="New practice session" title="Set the room." description="A good session has a clear target. Choose the context, then show up for the answer." action={<Link href="/interviews" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-muted" data-testid="link-new-back"><ArrowLeft className="size-4" /> Back to interviews</Link>}><form onSubmit={submit} className="mx-auto max-w-4xl"><div className="grid gap-5 md:grid-cols-2"><ChoiceCard title="Interview type" description="What kind of conversation are you preparing for?" options={[['mixed', 'Mixed interview', 'A balanced round across key signals'], ['technical', 'Technical', 'Depth, systems, and problem solving'], ['behavioral', 'Behavioral', 'Stories, judgment, and communication'], ['coding', 'Coding', 'Reasoning out loud while solving']]} value={input.type} onChange={(value) => update('type', value as InterviewInput['type'])} testPrefix="type" /><ChoiceCard title="Difficulty" description="Meet the level you are ready to stretch into." options={[['beginner', 'Warm up', 'Build the baseline'], ['intermediate', 'Interview-ready', 'The useful middle'], ['advanced', 'Stretch round', 'Pressure-test your edge']]} value={input.difficulty} onChange={(value) => update('difficulty', value as InterviewInput['difficulty'])} testPrefix="difficulty" /><ChoiceCard title="Answer mode" description="How do you want to work through the room?" options={[['text', 'Written', 'Take a beat, then make it clear'], ['voice', 'Voice', 'Practice thinking out loud']]} value={input.answerMode} onChange={(value) => update('answerMode', value as InterviewInput['answerMode'])} testPrefix="answer-mode" /><ChoiceCard title="Question count" description="Keep the session focused enough to finish." options={[[5, '5 questions', 'A quick pulse check'], [10, '10 questions', 'A focused session'], [15, '15 questions', 'A deeper practice loop'], [20, '20 questions', 'A full rehearsal']]} value={input.questionCount} onChange={(value) => update('questionCount', Number(value) as InterviewInput['questionCount'])} testPrefix="question-count" /></div><section className="mt-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"><div className="flex items-start gap-4"><span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground"><FileText className="size-5" /></span><div><h2 className="font-display text-xl font-semibold">Question source</h2><p className="mt-1 text-sm text-muted-foreground">Choose the context your questions should lean on.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-3">{[['general', 'General practice'], ['resume', 'My resume'], ['job_description', 'A job description']].map(([value, label]) => <button type="button" key={value} onClick={() => update('source', value as InterviewInput['source'])} className={cn('rounded-xl border p-4 text-left text-sm font-semibold transition', input.source === value ? 'border-secondary bg-secondary/10' : 'border-border hover:border-secondary/50')} data-testid={`button-source-${value}`}><span className={cn('mr-2 inline-block size-2 rounded-full align-middle', input.source === value ? 'bg-secondary' : 'bg-border')} />{label}</button>)}</div></section><div className="mt-6 flex flex-col items-stretch justify-end gap-4 sm:flex-row sm:items-center"><p className="text-xs leading-5 text-muted-foreground sm:mr-auto">You can leave the room whenever you need. Your signal is saved after completion.</p><Button type="submit" variant="secondary" disabled={create.isPending} className="min-w-44" data-testid="button-create-interview"><Play className="size-4" />{create.isPending ? 'Setting the room…' : 'Start interview'}</Button></div>{create.isError && <p className="mt-4 text-right text-sm text-destructive" data-testid="status-create-error">We could not start this interview. Try again.</p>}</form></PageFrame></AppShell>;
}

function ChoiceCard({ title, description, options, value, onChange, testPrefix }: { title: string; description: string; options: Array<[string | number, string, string]>; value: string | number; onChange: (value: string) => void; testPrefix: string }) {
  return <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7"><h2 className="font-display text-xl font-semibold">{title}</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p><div className="mt-5 space-y-2">{options.map(([option, label, copy]) => <button type="button" key={String(option)} onClick={() => onChange(String(option))} className={cn('flex w-full items-start gap-3 rounded-xl border p-3 text-left transition', String(value) === String(option) ? 'border-secondary bg-secondary/10' : 'border-border hover:border-secondary/50')} data-testid={`button-${testPrefix}-${option}`}><span className={cn('mt-0.5 grid size-4 place-items-center rounded-full border', String(value) === String(option) ? 'border-secondary bg-secondary' : 'border-input')}>{String(value) === String(option) && <Check className="size-3 text-secondary-foreground" />}</span><span><span className="block text-sm font-semibold">{label}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{copy}</span></span></button>)}</div></section>;
}

function InterviewSessionPage() {
  const { interviewId = '' } = useParams<{ interviewId: string }>();
  const [, setLocation] = useLocation();
  const client = useQueryClient();
  const query = useGetInterviewSession(interviewId, {
    query: { enabled: Boolean(interviewId), queryKey: getGetInterviewSessionQueryKey(interviewId) },
  });
  const submit = useSubmitInterviewAnswer();
  const [answer, setAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const toggleVoiceInput = () => {
    const SpeechRecognition = (window as Window & {
      SpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        start: () => void;
        stop: () => void;
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onend: (() => void) | null;
        onerror: (() => void) | null;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        start: () => void;
        stop: () => void;
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onend: (() => void) | null;
        onerror: (() => void) | null;
      };
    }).SpeechRecognition ?? (window as Window & {
      webkitSpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        start: () => void;
        stop: () => void;
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onend: (() => void) | null;
        onerror: (() => void) | null;
      };
    }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Voice input is not supported in this browser. You can still type your answer.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length }, (_, index) => event.results[index][0].transcript).join(' ');
      setAnswer((current) => `${current}${current ? ' ' : ''}${transcript}`.trim());
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceError('We could not hear that. Check microphone permission and try again.');
    };
    setVoiceError('');
    setIsListening(true);
    recognition.start();
  };

  if (query.isLoading) return <AppShell><PageFrame eyebrow="Live practice" title="Opening your interview"><LoadingBlock label="Preparing your first question" /></PageFrame></AppShell>;
  if (query.isError || !query.data) return <AppShell><PageFrame eyebrow="Live practice" title="Session unavailable"><ErrorBlock onRetry={() => query.refetch()} /></PageFrame></AppShell>;

  const session = query.data;
  if (session.completed || !session.currentQuestion) {
    return <AppShell><PageFrame eyebrow="Practice complete" title="You finished the room." description="Your answers are saved. Review the signal and choose what to sharpen next." action={<Link href={`/interviews/${interviewId}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-secondary px-4 text-sm font-bold text-secondary-foreground" data-testid="link-session-report"><BarChart3 className="size-4" /> View report</Link>}><section className="mx-auto max-w-2xl rounded-2xl bg-primary p-8 text-primary-foreground shadow-md sm:p-10"><div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><Check className="size-6" /></span><div><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary-foreground/55">Signal captured</p><h2 className="mt-1 font-display text-3xl font-semibold">{session.interview.score}/100</h2></div></div><p className="mt-7 max-w-lg text-sm leading-6 text-primary-foreground/65">You answered {session.answeredCount} questions. Open the report to see your category scores, strengths, and next topics.</p></section></PageFrame></AppShell>;
  }

  const question = session.currentQuestion;
  const progress = Math.round((session.answeredCount / session.totalQuestions) * 100);
  const submitAnswer = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed) return;
    submit.mutate(
      { interviewId, data: { questionIndex: question.index, answer: trimmed } },
      {
        onSuccess: (next) => {
          client.setQueryData(getGetInterviewSessionQueryKey(interviewId), next);
          setAnswer('');
          if (next.completed) setLocation(`/interviews/${interviewId}`);
        },
      },
    );
  };

   return <AppShell><PageFrame eyebrow="Live practice" title={session.interview.title} description="Answer clearly and specifically. Your progress is saved after every question." action={<Link href="/interviews" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-muted" data-testid="link-session-exit"><ArrowLeft className="size-4" /> Exit session</Link>}><div className="mx-auto max-w-3xl"><div className="mb-5 flex items-center justify-between text-xs text-muted-foreground"><span className="font-mono-ui uppercase tracking-[.15em]">Question {session.answeredCount + 1} of {session.totalQuestions}</span><span>{progress}% complete</span></div><div className="mb-8 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-secondary transition-all duration-300" style={{ width: `${Math.max(progress, 4)}%` }} /></div><section className="rounded-2xl bg-primary p-7 text-primary-foreground shadow-md sm:p-10"><div className="flex items-start justify-between gap-6"><div><Badge tone="amber">{question.category}</Badge><h2 className="mt-6 font-display text-3xl font-semibold leading-tight sm:text-4xl" data-testid="text-interview-question">{question.prompt}</h2></div><span className="hidden shrink-0 rounded-xl border border-primary-foreground/15 px-3 py-2 font-mono-ui text-xs text-primary-foreground/60 sm:block">Q{question.index + 1}</span></div></section><form onSubmit={submitAnswer} className="mt-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"><label className="block"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">Your answer</span>{session.interview.answerMode === 'voice' && <Button type="button" variant={isListening ? 'primary' : 'outline'} className="min-h-9 px-3 text-xs" onClick={toggleVoiceInput} data-testid="button-voice-input">{isListening ? <><MicOff className="size-4" /> Stop listening</> : <><Mic className="size-4" /> Answer by voice</>}</Button>}</div><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={9} autoFocus className="mt-3 w-full resize-y rounded-xl border border-input bg-background px-4 py-4 text-sm leading-7 outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20" placeholder={session.interview.answerMode === 'voice' ? 'Start voice input or type your answer here…' : 'Take a moment, then write the clearest version of your answer…'} data-testid="input-interview-answer" /><span className="mt-2 block text-xs text-muted-foreground">{session.interview.answerMode === 'voice' ? 'Voice input is transcribed in your browser. Review it before submitting.' : 'Tip: include the situation, your specific action, and the result when you can.'}</span>{voiceError && <span className="mt-2 block text-xs text-destructive" data-testid="status-voice-error">{voiceError}</span>}</label><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">Your answer is saved when you continue.</p><Button type="submit" variant="secondary" disabled={!answer.trim() || submit.isPending} className="min-w-40" data-testid="button-submit-answer">{submit.isPending ? 'Saving answer…' : session.answeredCount + 1 === session.totalQuestions ? 'Finish interview' : 'Continue'} <ArrowRight className="size-4" /></Button></div>{submit.isError && <p className="mt-4 text-sm text-destructive" data-testid="status-answer-error">We could not save that answer. Try again.</p>}</form></div></PageFrame></AppShell>;
}

function InterviewDetailPage() {
  const { interviewId = '' } = useParams<{ interviewId: string }>();
  const query = useGetInterview(interviewId, { query: { enabled: Boolean(interviewId), queryKey: getGetInterviewQueryKey(interviewId) } });
  if (query.isLoading) return <AppShell><PageFrame eyebrow="Interview report" title="Reading your signal"><LoadingBlock label="Building your report" /></PageFrame></AppShell>;
  if (query.isError || !query.data) return <AppShell><PageFrame eyebrow="Interview report" title="Report unavailable"><ErrorBlock onRetry={() => query.refetch()} /></PageFrame></AppShell>;
  const interview = query.data;
  if (interview.status === 'in_progress') return <Redirect to={`/interviews/${interviewId}/session`} />;
  const scoreEntries = Object.entries(interview.categoryScores);
  return <AppShell><PageFrame eyebrow="Interview report" title={interview.title} description={`${interview.type} · ${interview.difficulty} · completed ${formatDate(interview.completedAt)}`} action={<Link href="/interviews" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-muted" data-testid="link-report-back"><ArrowLeft className="size-4" /> All interviews</Link>}><div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr]"><section className="rounded-2xl bg-primary p-7 text-primary-foreground shadow-md sm:p-9"><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary-foreground/55">Overall signal</p><div className="mt-7 flex items-center gap-5"><ScoreRing score={interview.score} /><div><p className="font-display text-3xl font-semibold">Good foundation.</p><p className="mt-2 max-w-xs text-sm leading-6 text-primary-foreground/60">Use the category detail to choose what you practice next.</p></div></div><div className="mt-8 grid grid-cols-2 gap-3 border-t border-primary-foreground/10 pt-5"><div><p className="font-mono-ui text-[10px] uppercase tracking-wider text-primary-foreground/45">Questions</p><p className="mt-1 font-display text-xl font-semibold">{interview.questions}</p></div><div><p className="font-mono-ui text-[10px] uppercase tracking-wider text-primary-foreground/45">Duration</p><p className="mt-1 font-display text-xl font-semibold">{interview.duration}</p></div></div></section><section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Category breakdown</p><h2 className="mt-2 font-display text-2xl font-semibold">Where the signal landed</h2>{scoreEntries.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">Category scoring will appear after this interview is completed.</p> : <div className="mt-7 space-y-5">{scoreEntries.map(([label, score]) => <div key={label} data-testid={`report-score-${label}`}><div className="flex justify-between text-sm font-semibold"><span className="capitalize">{label.replaceAll('_', ' ')}</span><span className="font-mono-ui text-xs">{score}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-secondary" style={{ width: `${score}%` }} /></div></div>)}</div>}</section></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><ReportList title="Strong areas" items={interview.strongAreas} tone="teal" icon={<Check className="size-4" />} /><ReportList title="Keep working" items={interview.weakAreas} tone="red" icon={<Target className="size-4" />} /></div><section className="mt-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-secondary/20 text-[hsl(27_78%_34%)]"><BookOpen className="size-4" /></span><div><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Next practice</p><h2 className="mt-1 font-display text-xl font-semibold">Recommended topics</h2></div></div>{interview.recommendedTopics.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">Complete more interviews to unlock topic recommendations.</p> : <div className="mt-5 flex flex-wrap gap-2">{interview.recommendedTopics.map((topic) => <Badge key={topic} tone="amber">{topic}</Badge>)}</div>}</section></PageFrame></AppShell>;
}

function ReportList({ title, items, tone, icon }: { title: string; items: string[]; tone: 'teal' | 'red'; icon: ReactNode }) {
  return <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"><div className="flex items-center gap-3"><span className={cn('grid size-9 place-items-center rounded-lg', tone === 'teal' ? 'bg-accent text-accent-foreground' : 'bg-destructive/10 text-destructive')}>{icon}</span><h2 className="font-display text-xl font-semibold">{title}</h2></div>{items.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">Nothing recorded here yet.</p> : <ul className="mt-5 space-y-3">{items.map((item) => <li key={item} className="flex items-start gap-3 text-sm leading-6"><span className={cn('mt-2 size-1.5 rounded-full', tone === 'teal' ? 'bg-accent-foreground' : 'bg-destructive')} />{item}</li>)}</ul>}</section>;
}

function NotFoundPage() {
  return <div className="grid min-h-[100dvh] place-items-center bg-background px-6 text-center"><div><p className="font-mono-ui text-xs uppercase tracking-[.2em] text-muted-foreground">404 · Wrong room</p><h1 className="mt-5 font-display text-5xl font-semibold">This page is not in the practice plan.</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">The route you followed does not exist. Head back to your dashboard and keep going.</p><Link href="/dashboard" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground" data-testid="link-not-found-dashboard">Back to dashboard <ArrowRight className="size-4" /></Link></div></div>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={HomeRedirect} /><Route path="/sign-in/*?" component={SignInPage} /><Route path="/sign-up/*?" component={SignUpPage} /><Route path="/dashboard" component={() => <Protected><DashboardPage /></Protected>} /><Route path="/readiness" component={() => <Protected><AppShell><InterviewReadinessPage /></AppShell></Protected>} /><Route path="/question-bank" component={() => <Protected><AppShell><QuestionBankPage /></AppShell></Protected>} /><Route path="/study-plan" component={() => <Protected><AppShell><StudyPlanPage /></AppShell></Protected>} /><Route path="/profile" component={() => <Protected><ProfilePage /></Protected>} /><Route path="/interviews/new" component={() => <Protected><InterviewNewPage /></Protected>} /><Route path="/interviews/:interviewId/session" component={() => <Protected><InterviewSessionPage /></Protected>} /><Route path="/interviews/:interviewId" component={() => <Protected><InterviewDetailPage /></Protected>} /><Route path="/interviews" component={() => <Protected><InterviewsPage /></Protected>} /><Route component={NotFoundPage} /></Switch></ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const stripBase = (path: string) => basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{ signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to access your practice room' } }, signUp: { start: { title: 'Create your practice room', subtitle: 'Build a stronger interview signal' } } }} routerPush={(to) => setLocation(stripBase(to))} routerReplace={(to) => setLocation(stripBase(to), { replace: true })}><QueryClientProvider client={queryClient}><TooltipProvider><ClerkQueryClientCacheInvalidator /><Router /><Toaster /></TooltipProvider></QueryClientProvider></ClerkProvider>;
}

function App() {
  return <WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter>;
}

export default App;