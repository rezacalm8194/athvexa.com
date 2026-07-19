@echo off
setlocal

cd /d "%~dp0"

echo.
echo === Athvexa GitHub Push ===
echo Project: %CD%
echo.

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo ERROR: This folder is not a Git repository.
  pause
  exit /b 1
)

git status --short
echo.

set "COMMIT_MESSAGE=%~1"
if "%COMMIT_MESSAGE%"=="" (
  set "COMMIT_MESSAGE=Update Athvexa project"
)

echo Adding project changes...
git add -A
if errorlevel 1 (
  echo ERROR: git add failed.
  pause
  exit /b 1
)

git diff --cached --quiet
if errorlevel 1 (
  echo Creating commit: "%COMMIT_MESSAGE%"
  git commit -m "%COMMIT_MESSAGE%"
  if errorlevel 1 (
    echo ERROR: git commit failed.
    pause
    exit /b 1
  )
) else (
  echo No local changes to commit.
)

echo.
echo Pushing to GitHub...
git push
if errorlevel 1 (
  echo ERROR: git push failed. Check your GitHub login, remote URL, or network connection.
  pause
  exit /b 1
)

echo.
echo Done. GitHub is updated.
echo Important: your server must still be connected to this GitHub repo or redeployed separately.
pause
