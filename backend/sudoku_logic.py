import random
from typing import List, Tuple, Optional

class SudokuLogic:
    def __init__(self, size: int = 9):
        self.size = size
        if size == 4:
            self.box_h = 2
            self.box_w = 2
        elif size == 6:
            self.box_h = 2
            self.box_w = 3
        elif size == 9:
            self.box_h = 3
            self.box_w = 3
        else:
            raise ValueError("Supported sizes are 4, 6, and 9")

    def solve(self, grid: List[List[int]]) -> bool:
        """Solves the Sudoku grid in-place using backtracking."""
        empty = self.find_empty(grid)
        if not empty:
            return True
        row, col = empty

        # Shuffle values to get random solutions if solving empty grids
        vals = list(range(1, self.size + 1))
        random.shuffle(vals)

        for val in vals:
            if self.is_valid(grid, row, col, val):
                grid[row][col] = val
                if self.solve(grid):
                    return True
                grid[row][col] = 0

        return False

    def count_solutions(self, grid: List[List[int]], limit: int = 2) -> int:
        """Counts the number of solutions for a grid, up to the limit."""
        empty = self.find_empty(grid)
        if not empty:
            return 1
        row, col = empty
        count = 0

        for val in range(1, self.size + 1):
            if self.is_valid(grid, row, col, val):
                grid[row][col] = val
                count += self.count_solutions(grid, limit)
                grid[row][col] = 0
                if count >= limit:
                    break
        return count

    def find_empty(self, grid: List[List[int]]) -> Optional[Tuple[int, int]]:
        for r in range(self.size):
            for c in range(self.size):
                if grid[r][c] == 0:
                    return r, c
        return None

    def is_valid(self, grid: List[List[int]], r: int, c: int, val: int) -> bool:
        # Check row
        for col in range(self.size):
            if grid[r][col] == val and col != c:
                return False
        # Check col
        for row in range(self.size):
            if grid[row][c] == val and row != r:
                return False
        # Check box
        box_r = (r // self.box_h) * self.box_h
        box_c = (c // self.box_w) * self.box_w
        for row in range(box_r, box_r + self.box_h):
            for col in range(box_c, box_c + self.box_w):
                if grid[row][col] == val and (row != r or col != c):
                    return False
        return True

    def generate_full_grid(self) -> List[List[int]]:
        grid = [[0 for _ in range(self.size)] for _ in range(self.size)]
        self.solve(grid)
        return grid

    def remove_digits(self, grid: List[List[int]], difficulty: str) -> List[List[int]]:
        """Removes digits from a full grid to create a puzzle based on difficulty.

        Ensures there is exactly one unique solution.
        """
        puzzle = [row[:] for row in grid]
        cells = [(r, c) for r in range(self.size) for c in range(self.size)]
        random.shuffle(cells)

        # Target clues remaining based on size and difficulty
        if self.size == 4:
            # 4x4: Easy needs ~6-8 clues, Hard ~4-5
            target_clues = 8 if difficulty == "easy" else 5
        elif self.size == 6:
            # 6x6: Easy ~18-20, Hard ~12-14
            target_clues = 18 if difficulty == "easy" else 13
        else: # 9x9
            # 9x9: Easy ~40-45, Medium ~30-35, Hard ~22-26
            if difficulty == "easy":
                target_clues = 40
            elif difficulty == "medium":
                target_clues = 30
            else:
                target_clues = 24

        removed = 0
        max_cells_to_remove = (self.size * self.size) - target_clues

        for r, c in cells:
            if removed >= max_cells_to_remove:
                break

            temp = puzzle[r][c]
            puzzle[r][c] = 0

            # Verify unique solution
            grid_copy = [row[:] for row in puzzle]
            if self.count_solutions(grid_copy) != 1:
                # Putting it back if it doesn't yield a unique solution
                puzzle[r][c] = temp
            else:
                removed += 1

        return puzzle

    def generate_puzzle(self, difficulty: str) -> Tuple[List[List[int]], List[List[int]]]:
        """Generates a puzzle and its solution.

        Returns: (puzzle, solution)
        """
        solution = self.generate_full_grid()
        puzzle = self.remove_digits(solution, difficulty)
        return puzzle, solution
