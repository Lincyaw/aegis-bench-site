"""C03: without --format, and with --format table, the report is the table it was."""
from ledger.cli.main import main

TABLE = 'food        -12.50\nsalary     3000.00\ntotal      2987.50\n'


def test_table(tmp_path, capsys):
    book = tmp_path / "book.ledger"
    book.write_text("2026-11-02 food -12.50\n2026-11-03 salary 3000\n")
    main([str(book), "report"])
    main([str(book), "report", "--format", "table"])
    assert capsys.readouterr().out == TABLE * 2
