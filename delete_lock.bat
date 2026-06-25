@echo off
echo Killing git processes...
taskkill /f /im git.exe 2>NUL
taskkill /f /im git-remote-https.exe 2>NUL
ping -n 2 127.0.0.1 > NUL
echo.
echo Deleting lock files...
if exist "C:\Users\aarya\relay-arc\.git\index.lock" del /f /q "C:\Users\aarya\relay-arc\.git\index.lock"
if exist "C:\Users\aarya\relay-arc\.git\HEAD.lock" del /f /q "C:\Users\aarya\relay-arc\.git\HEAD.lock"
echo Done - lock files removed.
echo.
pause
