import { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCircle2,
  Laptop,
  Search,
  Shirt,
  Video,
} from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

type PrepFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

function PrepFrame({ eyebrow, title, description, children }: PrepFrameProps) {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-7 lg:px-10 lg:py-11">
      <div className="mb-8">
        <p className="font-mono-ui text-[10px] font-medium uppercase tracking-[.22em] text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function useBooleanMap(key: string) {
  const [values, setValues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) setValues(JSON.parse(saved) as Record<string, boolean>);
    } catch {
      // A blocked or malformed local store should not prevent preparation.
    }
  }, [key]);

  const toggle = (item: string) => {
    setValues((current) => {
      const next = { ...current, [item]: !current[item] };
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // The in-memory state still gives immediate feedback.
      }
      return next;
    });
  };

  return [values, toggle] as const;
}

const readinessSections = [
  {
    title: 'Professional presence',
    icon: Shirt,
    items: [
      ['dress', 'Choose clean, role-appropriate clothing that lets you focus'],
      ['grooming', 'Check grooming, hair, and accessories before joining'],
      ['environment', 'Match the formality of the company and interview format'],
    ],
  },
  {
    title: 'Body language',
    icon: CheckCircle2,
    items: [
      ['eye-contact', 'Look toward the camera when answering online'],
      ['posture', 'Sit comfortably upright with both feet supported'],
      ['listening', 'Use a natural listening expression and pause before responding'],
      ['gestures', 'Keep gestures purposeful and avoid distracting movement'],
    ],
  },
  {
    title: 'Online setup',
    icon: Video,
    items: [
      ['camera', 'Place the camera at eye level with your face well framed'],
      ['lighting', 'Use light in front of you and keep the background uncluttered'],
      ['microphone', 'Test your microphone, headphones, and connection'],
      ['materials', 'Keep your resume and job description ready'],
    ],
  },
];

export function InterviewReadinessPage() {
  const [checked, toggle] = useBooleanMap('interviewai.readiness');
  const total = readinessSections.reduce((sum, section) => sum + section.items.length, 0);
  const complete = Object.values(checked).filter(Boolean).length;

  return (
    <PrepFrame eyebrow="Interview readiness" title="Show up ready for the room." description="Practical preparation for your presence, communication, and online setup. These are practice prompts, not personality or emotion diagnoses.">
      <div className="mb-5 rounded-2xl bg-primary p-6 text-primary-foreground shadow-md sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary-foreground/55">Your checklist</p>
            <h2 className="mt-2 font-display text-2xl font-semibold">{complete} of {total} ready</h2>
            <p className="mt-2 text-sm text-primary-foreground/65">Tick each item once it is ready for your next practice or interview.</p>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-primary-foreground/15 sm:max-w-xs">
            <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${(complete / total) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {readinessSections.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground"><Icon className="size-5" /></span>
                <h2 className="font-display text-xl font-semibold">{section.title}</h2>
              </div>
              <div className="mt-6 space-y-3">
                {section.items.map(([id, label]) => (
                  <button type="button" key={id} onClick={() => toggle(id)} className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-muted">
                    <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border', checked[id] ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-input')}>
                      {checked[id] && <Check className="size-3.5" />}
                    </span>
                    <span className={cn('text-sm leading-5', checked[id] && 'text-muted-foreground line-through')}>{label}</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <section className="mt-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-secondary/20 text-[hsl(27_78%_34%)]"><Laptop className="size-5" /></span>
          <div><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Answer frameworks</p><h2 className="mt-1 font-display text-2xl font-semibold">Make your thinking easy to follow.</h2></div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-muted p-5"><p className="font-mono-ui text-xs font-semibold uppercase tracking-wider text-secondary">Behavioral</p><p className="mt-3 text-sm leading-6"><strong>Situation</strong> → <strong>Task</strong> → <strong>Action</strong> → <strong>Result</strong></p><p className="mt-2 text-xs leading-5 text-muted-foreground">Keep the action specific to what you owned and close with a measurable result.</p></div>
          <div className="rounded-xl bg-muted p-5"><p className="font-mono-ui text-xs font-semibold uppercase tracking-wider text-secondary">Technical</p><p className="mt-3 text-sm leading-6"><strong>Concept</strong> → <strong>Explanation</strong> → <strong>Example</strong> → <strong>Conclusion</strong></p><p className="mt-2 text-xs leading-5 text-muted-foreground">State assumptions, explain trade-offs, and connect the answer to a real use case.</p></div>
        </div>
      </section>
    </PrepFrame>
  );
}

type Question = { id: string; category: string; difficulty: 'Beginner' | 'Intermediate' | 'Advanced'; question: string };

const questionBank: Question[] = [
  { id: 'dsa-1', category: 'DSA', difficulty: 'Beginner', question: 'How would you find the first non-repeating character in a string?' },
  { id: 'dsa-2', category: 'DSA', difficulty: 'Intermediate', question: 'When would you choose a breadth-first search over a depth-first search?' },
  { id: 'dbms-1', category: 'DBMS', difficulty: 'Intermediate', question: 'Explain indexing and the trade-offs it introduces for writes.' },
  { id: 'dbms-2', category: 'DBMS', difficulty: 'Advanced', question: 'How would you diagnose a slow query in production?' },
  { id: 'os-1', category: 'Operating Systems', difficulty: 'Beginner', question: 'What is the difference between a process and a thread?' },
  { id: 'net-1', category: 'Computer Networks', difficulty: 'Intermediate', question: 'Walk through what happens after entering a URL in a browser.' },
  { id: 'oop-1', category: 'OOP', difficulty: 'Beginner', question: 'When is composition a better choice than inheritance?' },
  { id: 'web-1', category: 'Web Development', difficulty: 'Intermediate', question: 'How would you make a web page resilient to a slow API?' },
  { id: 'system-1', category: 'System Design', difficulty: 'Advanced', question: 'Design a notification system that can handle retries and duplicates.' },
  { id: 'hr-1', category: 'HR', difficulty: 'Beginner', question: 'Tell me about a time you had to learn something quickly.' },
  { id: 'behavioral-1', category: 'Behavioral', difficulty: 'Intermediate', question: 'Describe a disagreement and how you moved the work forward.' },
  { id: 'project-1', category: 'Projects', difficulty: 'Advanced', question: 'What would you change if you rebuilt your most important project?' },
];

export function QuestionBankPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [bookmarks, toggleBookmark] = useBooleanMap('interviewai.question-bookmarks');
  const categories = ['All', ...Array.from(new Set(questionBank.map((item) => item.category)))];
  const filtered = useMemo(() => questionBank.filter((item) => {
    const matchesSearch = item.question.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (category === 'All' || item.category === category) && (difficulty === 'All' || item.difficulty === difficulty);
  }), [category, difficulty, search]);

  return (
    <PrepFrame eyebrow="Prepare" title="Question Bank" description="Search by topic, save the questions worth revisiting, and open a focused interview when you are ready to practice aloud.">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="relative">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions or topics" className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20" />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
            {['All', 'Beginner', 'Intermediate', 'Advanced'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <span className="ml-auto self-center whitespace-nowrap text-xs text-muted-foreground">{filtered.length} questions</span>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No questions match those filters.</div>
        ) : filtered.map((item) => (
          <article key={item.id} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">{item.category}</span><span className="text-xs text-muted-foreground">{item.difficulty}</span></div><h2 className="mt-3 font-display text-lg font-semibold leading-6">{item.question}</h2></div>
            <button type="button" onClick={() => toggleBookmark(item.id)} className="grid size-10 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={bookmarks[item.id] ? 'Remove bookmark' : 'Bookmark question'}>{bookmarks[item.id] ? <BookmarkCheck className="size-5 text-secondary" /> : <Bookmark className="size-5" />}</button>
            <Link href="/interviews/new" className="hidden min-h-10 shrink-0 items-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground sm:inline-flex">Practice</Link>
          </article>
        ))}
      </div>
    </PrepFrame>
  );
}

const studyPlan = [
  ['day-1', 'Day 1', 'DBMS foundations', 'Review normalization, indexes, and transactions.'],
  ['day-2', 'Day 2', 'SQL practice', 'Solve three queries and explain your choices aloud.'],
  ['day-3', 'Day 3', 'Networking', 'Rehearse the browser-to-server request lifecycle.'],
  ['day-4', 'Day 4', 'System design', 'Sketch one service and name its trade-offs.'],
  ['day-5', 'Day 5', 'Project defense', 'Prepare architecture, challenge, and scale follow-ups.'],
  ['day-6', 'Day 6', 'Behavioral stories', 'Write two STAR stories from your real experience.'],
  ['day-7', 'Day 7', 'Full mock interview', 'Run a mixed session and review the practice report.'],
];

export function StudyPlanPage() {
  const [completed, toggle] = useBooleanMap('interviewai.study-plan');
  const done = studyPlan.filter(([id]) => completed[id]).length;
  return (
    <PrepFrame eyebrow="Prepare" title="A plan you can finish." description="A focused seven-day loop that turns your weaker signals into specific practice. Mark work complete as you go.">
      <div className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-md sm:p-8">
        <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary-foreground/55">This week</p>
        <div className="mt-2 flex items-end justify-between gap-4"><h2 className="font-display text-3xl font-semibold">{done}/7 complete</h2><span className="text-sm text-primary-foreground/65">{Math.round((done / 7) * 100)}% of the plan</span></div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-primary-foreground/15"><div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${(done / 7) * 100}%` }} /></div>
      </div>
      <div className="mt-5 space-y-3">
        {studyPlan.map(([id, day, title, description]) => (
          <button type="button" key={id} onClick={() => toggle(id)} className={cn('flex w-full items-center gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md', completed[id] ? 'border-secondary/50' : 'border-border')}>
            <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl font-mono-ui text-xs font-bold', completed[id] ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground')}>{completed[id] ? <Check className="size-5" /> : day.replace('Day ', 'D')}</span>
            <span className="min-w-0 flex-1"><span className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">{day}</span><span className={cn('mt-1 block font-display text-lg font-semibold', completed[id] && 'text-muted-foreground line-through')}>{title}</span><span className="mt-1 block text-sm leading-5 text-muted-foreground">{description}</span></span>
          </button>
        ))}
      </div>
    </PrepFrame>
  );
}