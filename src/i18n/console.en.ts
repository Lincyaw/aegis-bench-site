import type { ConsoleMessages } from './console.zh';

export const consoleEn: ConsoleMessages = {
  name: 'Console',
  home: 'Console home',
  mainNav: 'Console navigation',
  openMenu: 'Open the console navigation',
  publicSite: 'Public site',
  context: 'Benchmark',
  nav: {
    overview: 'Overview',
  },
  account: {
    menu: 'Account {{account}}',
    signedInAs: 'Signed in as',
    signOut: 'Sign out',
  },
  signIn: {
    title: 'Sign in to the console',
    lead: 'The console holds every record behind each benchmark and is for staff only.',
    account: 'Account',
    accountHint: 'Letters, digits, dots, underscores or hyphens, such as lin.fang',
    password: 'Password',
    submit: 'Sign in',
    failed: 'The account and password do not match.',
    demo: 'Demo environment: any account signs in with the password {{password}}.',
  },
  error: {
    title: 'This page cannot be shown',
    notFound: 'No page exists at this address.',
    toConsole: 'Back to the console',
  },
  overview: {
    title: 'Overview',
    stats: {
      tasks: 'Tasks',
      counted: 'Counted runs',
      countedNote_one: '{{count, number}} execution failure not counted',
      countedNote_other: '{{count, number}} execution failures not counted',
      passRate: 'Mean pass rate',
      passRateNote: 'Share of counted runs that passed',
      unreviewed: 'To review',
      unreviewedNote: 'Failed runs not yet reviewed',
    },
    entrants: 'Results by combination',
    entrantsNote: 'Execution failures count toward neither the pass rate nor the means.',
    column: {
      entrant: 'Model · harness',
      passRate: 'Pass rate',
      everyTime: 'Passed every time',
      once: 'Passed at least once',
      cost: 'Mean cost',
      steps: 'Mean steps',
    },
    tasksOf: '{{solved, number}} of {{total, number}}',
    recentFailures: 'Recent failures',
    pending: 'Waiting',
    pendingKind: {
      unreviewedFailures: {
        title_one: '{{count, number}} failed run awaits review',
        title_other: '{{count, number}} failed runs await review',
        body: 'A review classes why a run failed; failure statistics count reviewed runs only.',
      },
      executionFailures: {
        title_one: '{{count, number}} run not counted after its environment failed',
        title_other: '{{count, number}} runs not counted after their environment failed',
        body: 'They count once they are run again.',
      },
      gradingErrors: {
        title_one: '{{count, number}} failure reviewed as a grading error',
        title_other: '{{count, number}} failures reviewed as grading errors',
        body: 'The grading needs revising and these runs regrading.',
      },
    },
  },
  failureClass: {
    modelError: 'Model error',
    gradingError: 'Grading error',
    constructionProblem: 'Task defect',
    unreviewed: 'Unreviewed',
  },
};
