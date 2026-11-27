import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { ConsoleTaskDetail, ReferenceFile, TaskGrading } from '../../api/types';
import { FactList, HintedHeading, Tag } from '../../ui/content';
import content from '../../ui/content.module.css';
import { InfoHint } from '../../ui/hint';
import { ArrowIcon } from '../../ui/icons';
import { formatSize } from './files';
import styles from './TaskContent.module.css';

/*
 * What a task is: the text and environment the agent gets, how its grading decides, and the answers the public site
 * withholds.
 */

export function TaskContentTab({ task }: { task: ConsoleTaskDetail }) {
  const { t } = useTranslation();
  return (
    <div className={styles.columns}>
      <div className={styles.main}>
        <section className={clsx(content.panel, styles.panel)}>
          <HintedHeading rank="h2" className="t-heading" title={t('console.task.content.instruction')} about={t('console.task.content.instructionNote')} />
          <p className={clsx(styles.prose, 't-body')}>{task.instruction}</p>
          {task.reportSchema && (
            <>
              <h3 className="t-label">{t('console.task.content.reportSchema')}</h3>
              <pre className={styles.code}>{task.reportSchema}</pre>
            </>
          )}
        </section>
        <section className={clsx(content.panel, styles.panel)}>
          <h2 className="t-heading">{t('console.task.content.tools')}</h2>
          <div className={styles.chips}>{task.tools.map(tool => <span key={tool} className={clsx(styles.chip, 't-mono')}>{tool}</span>)}</div>
        </section>
      </div>
      <aside className={styles.aside}>
        <section className={clsx(content.panel, styles.panel)}>
          <h2 className="t-heading">{t('console.task.content.environment')}</h2>
          <FactList layout="stacked" facts={task.environment} />
        </section>
        <section className={clsx(content.panel, styles.panel)}>
          <HintedHeading rank="h2" className="t-heading" title={t('console.task.content.acceptance')} about={t('console.task.content.acceptanceNote')} />
          <ul className={styles.points}>
            {task.acceptance.map(point => <li key={point.checkId}><span className="t-small">{point.requirement}</span><span className="t-mono c-faint">{point.checkId}</span></li>)}
          </ul>
        </section>
      </aside>
    </div>
  );
}

export function TaskGradingDetail({ grading }: { grading: TaskGrading }) {
  const { t } = useTranslation();
  return (
    <div className={styles.columns}>
      <div className={styles.main}>
        <section className={clsx(content.panel, styles.panel)}>
          <h2 className="t-heading">{t('console.task.grading.rule')}</h2>
          <p className="t-body">{grading.passRule}</p>
        </section>
        <section className={styles.section}>
          <h2 className="t-heading">{t('console.task.grading.checks')}</h2>
          <ul className={styles.checks}>
            {grading.checks.map(check => (
              <li key={check.id}>
                <details className={styles.check}>
                  <summary>
                    <span className="t-mono c-faint">{check.id}</span>
                    <span className="t-small">{check.title}</span>
                    <span className={styles.checkMeta}>
                      {check.samples !== undefined && <span className="t-micro c-faint">{t('console.task.grading.samples', { count: check.samples })}</span>}
                      <Tag>{t(`runs.method.${check.method}`)}</Tag>
                    </span>
                  </summary>
                  <span className="t-mono c-muted">{check.code.path}</span>
                  <pre className={styles.code}>{check.code.source}</pre>
                </details>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <aside className={styles.aside}>
        <section className={clsx(content.panel, styles.panel)}>
          <h2 className="t-heading">{t('console.task.grading.verifier')}</h2>
          <FactList layout="stacked" facts={grading.verifier} />
        </section>
      </aside>
    </div>
  );
}

export function TaskReferenceFiles({ files }: { files: ReferenceFile[] }) {
  const { t } = useTranslation();
  return (
    <ul className={styles.references}>
      {files.map(({ reason, file }) => (
        <li key={file.path}>
          {/* A file is listed by name and size and opens in place to its text. */}
          <details className={styles.reference}>
            <summary className={styles.fileHead}>
              <span className={styles.chevron}><ArrowIcon direction="right" /></span>
              <span className="t-mono">{file.path}</span>
              <span className="t-micro c-faint">{formatSize(file.size)}</span>
              <span className={styles.reason}>
                <Tag>{t(`console.task.reference.reason.${reason}`)}</Tag>
                <InfoHint label={t('ui.about', { subject: t(`console.task.reference.reason.${reason}`) })}>{t(`console.task.reference.note.${reason}`)}</InfoHint>
              </span>
            </summary>
            {file.text === undefined ? <p className="t-micro c-faint">{t('tasks.binary')}</p> : <pre className={styles.code}>{file.text}</pre>}
          </details>
        </li>
      ))}
    </ul>
  );
}
