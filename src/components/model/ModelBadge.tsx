import { clsx } from 'clsx';
import type { Combination, CombinationScope, HarnessRef, ModelRef } from '../../api/types';
import { LocaleLink } from '../../i18n/LocaleRouting';
import { modelPath } from '../../routes/site';
import { ScopeChip } from '../../ui/controls';
import { combinationName } from '../result/presentation';
import styles from './ModelBadge.module.css';

/** The vendor's slot letter on the slot's colour. */
export function VendorBadge({ model }: { model: ModelRef }) {
  return <span className={styles.vendor} data-slot={model.slot} title={model.vendor}>{model.slot}</span>;
}

/** A model's badge and name. */
export function ModelLabel({ model }: { model: ModelRef }) {
  return <span className={clsx(styles.model, 't-label')}><VendorBadge model={model} /><span>{model.name}</span></span>;
}

/** A combination in a list of them: the model's badge and name, then its harness, fainter. */
export function CombinationLabel({ model, harness }: { model: ModelRef; harness: HarnessRef }) {
  return <span className={styles.combination}><VendorBadge model={model} /><span className="t-small">{model.name}</span><span className="t-micro c-faint">{harness.name}</span></span>;
}

/**
 * The combinations a page keeps to, a model or a model in a harness, named as the benchmark's entrants name them; `to`
 * is the page without them.
 */
export function CombinationScopeChip({ entrants, scope, to }: { entrants: Combination[]; scope: CombinationScope; to: string }) {
  const model = entrants.find(entrant => entrant.model.id === scope.model)?.model;
  const harness = entrants.find(entrant => entrant.harness.id === scope.harness)?.harness;
  if (!model || (scope.harness !== undefined && !harness)) {
    throw new Error(`no entrant runs ${scope.model} ${scope.harness ?? ''}`);
  }
  return <ScopeChip name={harness ? combinationName(model, harness) : model.name} to={to} />;
}

/** A model's badge and name, linking to the model's page. */
export function ModelLink({ model }: { model: ModelRef }) {
  return <LocaleLink className={clsx(styles.model, 't-label')} to={modelPath(model.id)}><VendorBadge model={model} /><span>{model.name}</span></LocaleLink>;
}
