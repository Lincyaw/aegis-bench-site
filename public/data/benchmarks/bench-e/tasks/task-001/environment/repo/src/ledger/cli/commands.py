"""What each command of the ledger does with the entries it reads."""
from ledger.io.reader import read_entries
from ledger.report.summary import summarize
from ledger.report.table import render_table


def cmd_report(args):
    entries = read_entries(args.file, since=args.since)
    return render_table(summarize(entries))


def cmd_balance(args):
    summary = summarize(read_entries(args.file))
    return render_table({args.account: summary.get(args.account, 0)})
