"""C01: the tests the repository had before the run pass on the submitted code."""
import subprocess


def test_original_tests():
    assert subprocess.run(["python", "-m", "pytest", "-q", "/grading/original-tests"], cwd="/workspace").returncode == 0
