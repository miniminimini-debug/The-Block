@echo off
cd /d "%~dp0"
git add .
git commit -m "update"
git push
echo.
echo Done — Vercel is building your update.
pause
