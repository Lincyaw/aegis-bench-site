import { clsx } from 'clsx';
import type { CSSProperties } from 'react';
import type { ModelRef } from '../api/client';
import { LocaleLink } from '../i18n/LocaleRouting';
import { modelPath } from '../site/siteMap';
import { VENDOR_SLOT_COLORS } from './presentation';
import styles from './ModelBadge.module.css';

/** The vendor's slot letter on the slot's colour. */
export function VendorBadge({ model, size = 20 }: { model: ModelRef; size?: number }) {
  return <span className={styles.vendor} style={{ '--slot-color': `var(${VENDOR_SLOT_COLORS[model.slot]})`, '--badge-size': `${size}px` } as CSSProperties} title={model.vendor}>{model.slot}</span>;
}

/** A model's badge and name. */
export function ModelLabel({ model }: { model: ModelRef }) {
  return <span className={clsx(styles.model, 't-label')}><VendorBadge model={model} /><span>{model.name}</span></span>;
}

/** A model's badge and name, linking to the model's page. */
export function ModelLink({ model }: { model: ModelRef }) {
  return <LocaleLink className={clsx(styles.model, 't-label')} to={modelPath(model.id)}><VendorBadge model={model} /><span>{model.name}</span></LocaleLink>;
}
