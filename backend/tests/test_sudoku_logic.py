import pytest
from backend.sudoku_logic import SudokuLogic

def test_sudoku_logic_init():
    with pytest.raises(ValueError):
        SudokuLogic(5)  # Invalid size

    s4 = SudokuLogic(4)
    assert s4.size == 4
    assert s4.box_h == 2
    assert s4.box_w == 2

    s6 = SudokuLogic(6)
    assert s6.size == 6
    assert s6.box_h == 2
    assert s6.box_w == 3

    s9 = SudokuLogic(9)
    assert s9.size == 9
    assert s9.box_h == 3
    assert s9.box_w == 3

def test_solve_and_generate_4x4():
    sl = SudokuLogic(4)
    puzzle, solution = sl.generate_puzzle("easy")

    # Verify solution is valid
    for r in range(4):
        for c in range(4):
            val = solution[r][c]
            assert val != 0
            assert sl.is_valid(solution, r, c, val)

    # Verify puzzle is a subset of solution
    for r in range(4):
        for c in range(4):
            if puzzle[r][c] != 0:
                assert puzzle[r][c] == solution[r][c]

    # Verify puzzle has a unique solution
    assert sl.count_solutions(puzzle) == 1

def test_solve_and_generate_6x6():
    sl = SudokuLogic(6)
    puzzle, solution = sl.generate_puzzle("easy")
    assert sl.count_solutions(puzzle) == 1

def test_solve_and_generate_9x9():
    sl = SudokuLogic(9)
    puzzle, solution = sl.generate_puzzle("medium")
    assert sl.count_solutions(puzzle) == 1
