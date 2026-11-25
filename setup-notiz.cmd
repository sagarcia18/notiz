@echo off
rem Double-click to set up Notiz on this computer (Git, Node.js, pnpm, packages, .env, database).
rem Works from inside a checkout or as a single downloaded file: then it clones the repo first.
setlocal
set "SCRIPT=%~dp0scripts\setup.ps1"
set "REPO_URL=https://github.com/sagarcia18/notiz.git"
set "REPO_DIR=%USERPROFILE%\source\repos\notiz"

if exist "%SCRIPT%" goto run

where git >nul 2>nul
if errorlevel 1 (
  echo Installing Git with winget...
  winget install --id Git.Git --exact --silent --accept-package-agreements --accept-source-agreements
  if errorlevel 1 goto failed
  set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
)

if exist "%REPO_DIR%\.git" goto cloned
echo Cloning %REPO_URL% into %REPO_DIR% ...
git clone "%REPO_URL%" "%REPO_DIR%"
if errorlevel 1 goto failed

:cloned
set "SCRIPT=%REPO_DIR%\scripts\setup.ps1"

:run
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*
if errorlevel 1 goto failed
echo.
pause
exit /b 0

:failed
echo.
echo Setup failed. Read the message above, fix it and run setup-notiz.cmd again.
pause
exit /b 1
