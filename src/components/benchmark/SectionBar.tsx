import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navHeight, readingLine } from '../../ui/media';
import { SectionLinks, type PageSection, type PageSections } from '../../ui/navigation';
import styles from './SectionBar.module.css';

/**
 * The document's sections under the head, with the one being read marked. Once the bar scrolls under the nav, the
 * floating nav carries the sections instead.
 */
export function SectionBar({ sections, handToNav }: { sections: PageSection[]; handToNav: (sections: PageSections | null) => void }) {
  const { t } = useTranslation();
  const bar = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState(sections[0]?.id ?? '');
  const [scrolledPast, setScrolledPast] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const reading = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (reading) {
        setCurrent(reading.target.id);
      }
    }, { rootMargin: `-${readingLine()}px 0px -60% 0px` });
    sections.forEach(section => {
      const heading = document.getElementById(section.id);
      if (!heading) {
        throw new Error(`The document has no heading #${section.id}`);
      }
      observer.observe(heading);
    });
    return () => observer.disconnect();
  }, [sections]);
  useEffect(() => {
    const barElement = bar.current;
    if (!barElement) {
      throw new Error('The section bar observes itself before it has rendered');
    }
    const top = navHeight();
    const observer = new IntersectionObserver(([entry]) => setScrolledPast(!entry.isIntersecting && entry.boundingClientRect.top < top), { rootMargin: `-${top}px 0px 0px 0px` });
    observer.observe(barElement);
    return () => observer.disconnect();
  }, []);
  useEffect(() => handToNav(scrolledPast ? { sections, current } : null), [handToNav, scrolledPast, sections, current]);
  useEffect(() => () => handToNav(null), [handToNav]);
  return (
    <nav ref={bar} className={styles.sectionBar} aria-label={t('site.pageSections')}>
      <SectionLinks sections={sections} current={current} className="page" />
    </nav>
  );
}
