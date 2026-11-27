"""The ledger command: parses its options and runs the command they name."""
import argparse
import sys

from ledger.cli.commands import cmd_balance, cmd_report


def build_parser():
    parser = argparse.ArgumentParser(prog="ledger")
    parser.add_argument("file", help="a ledger file, one entry per line")
    commands = parser.add_subparsers(dest="command", required=True)
    report = commands.add_parser("report", help="sum the entries by account")
    report.add_argument("--since", help="only entries on or after this date")
    report.set_defaults(run=cmd_report)
    balance = commands.add_parser("balance", help="print one account's balance")
    balance.add_argument("account")
    balance.set_defaults(run=cmd_balance)
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    print(args.run(args))
    return 0


if __name__ == "__main__":
    sys.exit(main())
