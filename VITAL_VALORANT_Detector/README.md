# VITAL — Website + VALORANT Windows Detector

This project keeps the VITAL interface as a normal HTML/CSS/JavaScript website. A small Python helper runs locally on Windows because browser-only websites cannot inspect Windows processes.

## Requirements
- Windows 10 or Windows 11
- Python 3.9+ installed and available as `py`
- Internet connection for the first dependency install

## Start VITAL
1. Extract the entire ZIP to a normal folder, for example `Desktop\VITAL`.
2. Double-click `start_vital.bat`.
3. Wait for the terminal to show `Website: http://127.0.0.1:8765`.
4. Open `http://127.0.0.1:8765` in Chrome or Edge.
5. Leave the black terminal window open while you play. It is the local detector.
6. Start VALORANT. VITAL should show `VALORANT detected` and start the timer.
7. Close VALORANT. VITAL should stop the automatically started session.

## How it works
- `helper.py` scans Windows process names using `psutil`.
- It serves the static website and a local `/api/status` endpoint from the same localhost origin.
- `script.js` checks the endpoint every 3 seconds.
- When `VALORANT.exe` or `VALORANT-Win64-Shipping.exe` is present, the website starts tracking.
- When both game processes close, the auto-started session is ended.
- Manually started sessions remain available if the detector is not running.

## Project structure
- `index.html` — website structure
- `style.css` — original dark red VITAL theme
- `script.js` — dashboard, reminders, logs and detector integration
- `helper.py` — local Windows process detector and static file server
- `requirements.txt` — Python dependency (`psutil`)
- `start_vital.bat` — one-click Windows launcher

## Troubleshooting
- **Detector offline:** Start `start_vital.bat` and use the exact local address `http://127.0.0.1:8765` (not a previously deployed Netlify/GitHub Pages URL).
- **VALORANT not detected:** Make sure the game itself is fully running, not just Riot Client or the launcher. Check that the game process is named `VALORANT.exe` or `VALORANT-Win64-Shipping.exe` in Windows Task Manager > Details.
- **Port already in use:** Close the other process using port 8765, then restart the BAT file.
- **Python command not found:** Install Python for Windows and enable “Add Python to PATH”, then reopen the BAT file.
- **Reminders:** Browser notifications require permission. The website tab must remain open; reminders can be delayed if the browser sleeps or is closed.

## Security and privacy
The helper binds only to `127.0.0.1`, so it is reachable from this computer, not your local network. It does not upload process names, game activity, or logs to a cloud server. VITAL's dashboard data remains in browser local storage.

## Important
The public/static hosted website cannot independently detect local games. For automatic detection, open the local site served by the helper at `http://127.0.0.1:8765`. This keeps the front end as a normal website while using a small Windows companion for the operating-system integration.
