# Flappy Bird

A simple Flappy Bird clone with two ways to play:

- **Browser version** — share a link and anyone can play in their browser (Canvas + vanilla JS).
- **Desktop version** — run the original Pygame implementation locally.

## Browser version (shareable link)

1. Install dependencies (Flask serves the static files):

   ```bash
   cd web
   python -m pip install -r requirements.txt
   ```

2. Start the server:

   ```bash
   python app.py
   ```

3. Open http://localhost:8000 in your browser. Share that URL (or the public URL from your host) with anyone and they can play instantly.

## Desktop (Pygame) version

```bash
python -m pip install pygame
python flappyGame
```
