"""C04: every test the repository had before the run is unchanged."""
import ast


def tests_of(text):
    return {node.name: ast.dump(node) for node in ast.parse(text).body if isinstance(node, ast.FunctionDef) and node.name.startswith("test_")}


def check_c04(workspace, reference):
    return all(tests_of((workspace / path).read_text()).get(name) == body for path, text in reference.original_tests.items() for name, body in tests_of(text).items())
