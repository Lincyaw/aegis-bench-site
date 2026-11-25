import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useTaskGrading, useTaskReference } from '../api/consoleClient';
import type { ConsoleTaskDetail } from '../api/types';
import { FactList, Tag } from '../ui/content';
import content from '../ui/content.module.css';
import { formatSize } from './taskFiles';
import styles from './TaskDetailPage.module.css';

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
          <h2 className="t-heading">{t('console.task.content.instruction')}</h2>
          <p className="t-micro c-faint">{t('console.task.content.instructionNote')}</p>
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
          <FactList layout="stacked" facts={task.environment.map(fact => ({ label: fact.label, value: fact.value, format: fact.format }))} />
        </section>
        <section className={clsx(content.panel, styles.panel)}>
          <h2 className="t-heading">{t('console.task.content.acceptance')}</h2>
          <p className="t-micro c-faint">{t('console.task.content.acceptanceNote')}</p>
          <ul className={styles.points}>
            {task.acceptance.map(point => <li key={point.checkId}><span className="t-small">{point.requirement}</span><span className="t-mono c-faint">{point.checkId}</span></li>)}
          </ul>
        </section>
      </aside>
    </div>
  );
}

export function TaskGradingTab({ task }: { task: ConsoleTaskDetail }) {
  const { t } = useTranslation();
  const grading = useTaskGrading(task.benchmark.id, task.id);
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
          <FactList layout="stacked" facts={grading.verifier.map(fact => ({ label: fact.label, value: fact.value, format: fact.format }))} />
        </section>
      </aside>
    </div>
  );
}

export function TaskReferenceTab({ task }: { task: ConsoleTaskDetail }) {
  const { t } = useTranslation();
  const files = useTaskReference(task.benchmark.id, task.id);
  return (
    <div className={styles.section}>
      <p className="t-small c-muted">{t('console.task.reference.note')}</p>
      {files.map(({ reason, file }) => (
        <section key={file.path} className={clsx(content.panel, styles.panel)}>
          <header className={styles.fileHead}>
            <Tag>{t(`console.task.reference.reason.${reason}`)}</Tag>
            <span className="t-mono">{file.path}</span>
            <span className="t-micro c-faint">{formatSize(file.size)}</span>
          </header>
          {file.text !== undefined && <pre className={styles.code}>{file.text}</pre>}
        </section>
      ))}
    </div>
  );
}
