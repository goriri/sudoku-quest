import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get correct solution from SQLite DB using python
function getCorrectSolution(username) {
  // Database file is created in the directory where uvicorn is launched (frontend/)
  const dbPath = path.resolve(__dirname, '../sudoku.db');
  
  const pythonCmd = `python3 -c "
import sqlite3, json
conn = sqlite3.connect('${dbPath}')
cursor = conn.cursor()
cursor.execute('''
    SELECT active_games.solution 
    FROM active_games 
    JOIN users ON users.id = active_games.user_id 
    WHERE users.username = '${username}'
''')
row = cursor.fetchone()
if row:
    print(row[0])
else:
    print('NONE')
conn.close()
"`;
  
  try {
    const output = execSync(pythonCmd).toString().trim();
    if (output === 'NONE') return null;
    return JSON.parse(output);
  } catch (err) {
    console.error("Failed to query SQLite via python:", err);
    return null;
  }
}

test.describe('Sudoku Quest Adventure E2E', () => {
  const username = `hero_${Date.now()}`; // Unique username for each test run
  const password = 'magicpassword123';

  test('full game flow: register -> shop -> play level 1 -> win -> level progress', async ({ page }) => {
    // 1. Visit App
    await page.goto('/');
    await expect(page).toHaveTitle(/SUDOKU QUEST/i);

    // 2. Register User
    await page.click('text=Create a character');
    await page.fill('[placeholder="Enter character name..."]', username);
    await page.fill('[placeholder="Enter secret password..."]', password);
    await page.click('text=Knight Kevin'); // Select Knight Kevin avatar
    await page.click('button:has-text("Start Adventure!")');

    // 3. Verify Map Page loaded
    await expect(page.locator('text=Your Magic Adventure')).toBeVisible();
    await expect(page.locator('text=' + username)).toBeVisible();
    
    // Check initial level banner
    await expect(page.locator('text=Level 1')).toBeVisible();
    await expect(page.locator('text=100')).toBeVisible(); // 100 starting coins

    // 4. Open Shop
    await page.click('text=Magic Shop');
    await expect(page.locator('h2:has-text("Magic Shop")')).toBeVisible();
    await expect(page.locator('text=100 Coins')).toBeVisible();

    // Buy Magic Wand (30 coins)
    await page.click('div:has-text("Magic Wand") >> button:has-text("Buy")', { force: true });
    await expect(page.locator('text=70 Coins')).toBeVisible(); // 100 - 30 = 70 coins remaining

    // Close Shop
    await page.click('button[aria-label="Close"]', { force: true });
    await expect(page.locator('h2:has-text("Magic Shop")')).not.toBeVisible();

    // 5. Start Game (Level 1)
    await page.click('button:has-text("Play")', { force: true });
    await page.click('div.fixed button:has-text("easy")', { force: true });
    await expect(page.locator('text=QUEST LEVEL 1')).toBeVisible();
    await expect(page.locator('text=Wand (1)')).toBeVisible(); // 1 wand in inventory

    // 6. Fetch correct solution from DB
    const solution = getCorrectSolution(username);
    expect(solution).not.toBeNull();
    expect(solution.length).toBe(4); // Zone 1 is 4x4

    // 7. Solve Sudoku Board
    // Iterate over the grid rows and columns in the DOM
    // The grid is a 4x4 grid of buttons
    const cells = page.locator('div.grid-cols-4 button');
    
    // Read the puzzle state from DOM to find empty cells and fill them
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cellIndex = r * 4 + c;
        const cell = cells.nth(cellIndex);
        const cellText = await cell.innerText();
        
        // If the cell is empty (has no emoji/number), we fill it
        if (cellText === '') {
          const correctVal = solution[r][c];
          
          // Click cell to select
          await cell.click();
          
          // Click correct value on the keypad below
          // By default, the board starts in "Magic Emojis" mode.
          // Let's toggle to "Numbers" mode to make it easier for E2E automation
          if (r === 0 && c === 0 || (await page.locator('button:has-text("Numbers")').getAttribute('class')).includes('text-indigo-500')) {
            await page.click('button:has-text("Numbers")');
          }
          
          // Click the number button on the keyboard
          await page.click(`div.flex-wrap button:has-text("${correctVal}")`);
        }
      }
    }

    // 8. Submit Sudoku board
    await page.click('button:has-text("Submit Magic Grid")');

    // 9. Assert win banner appears
    await expect(page.locator('text=Quest Completed!')).toBeVisible();
    await expect(page.locator('text=Coins Earned:')).toBeVisible();

    // 10. Click continue and assert progress
    await page.click('button:has-text("Continue Journey")', { force: true });
    await expect(page.locator('text=Your Magic Adventure')).toBeVisible();
    
    // Level progress assertion: they should be level 2 now!
    await expect(page.locator('text=Level 2')).toBeVisible();
  });

  test('developer panel bypass: set level and coins', async ({ page }) => {
    const devUsername = `dev_hero_${Date.now()}`;
    await page.goto('/');

    // Register User
    await page.click('text=Create a character');
    await page.fill('[placeholder="Enter character name..."]', devUsername);
    await page.fill('[placeholder="Enter secret password..."]', password);
    await page.click('text=Elf Elwin');
    await page.click('button:has-text("Start Adventure!")');

    await expect(page.locator('text=Your Magic Adventure')).toBeVisible();
    await expect(page.locator('text=Level 1')).toBeVisible();
    await expect(page.locator('text=100')).toBeVisible();

    // Click Dev Tools wrench button
    await page.click('button[title="🔧 Developer Cheats"]', { force: true });
    await expect(page.locator('h3:has-text("Developer Portal")')).toBeVisible();

    // Fill level 12 and 600 coins
    await page.fill('input[type="number"] >> nth=0', '12');
    await page.fill('input[type="number"] >> nth=1', '600');

    // Click apply cheats button
    await page.click('button:has-text("Cast Magic Cheat Spell!")', { force: true });

    // Verify stats updated on Map page
    await expect(page.locator('text=Level 12')).toBeVisible();
    await expect(page.locator('text=600')).toBeVisible();
  });
});

