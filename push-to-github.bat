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
set "REMOTE_NODE=/home/athvexauser/.nvm/versions/node/v22.23.1/bin/node"
set "REMOTE_PNPM_JS=/home/athvexauser/.nvm/versions/node/v22.23.1/lib/node_modules/corepack/dist/pnpm.js"

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
set /p COMMIT_MESSAGE=Commit message [Update ATHVEXA site]: 
if "%COMMIT_MESSAGE%"=="" (
  set "COMMIT_MESSAGE=Update ATHVEXA site"
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

set "DEPLOY_CMD=cd %SERVER_PATH% && git pull --ff-only origin main && %REMOTE_NODE% %REMOTE_PNPM_JS% install --frozen-lockfile && %REMOTE_NODE% %REMOTE_PNPM_JS% build"

ssh %SERVER_USER%@%SERVER_HOST% "%DEPLOY_CMD%"
if errorlevel 1 (
  echo.
  echo ERROR: Server deploy failed.
  echo Check SSH access, server path, Node, pnpm.js, and Pachim logs.
  pause
  exit /b 1
)

echo.
echo ========================================
echo Push and server build completed successfully.
echo Restart the Node service from the Pachim panel so the new build is served.
echo ========================================
git status -sb
echo.
pause
exit /b 0
