import { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ExternalLink,
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
      <section className="mt-8">
        <div className="mb-4">
          <p className="font-mono-ui text-[10px] uppercase tracking-[.22em] text-muted-foreground">Primary-source reading</p>
          <h2 className="mt-2 font-display text-2xl font-semibold">Build answers from material that holds up.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">These public references add depth to your practice. Read the source, then explain one idea aloud in your own words.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ['MDN', 'HTTP overview', 'Request lifecycles, caching, and the browser fundamentals behind web answers.', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview'],
            ['Google SRE', 'Service reliability', 'A practical foundation for discussing availability, incidents, and operational trade-offs.', 'https://sre.google/sre-book/table-of-contents/'],
            ['OWASP', 'API Security Top 10', 'Use broken authorization, unsafe consumption, and resource limits as a security checklist.', 'https://owasp.org/API-Security/editions/2023/en/0x10-api-security-risks'],
            ['PostgreSQL', 'Indexes', 'Explain why indexes speed reads while adding write and storage overhead.', 'https://www.postgresql.org/docs/current/indexes.html'],
            ['AWS', 'Well-Architected', 'A repeatable lens for system-design answers: reliability, security, cost, and performance.', 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html'],
            ['MIT OpenCourseWare', 'Algorithms', 'Review algorithmic thinking, complexity, and the reasoning interviewers want to hear.', 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/'],
          ].map(([source, title, copy, href]) => (
            <a key={href} href={href} target="_blank" rel="noreferrer" className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-secondary/60 hover:shadow-md">
              <div className="flex items-center justify-between"><span className="font-mono-ui text-[10px] uppercase tracking-wider text-secondary">{source}</span><ExternalLink className="size-4 text-muted-foreground transition group-hover:text-secondary" /></div>
              <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
            </a>
          ))}
        </div>
      </section>
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
        window.dispatchEvent(new CustomEvent(`${key}:updated`));
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
  const [presentation, setPresentation] = useState<'male' | 'female'>('male');
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
      <section className="mb-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Presentation guide</p>
            <h2 className="mt-2 font-display text-2xl font-semibold">Dress for confidence, not a stereotype.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Choose the guide that matches how you want to present. These are practical options, not rules about identity.</p>
          </div>
          <div className="flex shrink-0 gap-2 rounded-xl bg-muted p-1" role="group" aria-label="Presentation guide">
            {(['male', 'female'] as const).map((option) => (
              <button type="button" key={option} onClick={() => setPresentation(option)} className={cn('min-h-10 rounded-lg px-4 text-sm font-semibold capitalize transition', presentation === option ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')} data-testid={`button-presentation-${option}`}>{option}</button>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-muted/70 p-5">
            <p className="font-mono-ui text-xs font-semibold uppercase tracking-wider text-secondary">Wardrobe options</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              {(presentation === 'male'
                ? ['A well-fitted shirt or polo with clean trousers; add a blazer for a formal room.', 'Keep shoes clean and understated, and check that the collar and sleeves sit comfortably.', 'Use one simple accessory at most and avoid visible logos that compete with your answer.']
                : ['A well-fitted blouse, knit top, or shirt with tailored trousers or a simple professional dress.', 'Choose comfortable shoes and layers that stay in place when you move or sit.', 'Keep accessories intentional and avoid anything that makes you adjust your outfit while answering.']
              ).map((item) => <li key={item} className="flex gap-3"><Check className="mt-1 size-4 shrink-0 text-secondary" />{item}</li>)}
            </ul>
          </div>
          <div className="rounded-xl bg-muted/70 p-5">
            <p className="font-mono-ui text-xs font-semibold uppercase tracking-wider text-secondary">Gestures & presence</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              {['Keep shoulders relaxed and hands visible when making an important point.', 'Look at the camera or interviewer while speaking, then pause before follow-ups.', 'Use natural gestures; clarity and comfort matter more than performing confidence.'].map((item) => <li key={item} className="flex gap-3"><Check className="mt-1 size-4 shrink-0 text-secondary" />{item}</li>)}
            </ul>
          </div>
        </div>
      </section>
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
                    <span className={cn('text-sm leading-5', checked[id] && 'text-muted-foreground')}>{label}</span>
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

type Question = { id: string; course: string; category: string; difficulty: 'Beginner' | 'Intermediate' | 'Advanced'; question: string; focus: string; source: string };

const questionBank: Question[] = [
  { id: 'dsa-1', course: 'DSA fundamentals', category: 'Arrays & strings', difficulty: 'Beginner', question: 'How would you find the first non-repeating character in a string?', focus: 'Frequency maps, one-pass reasoning, and O(n) time.', source: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map' },
  { id: 'dsa-2', course: 'DSA fundamentals', category: 'Graphs', difficulty: 'Intermediate', question: 'When would you choose breadth-first search over depth-first search?', focus: 'Shortest unweighted paths, traversal order, and memory trade-offs.', source: 'https://cp-algorithms.com/graph/breadth-first-search.html' },
  { id: 'dsa-3', course: 'DSA fundamentals', category: 'Intervals', difficulty: 'Intermediate', question: 'How would you merge overlapping meeting intervals?', focus: 'Sort by start time, maintain an active interval, and state complexity.', source: 'https://leetcode.com/problems/merge-intervals/' },
  { id: 'dsa-4', course: 'DSA fundamentals', category: 'Dynamic programming', difficulty: 'Advanced', question: 'Explain the state, transition, and base cases for climbing stairs with variable costs.', focus: 'State definition, overlapping subproblems, and space optimization.', source: 'https://www.geeksforgeeks.org/dynamic-programming/' },
  { id: 'dsa-5', course: 'DSA fundamentals', category: 'Data structures', difficulty: 'Beginner', question: 'Compare a stack, queue, and deque. Give one production use for each.', focus: 'LIFO/FIFO behavior, APIs, and practical examples.', source: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array' },
  { id: 'dbms-1', course: 'Backend foundations', category: 'DBMS', difficulty: 'Intermediate', question: 'Explain indexing and the trade-offs it introduces for writes.', focus: 'Selectivity, B-trees, write amplification, and query plans.', source: 'https://www.postgresql.org/docs/current/indexes.html' },
  { id: 'dbms-2', course: 'Backend foundations', category: 'DBMS', difficulty: 'Advanced', question: 'How would you diagnose a slow query in production?', focus: 'EXPLAIN, cardinality, locks, indexes, and safe rollout.', source: 'https://www.postgresql.org/docs/current/using-explain.html' },
  { id: 'net-1', course: 'Web fundamentals', category: 'Networking', difficulty: 'Intermediate', question: 'Walk through what happens after entering a URL in a browser.', focus: 'DNS, TCP/TLS, HTTP, caching, rendering, and failure points.', source: 'https://developer.mozilla.org/en-US/docs/Web/Performance/How_browsers_work' },
  { id: 'web-1', course: 'Web fundamentals', category: 'Performance', difficulty: 'Intermediate', question: 'How would you make a page resilient to a slow API?', focus: 'Loading states, timeouts, retries, caching, and progressive rendering.', source: 'https://developer.mozilla.org/en-US/docs/Web/Performance' },
  { id: 'system-1', course: 'System design', category: 'Reliability', difficulty: 'Advanced', question: 'Design a notification system that handles retries and duplicate delivery.', focus: 'Queues, idempotency keys, backoff, dead letters, and observability.', source: 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html' },
  { id: 'system-2', course: 'System design', category: 'Scalability', difficulty: 'Advanced', question: 'Design a URL shortener and explain how you would scale reads globally.', focus: 'Key generation, caching, replication, hot keys, and consistency.', source: 'https://aws.amazon.com/builders-library/' },
  { id: 'security-1', course: 'System design', category: 'Security', difficulty: 'Intermediate', question: 'What security controls should protect a public API?', focus: 'Authorization, validation, rate limits, logging, and abuse resistance.', source: 'https://owasp.org/Top10/2025/en/' },
  { id: 'hr-1', course: 'Behavioral stories', category: 'Communication', difficulty: 'Beginner', question: 'Tell me about a time you had to learn something quickly.', focus: 'STAR structure, evidence, reflection, and the result.', source: 'https://careers.google.com/how-we-hire/interview/' },
  { id: 'behavioral-1', course: 'Behavioral stories', category: 'Collaboration', difficulty: 'Intermediate', question: 'Describe a disagreement and how you moved the work forward.', focus: 'Shared goal, listening, decision quality, and measurable outcome.', source: 'https://www.atlassian.com/blog/leadership/how-to-answer-behavioral-interview-questions' },
  { id: 'project-1', course: 'Behavioral stories', category: 'Projects', difficulty: 'Advanced', question: 'What would you change if you rebuilt your most important project?', focus: 'Self-awareness, trade-offs, constraints, and learning velocity.', source: 'https://stackoverflow.blog/2022/01/06/how-to-answer-tell-me-about-a-project/' },
];

const courseCards = [
  ['DSA fundamentals', 'Arrays, graphs, intervals, and dynamic programming with complexity-first explanations.'],
  ['Backend foundations', 'Indexes, query plans, and production diagnosis for reliable data-heavy services.'],
  ['Web fundamentals', 'Browser lifecycle, performance budgets, and resilient API-driven interfaces.'],
  ['System design', 'Reliability, scalability, security controls, and trade-offs interviewers expect you to name.'],
  ['Behavioral stories', 'Build evidence-backed answers with STAR, ownership, reflection, and impact.'],
] as const;

export function QuestionBankPage() {
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('All');
  const [category, setCategory] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [bookmarks, toggleBookmark] = useBooleanMap('interviewai.question-bookmarks');
  const categories = ['All', ...Array.from(new Set(questionBank.map((item) => item.category)))];
  const filtered = useMemo(() => questionBank.filter((item) => {
    const matchesSearch = item.question.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (course === 'All' || item.course === course) && (category === 'All' || item.category === category) && (difficulty === 'All' || item.difficulty === difficulty);
  }), [category, course, difficulty, search]);

  return (
    <PrepFrame eyebrow="Prepare" title="Question Bank" description="Search by topic, save the questions worth revisiting, and open a focused interview when you are ready to practice aloud.">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-5 grid gap-3 md:grid-cols-5">
          {courseCards.map(([title, copy]) => (
            <button type="button" key={title} onClick={() => { setCourse(title); setSearch(''); }} className={cn('rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm', course === title ? 'border-secondary bg-secondary/10' : 'border-border bg-background')} data-testid={`button-course-${title.toLowerCase().replaceAll(' ', '-')}`}>
              <span className="block font-display text-base font-semibold">{title}</span>
              <span className="mt-2 block text-xs leading-5 text-muted-foreground">{copy}</span>
              <span className="mt-3 block text-[11px] font-bold text-secondary">{questionBank.filter((item) => item.course === title).length} guided questions</span>
            </button>
          ))}
        </div>
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
          <button type="button" onClick={() => setCourse('All')} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground hover:text-foreground">All courses</button>
          <span className="ml-auto self-center whitespace-nowrap text-xs text-muted-foreground">{filtered.length} questions</span>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No questions match those filters.</div>
        ) : filtered.map((item) => (
          <article key={item.id} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">{item.course}</span><span className="text-xs text-muted-foreground">{item.category} · {item.difficulty}</span></div><h2 className="mt-3 font-display text-lg font-semibold leading-6">{item.question}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground"><strong className="text-foreground">What to cover:</strong> {item.focus}</p><a href={item.source} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline">Read the primary reference <ExternalLink className="size-3.5" /></a></div>
            <button type="button" onClick={() => toggleBookmark(item.id)} className="grid size-10 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={bookmarks[item.id] ? 'Remove bookmark' : 'Bookmark question'}>{bookmarks[item.id] ? <BookmarkCheck className="size-5 text-secondary" /> : <Bookmark className="size-5" />}</button>
            <Link href="/interviews/new" className="hidden min-h-10 shrink-0 items-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground sm:inline-flex">Practice</Link>
          </article>
        ))}
      </div>
    </PrepFrame>
  );
}

export const STUDY_PLAN = [
  ['day-1', 'Day 1', 'DSA foundations', 'Review arrays, maps, graph traversal, and state transitions.'],
  ['day-2', 'Day 2', 'Database performance', 'Use EXPLAIN, compare indexes, and describe write trade-offs.'],
  ['day-3', 'Day 3', 'Web performance', 'Trace a browser request and identify loading, caching, and rendering wins.'],
  ['day-4', 'Day 4', 'System design', 'Sketch one service and name reliability, scale, security, and cost trade-offs.'],
  ['day-5', 'Day 5', 'Project defense', 'Prepare architecture, challenge, ownership, and measurable outcomes.'],
  ['day-6', 'Day 6', 'Behavioral stories', 'Write two STAR stories from your real experience and rehearse aloud.'],
  ['day-7', 'Day 7', 'Full mock interview', 'Run a mixed session and review the practice report.'],
] as const;

export function StudyPlanPage() {
  const [completed, toggle] = useBooleanMap('interviewai.study-plan');
  const done = STUDY_PLAN.filter(([id]) => completed[id]).length;
  return (
    <PrepFrame eyebrow="Prepare" title="A plan you can finish." description="A focused seven-day loop that turns your weaker signals into specific practice. Mark work complete as you go.">
      <div className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-md sm:p-8">
        <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary-foreground/55">This week</p>
        <div className="mt-2 flex items-end justify-between gap-4"><h2 className="font-display text-3xl font-semibold">{done}/7 complete</h2><span className="text-sm text-primary-foreground/65">{Math.round((done / 7) * 100)}% of the plan</span></div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-primary-foreground/15"><div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${(done / 7) * 100}%` }} /></div>
      </div>
      <div className="mt-5 space-y-3">
        {STUDY_PLAN.map(([id, day, title, description]) => (
          <button type="button" key={id} onClick={() => toggle(id)} className={cn('flex w-full items-center gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md', completed[id] ? 'border-secondary/50' : 'border-border')}>
            <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl font-mono-ui text-xs font-bold', completed[id] ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground')}>{completed[id] ? <Check className="size-5" /> : day.replace('Day ', 'D')}</span>
            <span className="min-w-0 flex-1"><span className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">{day}</span><span className={cn('mt-1 block font-display text-lg font-semibold', completed[id] && 'text-muted-foreground line-through')}>{title}</span><span className="mt-1 block text-sm leading-5 text-muted-foreground">{description}</span></span>
          </button>
        ))}
      </div>
    </PrepFrame>
  );
}