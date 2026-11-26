import { clsx } from 'clsx';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useChangeRole, useConsoleUser, useInviteMember, useMembers, useRemoveMember } from '../../../api/consoleClient';
import { ACCOUNT_PATTERN } from '../../../api/constraints';
import { consoleRoleValues } from '../../../api/schema';
import type { Member, Role } from '../../../api/types';
import { ChangeFailure } from '../../../components/shell/ChangeFailure';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { useLocale } from '../../../i18n/localeContext';
import { dateTimeOf } from '../../../i18n/locales';
import { HintedHeading } from '../../../ui/content';
import content from '../../../ui/content.module.css';
import { Button, Select, SubmitButton, TextField } from '../../../ui/controls';
import table from '../../../ui/table.module.css';
import { DEMO_PASSWORD } from '../demoAccounts';
import { mayAdminister } from '../roles';
import styles from './MembersPage.module.css';

/** Who may sign in to the console and what each may change; administrators add members, change roles and remove them. */
export function MembersPage() {
  const { t } = useTranslation();
  const members = useMembers();
  const user = useConsoleUser();
  const administering = mayAdminister(user.role);
  return (
    <div className={styles.page}>
      <ConsoleHeader title={t('console.members.title')} about={t('console.members.about')} />
      <div className={clsx(table.table, styles.members)} role="table" aria-label={t('console.members.title')}>
        <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
          <span role="columnheader">{t('console.members.column.member')}</span>
          <span role="columnheader">{t('console.members.column.role')}</span>
          <span role="columnheader">{t('console.members.column.joined')}</span>
          <span role="columnheader">{t('console.members.column.lastSignedIn')}</span>
          <span role="columnheader"><span className="visually-hidden">{t('console.members.column.actions')}</span></span>
        </div>
        {members.map(member => <MemberRow key={member.account} member={member} self={member.account === user.account} administering={administering} />)}
      </div>
      {administering ? <InviteForm /> : <p className="t-small c-muted">{t('console.members.readOnly')}</p>}
    </div>
  );
}

/** A member with their role; an administrator changes the role in place and removes the member after asking again. */
export function MemberRow({ member, self, administering }: { member: Member; self: boolean; administering: boolean }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const changeRole = useChangeRole(member.account);
  const remove = useRemoveMember(member.account);
  const [asking, setAsking] = useState(false);
  return (
    <div className={table.row} role="row">
      <span role="cell" className={styles.who}>
        <span className="t-label">{member.name}{self && <span className="c-faint"> · {t('console.members.you')}</span>}</span>
        <span className="t-mono c-faint">{member.account}</span>
      </span>
      <span role="cell" className={styles.role}>
        {administering
          ? <Select variant={asking ? 'quiet' : 'line'} label={t('console.members.roleOf', { name: member.name })} value={member.role} onChange={role => changeRole.mutate(role)} choices={consoleRoleValues.map(role => ({ value: role, label: t(`console.roles.${role}`) }))} />
          : <span className="t-small">{t(`console.roles.${member.role}`)}</span>}
        <ChangeFailure error={changeRole.error} reasons={{ 409: t('console.members.lastAdministrator') }} />
      </span>
      <span role="cell" className="t-mono c-faint">{dateTimeOf(locale, member.joinedAt)}</span>
      <span role="cell" className="t-mono c-faint">{member.lastSignedInAt ? dateTimeOf(locale, member.lastSignedInAt) : t('console.members.never')}</span>
      <span role="cell" className={styles.actions}>
        {administering && (asking ? (
          <>
            <Button variant="line" onClick={() => remove.mutate()}>{t('console.members.confirmRemove')}</Button>
            <Button variant="quiet" onClick={() => setAsking(false)}>{t('console.members.cancel')}</Button>
          </>
        ) : <Button variant="quiet" onClick={() => setAsking(true)}>{t('console.members.remove')}</Button>)}
        <ChangeFailure error={remove.error} reasons={{ 409: t('console.members.lastAdministrator') }} />
      </span>
    </div>
  );
}

/** Adds a member by the account they will sign in with, their name and their role. */
export function InviteForm() {
  const { t } = useTranslation();
  const invite = useInviteMember();
  const [account, setAccount] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('editor');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    invite.mutate({ account, name, role }, { onSuccess: () => { setAccount(''); setName(''); } });
  };
  return (
    <form className={clsx(content.panel, styles.invite)} onSubmit={submit}>
      <HintedHeading rank="h2" className="t-heading" title={t('console.members.invite.title')} about={t('console.members.invite.note', { password: DEMO_PASSWORD })} />
      <div className={styles.fields}>
        <TextField label={t('console.members.invite.account')} type="text" autoComplete="off" value={account} onChange={setAccount} pattern={{ regex: ACCOUNT_PATTERN, hint: t('console.signIn.accountHint') }} />
        <TextField label={t('console.members.invite.name')} type="text" autoComplete="off" value={name} onChange={setName} />
        <div className={styles.field}>
          <span className="t-micro c-muted" aria-hidden="true">{t('console.members.invite.role')}</span>
          <Select label={t('console.members.invite.role')} value={role} onChange={setRole} choices={consoleRoleValues.map(value => ({ value, label: t(`console.roles.${value}`) }))} />
        </div>
      </div>
      <ChangeFailure error={invite.error} reasons={{ 409: t('console.members.invite.exists') }} />
      <div><SubmitButton variant="solid" pending={invite.isPending}>{t('console.members.invite.submit')}</SubmitButton></div>
    </form>
  );
}
