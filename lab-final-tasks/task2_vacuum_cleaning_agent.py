# =========================================================
# Final Lab Task 2 - Simple Rule-Based Vacuum Cleaning Agent
# 2-D grid world:  'D' = Dirty cell,  '.' = Clean cell,  'A' = Agent
# =========================================================

ROWS = 4
COLS = 4

# The environment: each cell is either Dirty ('D') or Clean ('.')
environment = [
    ['D', '.', 'D', '.'],
    ['D', '.', 'D', '.'],
    ['D', '.', '.', '.'],
    ['D', 'D', 'D', 'D']
]


def display(grid, agent_row, agent_col):
    """Print the current world. The agent's own cell is shown as 'A'."""
    for r in range(ROWS):
        for c in range(COLS):
            if r == agent_row and c == agent_col:
                print('A', end=' ')
            else:
                print(grid[r][c], end=' ')
        print()
    print('-' * 20)


def perceive(grid, row, col):
    """PERCEPTION: is the agent's current location dirty?"""
    return grid[row][col] == 'D'


def clean(grid, row, col):
    """ACTION: suck the dirt in the current cell."""
    grid[row][col] = '.'


def next_position(row, col):
    """
    ACTION: decide the next move.
      - move RIGHT while cells remain in the current row
      - otherwise move DOWN to the start of the next row
      - return None when the whole grid has been scanned
    """
    if col < COLS - 1:
        return row, col + 1
    elif row < ROWS - 1:
        return row + 1, 0
    return None


def vacuum_agent(grid):
    """Simple rule-based agent: perceive -> decide -> act, over the whole grid."""
    row, col = 0, 0
    cleaned = 0

    print("Initial Environment:")
    display(grid, row, col)

    while True:
        # RULE 1: if the current cell is dirty, then clean it
        if perceive(grid, row, col):
            clean(grid, row, col)
            cleaned += 1
            print("Cleaned cell at (%d, %d)" % (row, col))
            display(grid, row, col)

        # RULE 2: otherwise move to the next cell of the environment
        step = next_position(row, col)
        if step is None:
            break
        row, col = step
        display(grid, row, col)

    display(grid, row, col)
    print("Cleaning complete. Total cells cleaned:", cleaned)


# ---------------------- MAIN ----------------------
if __name__ == "__main__":
    vacuum_agent(environment)
