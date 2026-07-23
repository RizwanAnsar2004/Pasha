@echo off
REM ============================================================
REM  Pasha - Standalone build assembler + deploy
REM
REM  1. Runs the Next.js production build (output: "standalone")
REM  2. Assembles a self-contained folder containing:
REM       server.js + node_modules  <- .next\standalone
REM       .next\static              <- .next\static (JS/CSS chunks)
REM       public                    <- public assets
REM  3. Compresses it into build.tar.gz, then removes the temp folder
REM  4. Uploads build.tar.gz to the server (ssh alias: office-server)
REM  5. Extracts it into /var/www/pasha/ and restarts pasha.service
REM
REM  Requires: tar (built into Windows 10 1803+) and OpenSSH client
REM  (ssh/scp) on PATH, plus a working "office-server" entry in
REM  %USERPROFILE%\.ssh\config with key-based auth already set up.
REM
REM  Note: the server's .env lives in %REMOTE_DIR% and is NOT part of
REM  the archive, so extracting on top of it leaves it untouched.
REM ============================================================
setlocal EnableExtensions

cd /d "%~dp0"

REM --- ANSI color setup (Windows 10 1511+ / Windows Terminal) ---
for /F %%a in ('echo prompt $E^| cmd') do set "ESC=%%a"
set "CYAN=%ESC%[96m"
set "GREEN=%ESC%[92m"
set "RED=%ESC%[91m"
set "YELLOW=%ESC%[93m"
set "BOLD=%ESC%[1m"
set "RESET=%ESC%[0m"

set "STAGE=.build-stage"
set "ARCHIVE=build.tar.gz"
set "REMOTE=office-server"
set "REMOTE_DIR=/var/www/pasha"
set "SERVICE=pasha.service"


echo %CYAN%%BOLD%=== [1/6] Building Next.js app (standalone) ===%RESET%
call npm run build
if errorlevel 1 (
    set "ERR=Build failed."
    goto :fail
)

REM next.config.ts sets output:"standalone"; if that ever changes the
REM build still succeeds but produces nothing to deploy - catch it here.
if not exist ".next\standalone\server.js" (
    set "ERR=.next\standalone\server.js not found - is output:'standalone' still set in next.config.ts?"
    goto :fail
)


echo %CYAN%%BOLD%=== [2/6] Resetting staging folder ===%RESET%
if exist "%STAGE%" rmdir /s /q "%STAGE%"
mkdir "%STAGE%"
if errorlevel 1 (
    set "ERR=Could not create staging folder %STAGE%."
    goto :fail
)


echo %CYAN%%BOLD%=== [3/6] Copying standalone server ===%RESET%
REM /e /i /h /y = recurse incl. empty dirs, treat target as dir, include
REM hidden files, overwrite without prompting. Only the file list is sent
REM to nul - errors still surface on stderr.
xcopy ".next\standalone" "%STAGE%\" /e /i /h /y >nul
if errorlevel 1 (
    set "ERR=Failed to copy .next\standalone."
    goto :fail
)


echo %CYAN%%BOLD%=== [4/6] Copying static and public assets ===%RESET%
xcopy ".next\static" "%STAGE%\.next\static\" /e /i /h /y >nul
if errorlevel 1 (
    set "ERR=Failed to copy .next\static."
    goto :fail
)
if exist "public" (
    xcopy "public" "%STAGE%\public\" /e /i /h /y >nul
    if errorlevel 1 (
        set "ERR=Failed to copy public."
        goto :fail
    )
)


echo %CYAN%%BOLD%=== [5/6] Compressing into %ARCHIVE% ===%RESET%
if exist "%ARCHIVE%" del /q "%ARCHIVE%"
tar -czf "%ARCHIVE%" -C "%STAGE%" .
if errorlevel 1 (
    set "ERR=Compression failed."
    goto :fail
)

REM Clean up the staging folder - keep only the archive
rmdir /s /q "%STAGE%"


echo %CYAN%%BOLD%=== [6/6] Deploying to %REMOTE%:%REMOTE_DIR% ===%RESET%
scp "%ARCHIVE%" "%REMOTE%:%REMOTE_DIR%/"
if errorlevel 1 (
    set "ERR=Upload failed."
    goto :fail
)

echo %YELLOW%Extracting and restarting %SERVICE% on %REMOTE%...%RESET%
REM set -e so a failed extract never reaches the restart; the uploaded
REM archive is removed afterwards so it can't be re-extracted by mistake.
ssh "%REMOTE%" "set -e; cd '%REMOTE_DIR%'; tar -xzf '%ARCHIVE%'; rm -f '%ARCHIVE%'; sudo systemctl restart '%SERVICE%'; sudo systemctl is-active '%SERVICE%'"
if errorlevel 1 (
    set "ERR=Remote extract/restart failed - check: ssh %REMOTE% journalctl -u %SERVICE% -n 50"
    goto :fail
)

del /q "%ARCHIVE%"

echo %GREEN%%BOLD%=== Done. ===%RESET%
echo %GREEN%    Archive uploaded and extracted at %REMOTE%:%REMOTE_DIR%%RESET%
echo %GREEN%    Service restarted: %SERVICE%%RESET%
endlocal
exit /b 0

:fail
echo.
echo %RED%%BOLD%%ERR% Aborting.%RESET%
REM Hold the window open long enough to read the error when double-clicked
REM (any key skips). Times out rather than blocking forever.
timeout /t 30 >nul 2>&1
endlocal
exit /b 1
