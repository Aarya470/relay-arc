@echo off
cd /d "%~dp0"
echo Staging all changes...
git add -A
echo Committing...
git commit -F COMMIT_MSG.txt
echo Pushing to remote...
git push
echo Done! All changes pushed.
pause
