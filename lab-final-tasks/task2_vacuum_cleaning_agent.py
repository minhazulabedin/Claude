# Final Lab Task 2
# Simple Rule-Based Vacuum Cleaning Agent

rows = 4
cols = 4

# 'D' = dirty cell , '.' = clean cell
grid = [
    ['D', '.', 'D', '.'],
    ['D', '.', 'D', '.'],
    ['D', '.', '.', '.'],
    ['D', 'D', 'D', 'D']
]


def show_grid(r, c):
    for i in range(rows):
        for j in range(cols):
            if i == r and j == c:
                print('A', end=' ')          # A = agent position
            else:
                print(grid[i][j], end=' ')
        print()
    print('--------------------')


row = 0
col = 0
count = 0

print("Initial Environment:")
show_grid(row, col)

while True:

    # rule 1 : if the current cell is dirty then clean it
    if grid[row][col] == 'D':
        grid[row][col] = '.'
        count = count + 1
        print(f"Cleaned cell at ({row}, {col})")
        show_grid(row, col)

    # rule 2 : otherwise move to the next cell
    if col < cols - 1:
        col = col + 1                        # move right
    elif row < rows - 1:
        row = row + 1                        # move down
        col = 0
    else:
        break                                # whole grid is scanned

    show_grid(row, col)

show_grid(row, col)
print("Cleaning complete. Total cells cleaned:", count)
