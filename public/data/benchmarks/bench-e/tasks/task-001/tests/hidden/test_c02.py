"""C02: --format json prints each account's total and the total as two-decimal strings."""
import json

from ledger.cli.main import main


def test_json_report(tmp_path, capsys):
    book = tmp_path / "book.ledger"
    book.write_text("2026-11-02 food -12.50\n2026-11-03 salary 3000\n")
    main([str(book), "report", "--format", "json"])
    assert json.loads(capsys.readouterr().out) == {"accounts": {"food": "-12.50", "salary": "3000.00"}, "total": "2987.50"}
