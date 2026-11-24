import { useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBenchmarks, type BenchmarkSummary } from '../api/client';
import { formatScore } from '../components/ui';
import markup from './landing.html?raw';
import stylesheet from './landing.css?inline';
import { mountLanding } from './landing.js';

const SLOT_TOKENS = { A: '--v-openai', B: '--v-anthropic', C: '--v-google', D: '--v-moonshot' } as const;

/** Fills a stage's benchmark card with the benchmark's top three from the API. */
function fillLeaders(root: HTMLElement, benchmark: BenchmarkSummary) {
  const card = root.querySelector(`[data-bench="${benchmark.shortName}"]`);
  if (!card) {
    return;
  }
  card.querySelector('.meta')!.textContent = `${benchmark.taskCount} 道任务 · ${benchmark.metric.name} · 前 3 名`;
  const list = card.querySelector('ol.leaders')!;
  list.replaceChildren(...benchmark.topThree.map(entry => {
    const item = document.createElement('li');
    const cell = (className: string, text: string) => Object.assign(document.createElement('span'), { className, textContent: text });
    const mark = cell('mark', entry.model.slot);
    mark.style.setProperty('--v', `var(${SLOT_TOKENS[entry.model.slot]})`);
    const bar = cell('bar', '');
    const fill = document.createElement('i');
    fill.style.setProperty('--w', String(Math.min(1, entry.score)));
    bar.append(fill);
    item.append(cell('rank', String(entry.rank)), mark, cell('model', entry.model.name), bar, cell('score', formatScore(entry.score, benchmark.metric)));
    return item;
  }));
}

/**
 * The ∞ landing page from the design prototype. Its stylesheet is global, so it is attached only while the page
 * is shown, and its markup is restored on teardown so that a remount starts from a clean document.
 */
export function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const benchmarks = useBenchmarks();
  useLayoutEffect(() => {
    const style = document.createElement('style');
    style.textContent = stylesheet;
    document.head.appendChild(style);
    const teardown = mountLanding(to => navigate(to));
    const container = root.current;
    return () => {
      teardown();
      style.remove();
      if (container) {
        container.innerHTML = markup;
      }
    };
  }, [navigate]);
  useEffect(() => {
    if (!benchmarks.data || !root.current) {
      return;
    }
    benchmarks.data.forEach(benchmark => fillLeaders(root.current!, benchmark));
    // The cards changed height, so the scroll story re-measures its sections.
    window.dispatchEvent(new Event('resize'));
  }, [benchmarks.data]);
  return <div ref={root} dangerouslySetInnerHTML={{ __html: markup }} />;
}
