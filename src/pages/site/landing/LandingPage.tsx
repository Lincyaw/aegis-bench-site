import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useBenchmarks, useSiteInfo, useStages, type Stage } from '../../../api/client';
import { LandingMotion } from '../../../components/landing/landingMotion';
import { Closing, Hero, LifecycleIntro, StagePanel, Updates } from '../../../components/landing/LandingSections';
import { LoopBackdrop, StageChooser, StageRail, type StageChoice } from '../../../components/landing/LandingStage';
import { benchmarksAt } from '../../../components/lifecycle/stages';
import { useLocalizedNavigate } from '../../../i18n/localeContext';
import { benchmarkPath } from '../../../routes/site';
import { SiteNav } from '../SiteLayout';
import { FOOTER_LINKS } from '../siteNav';
import styles from './LandingPage.module.css';

/**
 * The landing page: the lifecycle as an infinity loop that starts as smoke behind the title, condenses into a line,
 * visits each stage with a small scene of what it is, and settles into the mark at the end.
 */
export function LandingPage() {
  const stages = useStages();
  const benchmarks = useBenchmarks();
  const { contactEmail } = useSiteInfo();
  const navigate = useLocalizedNavigate();
  const root = useRef<HTMLDivElement>(null);
  const motion = useRef<LandingMotion | null>(null);
  const [currentStage, setCurrentStage] = useState<number | null>(null);
  const [choice, setChoice] = useState<StageChoice | null>(null);
  const closeChoice = useCallback(() => setChoice(null), []);
  useLayoutEffect(() => {
    if (!root.current) {
      throw new Error('The landing page is not rendered');
    }
    const mounted = new LandingMotion(root.current, stages, setCurrentStage);
    motion.current = mounted;
    return () => {
      mounted.unmount();
      motion.current = null;
    };
  }, [stages]);
  const openStage = (stage: Stage, anchor: HTMLElement) => {
    if (stage.benchmarks.length === 1) {
      navigate(benchmarkPath(stage.benchmarks[0].id));
    } else {
      setChoice({ stage, anchor });
    }
  };
  const scrollToStage = (index: number) => {
    if (!motion.current) {
      throw new Error('The landing motion is not mounted');
    }
    motion.current.scrollToStage(index);
  };
  return (
    <div ref={root}>
      <LoopBackdrop stages={stages} onOpenStage={openStage} />
      <SiteNav sections={null} />
      <StageRail stages={stages} current={currentStage} onSelect={scrollToStage} />
      <main className={styles.main}>
        <Hero benchmarks={benchmarks} />
        <LifecycleIntro />
        {stages.map((stage, index) => <StagePanel key={stage.id} stage={stage} index={index} benchmarks={benchmarksAt(stage, benchmarks)} />)}
        <Updates />
        <Closing contactEmail={contactEmail} footerLinks={FOOTER_LINKS} />
      </main>
      <StageChooser choice={choice} onClose={closeChoice} />
    </div>
  );
}
