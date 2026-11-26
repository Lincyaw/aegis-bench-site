import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, useSignIn } from '../../api/consoleClient';
import { ACCOUNT_PATTERN } from '../../api/constraints';
import { ApiError } from '../../api/errors';
import { BrandMark } from '../../components/shell/BrandMark';
import { useLocalizedNavigate } from '../../i18n/localeContext';
import { nextPathOf } from '../../routes/console';
import { SubmitButton, TextField } from '../../ui/controls';
import styles from './SignInPage.module.css';

/** The console's door: an account and its password, then back to the page the reader was opening. */
export function SignInPage() {
  const { t } = useTranslation();
  const [search] = useSearchParams();
  const next = nextPathOf(search);
  const navigate = useLocalizedNavigate();
  const signIn = useSignIn();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  // A wrong password is the one failure the form answers itself; any other is the page's error.
  if (signIn.error && !(signIn.error instanceof ApiError && signIn.error.status === 401)) {
    throw signIn.error;
  }
  const submit = (event: FormEvent) => {
    event.preventDefault();
    signIn.mutate({ account, password }, { onSuccess: () => navigate(next) });
  };
  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={submit}>
        <span className={styles.brand}><BrandMark /><span className="t-small c-muted">{t('console.name')}</span></span>
        <header className={styles.head}>
          <h1 className="t-title">{t('console.signIn.title')}</h1>
          <p className="t-small c-muted">{t('console.signIn.lead')}</p>
        </header>
        <TextField
          label={t('console.signIn.account')} type="text" autoComplete="username" value={account} onChange={setAccount}
          pattern={{ regex: ACCOUNT_PATTERN, hint: t('console.signIn.accountHint') }}
        />
        <TextField label={t('console.signIn.password')} type="password" autoComplete="current-password" value={password} onChange={setPassword} />
        {signIn.error && <p className="t-small c-bad" role="alert">{t('console.signIn.failed')}</p>}
        <SubmitButton variant="solid" pending={signIn.isPending}>{t('console.signIn.submit')}</SubmitButton>
        <p className="t-micro c-faint">
          {t('console.signIn.demo', { password: DEMO_PASSWORD, accounts: DEMO_ACCOUNTS.map(({ account, role }) => t('console.signIn.demoAccount', { account, role: t(`console.roles.${role}`) })) })}
        </p>
      </form>
    </main>
  );
}
