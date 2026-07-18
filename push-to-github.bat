@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ========================================
echo ATHVEXA GitHub Push and Deploy Helper
echo Project: %cd%
echo ========================================
echo.

set "EXPECTED_REMOTE=https://github.com/rezacalm8194/athvexa.com.git"
set "SERVER_USER=athvexauser"
set "SERVER_HOST=37.32.12.189"
set "SERVER_PATH=/home/athvexauser/athvexa.com"
set "PNPM_VERSION=11.9.0"

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: This folder is not a Git repository.
  pause
  exit /b 1
)

for /f "delims=" %%b in ('git branch --show-current') do set "BRANCH=%%b"
if not "%BRANCH%"=="main" (
  echo ERROR: Current branch is "%BRANCH%"; expected "main".
  pause
  exit /b 1
)

for /f "delims=" %%r in ('git remote get-url origin 2^>nul') do set "REMOTE=%%r"
if not "%REMOTE%"=="%EXPECTED_REMOTE%" (
  echo ERROR: origin remote is not the expected GitHub repository.
  echo Current origin: %REMOTE%
  pause
  exit /b 1
)

where ssh >nul 2>&1
if errorlevel 1 (
  echo ERROR: ssh command was not found on this computer.
  echo Install or enable OpenSSH Client on Windows, then run this file again.
  pause
  exit /b 1
)

echo Current Git status:
git status --short
echo.

git diff --quiet
set "HAS_WORKTREE_CHANGES=%ERRORLEVEL%"
git diff --cached --quiet
set "HAS_STAGED_CHANGES=%ERRORLEVEL%"

if "%HAS_WORKTREE_CHANGES%"=="0" if "%HAS_STAGED_CHANGES%"=="0" (
  echo No local changes to commit.
  echo Pushing current main branch anyway...
  git push
  if errorlevel 1 (
    echo.
    echo ERROR: Push failed.
    pause
    exit /b 1
  )
  call :deploy_to_server
  exit /b %ERRORLEVEL%
)

echo.
set /p COMMIT_MESSAGE=Commit message: 
if "%COMMIT_MESSAGE%"=="" (
  echo ERROR: Commit message cannot be empty.
  pause
  exit /b 1
)

echo.
echo Staging files...
git add .
if errorlevel 1 (
  echo ERROR: git add failed.
  pause
  exit /b 1
)

echo.
echo Creating commit...
git commit -m "%COMMIT_MESSAGE%"
if errorlevel 1 (
  echo ERROR: git commit failed.
  pause
  exit /b 1
)

echo.
echo Pushing to GitHub...
git push
if errorlevel 1 (
  echo ERROR: git push failed.
  pause
  exit /b 1
)

call :deploy_to_server
exit /b %ERRORLEVEL%

:deploy_to_server
echo.
echo ========================================
echo Push completed successfully.
echo Deploying on server...
echo ========================================
echo Server: %SERVER_USER%@%SERVER_HOST%
echo Path: %SERVER_PATH%
echo.

set "DEPLOY_CMD=cd %SERVER_PATH% && git pull --ff-only origin main && corepack enable && corepack prepare pnpm@%PNPM_VERSION% --activate && pnpm install --frozen-lockfile && pnpm build"

ssh %SERVER_USER%@%SERVER_HOST% "%DEPLOY_CMD%"
if errorlevel 1 (
  echo.
  echo ERROR: Server deploy failed.
  echo Check SSH access, server path, pnpm/corepack, and Pachim logs.
  pause
  exit /b 1
)

echo.
echo ========================================
echo Push and server build completed successfully.
echo If Pachim keeps an old running process, restart the app from the Pachim panel.
echo ========================================
git status -sb
echo.
pause
exit /b 0
