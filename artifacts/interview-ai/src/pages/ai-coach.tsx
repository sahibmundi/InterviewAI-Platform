import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  FileSearch,
  Link as LinkIcon,
  LoaderCircle,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import { Link } from "wouter";
import {
  useAnalyzeResume,
  useAskCoach,
  useGetProfile,
} from "@workspace/api-client-react";
import { VoiceInputButton } from "@/components/voice-input";
import {
  extractResumeText,
  RESUME_FILE_ACCEPT,
} from "@/lib/resume-file-parser";

const cn = (...parts: Array<string | false | undefined>) =>
  parts.filter(Boolean).join(" ");

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  const data = (error as { data?: unknown }).data;
  if (data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string") {
    return (data as { error: string }).error;
  }
  return fallback;
}

const resourceLinks = [
  {
    source: "OWASP",
    title: "API Security Top 10",
    description: "Use authorization, authentication, and resource limits as a checklist when explaining API design.",
    href: "https://owasp.org/API-Security/editions/2023/en/0x10-api-security-risks",
  },
  {
    source: "PostgreSQL",
    title: "Indexes and query performance",
    description: "A strong database answer explains the read-speed gain and the write/storage cost of indexes.",
    href: "https://www.postgresql.org/docs/current/indexes.html",
  },
  {
    source: "AWS",
    title: "Well-Architected Framework",
    description: "Structure system design trade-offs around reliability, security, cost, performance, and operations.",
    href: "https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html",
  },
];

function SectionFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-7 lg:px-10 lg:py-11">{children}</div>;
}

export function AICoachPage() {
  const profile = useGetProfile();
  const analyze = useAnalyzeResume();
  const ask = useAskCoach();
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [resumeVoiceError, setResumeVoiceError] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeFileError, setResumeFileError] = useState("");
  const [isParsingResume, setIsParsingResume] = useState(false);

  const submitResume = (event: FormEvent) => {
    event.preventDefault();
    if (resumeText.trim().length < 40) return;
    analyze.mutate({ data: { resumeText: resumeText.trim(), jobDescription: jobDescription.trim() || undefined } });
  };

  const submitQuestion = (event: FormEvent) => {
    event.preventDefault();
    if (question.trim().length < 3) return;
    const profileContext =
      context.trim() ||
      (profile.data
        ? `${profile.data.preferredRole}; ${profile.data.skills.join(", ")}; ${profile.data.experience}`
        : undefined);
    ask.mutate({ data: { question: question.trim(), context: profileContext || undefined } });
  };

  const handleResumeFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setResumeFileName(file.name);
    setResumeFileError("");
    setIsParsingResume(true);
    try {
      const extractedText = await extractResumeText(file);
      if (extractedText.length < 40) {
        throw new Error(
          "We could not find enough selectable text in that file. Try a text-based PDF or DOCX, or paste the content below.",
        );
      }
      setResumeText(extractedText);
    } catch (error) {
      setResumeFileName("");
      setResumeFileError(
        error instanceof Error
          ? error.message
          : "We could not read that resume file.",
      );
    } finally {
      setIsParsingResume(false);
    }
  };

  return (
    <SectionFrame>
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono-ui text-[10px] font-medium uppercase tracking-[.22em] text-muted-foreground">Gemini workspace</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Ask better. Prepare deeper.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Analyze your resume against a role, pressure-test your stories, and turn dense technical topics into practice-ready answers.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-full bg-secondary/15 px-3 py-2 text-xs font-semibold text-[hsl(27_78%_34%)] sm:self-auto">
          <Sparkles className="size-4" /> Powered by Gemini
        </span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <form onSubmit={submitResume} className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground"><FileSearch className="size-5" /></span>
            <div>
              <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Resume lab</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">Get a sharper read on your resume.</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Upload your resume or paste the text. Add a job description to surface relevant gaps and keywords.</p>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-dashed border-secondary/50 bg-secondary/5 p-4">
            <label className="flex cursor-pointer items-center gap-4 rounded-lg p-2 transition hover:bg-secondary/10">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                {isParsingResume ? <LoaderCircle className="size-5 animate-spin" /> : <Upload className="size-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {isParsingResume ? "Reading your resume…" : "Upload a resume file"}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  PDF, DOCX, or TXT · up to 10 MB · text is extracted in your browser
                </span>
              </span>
              <span className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
                Choose file
              </span>
              <input
                type="file"
                accept={RESUME_FILE_ACCEPT}
                onChange={handleResumeFile}
                disabled={isParsingResume}
                className="sr-only"
                data-testid="input-resume-file"
              />
            </label>
            {resumeFileName && !resumeFileError && (
              <p className="mt-2 truncate px-2 text-xs font-semibold text-[hsl(169_35%_35%)]">
                {resumeFileName} loaded and ready to review
              </p>
            )}
            {resumeFileError && (
              <p className="mt-2 px-2 text-xs leading-5 text-destructive" data-testid="status-resume-file-error">
                {resumeFileError}
              </p>
            )}
          </div>
          <label className="mt-6 block">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">Resume text</span>
              <VoiceInputButton value={resumeText} onChange={setResumeText} label="Dictate" onError={setResumeVoiceError} />
            </div>
            <textarea value={resumeText} onChange={(event) => setResumeText(event.target.value)} rows={12} className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm leading-6 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20" placeholder="Your extracted resume text will appear here. You can review or edit it before analysis." />
            {resumeVoiceError && <span className="mt-2 block text-xs text-destructive">{resumeVoiceError}</span>}
            <span className="mt-2 block text-right font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">
              {resumeText.length.toLocaleString()} characters extracted
            </span>
          </label>
          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-semibold">Target job description <span className="font-normal text-muted-foreground">(optional)</span></span>
            <textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} rows={6} className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm leading-6 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20" placeholder="Paste the role, responsibilities, and requirements…" />
          </label>
          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">Gemini reviews content you submit; it does not predict hiring outcomes.</p>
             <button type="submit" disabled={analyze.isPending || isParsingResume || resumeText.trim().length < 40} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-secondary px-4 text-sm font-bold text-secondary-foreground shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-analyze-resume">
              {analyze.isPending ? "Reviewing…" : "Analyze resume"} <ArrowRight className="size-4" />
            </button>
          </div>
          {analyze.isError && <p className="mt-4 text-sm text-destructive" data-testid="status-resume-error">{getApiErrorMessage(analyze.error, "The resume analysis could not be completed. Try again.")}</p>}
        </form>

        <div className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-md sm:p-8">
          <div className="flex items-start gap-3"><BrainCircuit className="mt-1 size-5 text-secondary" /><div><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary-foreground/55">How to use the coach</p><h2 className="mt-2 font-display text-2xl font-semibold">Bring evidence, not just a topic.</h2></div></div>
          <div className="mt-7 space-y-5">
            {[
              ["1", "Paste a real artifact", "Use your resume, a project description, or the job requirements you are preparing for."],
              ["2", "Ask for a rehearsal", "Ask for a STAR outline, a system design drill, or follow-up questions on your weak spot."],
              ["3", "Practice the answer aloud", "Use the voice button below or in a live interview session, then revise for clarity."],
            ].map(([number, title, copy]) => <div key={number} className="flex gap-4"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary font-mono-ui text-xs font-bold text-secondary-foreground">{number}</span><div><p className="font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-primary-foreground/65">{copy}</p></div></div>)}
          </div>
        </div>
      </div>

      {analyze.data && <section className="mt-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8" data-testid="section-resume-analysis">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Analysis result</p><h2 className="mt-2 font-display text-2xl font-semibold">Your resume has a {analyze.data.overallScore}/100 practice signal.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{analyze.data.summary}</p></div>
          <div className="grid size-20 shrink-0 place-items-center rounded-full border-[6px] border-secondary/30 bg-secondary/10 font-display text-2xl font-bold text-[hsl(27_78%_34%)]">{analyze.data.overallScore}</div>
        </div>
        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {([
            ["Strengths", analyze.data.strengths, "text-[hsl(169_35%_35%)]", "bg-accent"],
            ["Gaps to close", analyze.data.gaps, "text-destructive", "bg-destructive/5"],
            ["Next steps", analyze.data.nextSteps, "text-[hsl(27_78%_34%)]", "bg-secondary/10"],
          ] as Array<[string, string[], string, string]>).map(([title, items, tone, background]) => <div key={title} className={cn("rounded-xl p-5", background)}><p className={cn("font-mono-ui text-xs font-semibold uppercase tracking-wider", tone)}>{title}</p><ul className="mt-4 space-y-3">{items.map((item) => <li key={item} className="flex items-start gap-2 text-sm leading-6"><Check className="mt-1 size-4 shrink-0" />{item}</li>)}</ul></div>)}
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div><p className="text-sm font-semibold">Relevant keywords</p><div className="mt-3 flex flex-wrap gap-2">{analyze.data.keywords.map((keyword) => <span key={keyword} className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">{keyword}</span>)}</div></div>
          <div><p className="text-sm font-semibold">Stronger bullet directions</p><ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">{analyze.data.rewrittenBullets.map((bullet) => <li key={bullet} className="border-l-2 border-secondary pl-3">{bullet}</li>)}</ul></div>
        </div>
      </section>}

      <section className="mt-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4"><span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground"><Target className="size-5" /></span><div><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Ask anything</p><h2 className="mt-1 font-display text-2xl font-semibold">Turn a doubt into a rehearsal.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Get an answer, a framework, and the follow-ups you should practice next.</p></div></div>
        <form onSubmit={submitQuestion} className="mt-6 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div><div className="flex items-center justify-between gap-3"><label htmlFor="coach-question" className="text-sm font-semibold">Your question</label><VoiceInputButton value={question} onChange={setQuestion} label="Ask by voice" onError={setVoiceError} /></div><textarea id="coach-question" value={question} onChange={(event) => setQuestion(event.target.value)} rows={6} className="mt-2 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm leading-6 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20" placeholder="How should I explain a system design trade-off? What follow-ups might an interviewer ask about my project?" />{voiceError && <p className="mt-2 text-xs text-destructive">{voiceError}</p>}</div>
          <div><label htmlFor="coach-context" className="text-sm font-semibold">Extra context <span className="font-normal text-muted-foreground">(optional)</span></label><textarea id="coach-context" value={context} onChange={(event) => setContext(event.target.value)} rows={6} className="mt-2 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm leading-6 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20" placeholder="Paste a project, role, or your rough answer…" /><button type="submit" disabled={ask.isPending || question.trim().length < 3} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-ask-coach">{ask.isPending ? "Thinking…" : "Ask the coach"} <ArrowRight className="size-4" /></button></div>
        </form>
        {ask.isError && <p className="mt-4 text-sm text-destructive">{getApiErrorMessage(ask.error, "The coach could not answer right now. Try again in a moment.")}</p>}
        {ask.data && <div className="mt-7 grid gap-5 lg:grid-cols-[1.2fr_.8fr]" data-testid="section-coach-answer"><div className="rounded-xl bg-muted p-5"><p className="font-mono-ui text-xs font-semibold uppercase tracking-wider text-secondary">Coach answer</p><p className="mt-4 whitespace-pre-wrap text-sm leading-7">{ask.data.answer}</p></div><div className="space-y-4"><div className="rounded-xl border border-border p-5"><p className="font-mono-ui text-xs font-semibold uppercase tracking-wider text-secondary">Framework</p><p className="mt-3 text-sm leading-6">{ask.data.framework}</p></div><div className="rounded-xl border border-border p-5"><p className="font-mono-ui text-xs font-semibold uppercase tracking-wider text-secondary">Likely follow-ups</p><ul className="mt-3 space-y-2 text-sm leading-6">{ask.data.followUps.map((item) => <li key={item} className="flex gap-2"><ArrowRight className="mt-1 size-4 shrink-0 text-secondary" />{item}</li>)}</ul></div></div></div>}
      </section>

      <section className="mt-5">
        <div className="mb-4"><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Trusted reading desk</p><h2 className="mt-2 font-display text-2xl font-semibold">Go deeper with primary sources.</h2></div>
        <div className="grid gap-3 md:grid-cols-3">{resourceLinks.map((resource) => <a key={resource.href} href={resource.href} target="_blank" rel="noreferrer" className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-secondary/60 hover:shadow-md"><div className="flex items-center justify-between"><span className="font-mono-ui text-[10px] uppercase tracking-wider text-secondary">{resource.source}</span><LinkIcon className="size-4 text-muted-foreground transition group-hover:text-secondary" /></div><h3 className="mt-6 font-display text-lg font-semibold">{resource.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{resource.description}</p></a>)}</div>
      </section>

      <div className="mt-7 flex flex-wrap gap-3 text-sm"><Link href="/question-bank" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 font-semibold hover:border-secondary/60">Open question bank <ArrowRight className="size-4" /></Link><Link href="/study-plan" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 font-semibold hover:border-secondary/60">See study plan <ArrowRight className="size-4" /></Link></div>
    </SectionFrame>
  );
}