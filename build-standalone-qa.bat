@echo off
REM ============================================================
REM  Pasha QA - Standalone build assembler (BUILD ONLY, no deploy)
REM
REM  Sibling of build-standalone.bat, but pins the build to the QA
REM  environment instead of inheriting whatever is in .env.local.
REM
REM  1. Loads .env.qa and exports it as real process environment vars
REM  2. Refuses to build on a missing/loopback public origin
REM  3. Runs the Next.js production build (output: "standalone")
REM  4. Assembles a self-contained folder containing:
REM       server.js + node_modules  <- .next\standalone
REM       .next\static              <- .next\static (JS/CSS chunks)
REM       public                    <- public assets
REM  5. Compresses it into build-qa.7z, then removes the temp folder
REM
REM  On the server: extract build-qa.7z, then run: node server.js
REM  (To deploy instead of just packaging, use release-qa.bat.)
REM
REM  WHY THE ENV IS LOADED HERE, NOT VIA .env.production:
REM  Next resolves .env.local ABOVE .env.production, so a .env.production
REM  file would be silently ignored on a machine that has .env.local.
REM  Next does not overwrite variables already present in process.env,
REM  so exporting them first is the one reliable way to pin the build.
REM
REM  WHAT GETS BAKED IN (cannot be changed by the server's .env later):
REM    - every NEXT_PUBLIC_* var, inlined into the client JS bundles
REM    - the CSP connect-src/img-src host and next/image remotePatterns,
REM      derived from NEXT_PUBLIC_SUPABASE_URL in next.config.ts and
REM      serialised into the routes manifest at build time
REM  Server-only secrets stay runtime-resolved from the server's .env.
REM
REM  Requires: 7-Zip on PATH or at the default install location.
REM ============================================================
setlocal EnableExtensions

cd /d "%~dp0"

set "ENVFILE=.env.qa"
set "STAGE=.build-stage-qa"
set "ARCHIVE=build-qa.7z"

REM --- ANSI color setup (Windows 10 1511+ / Windows Terminal) ---
for /F %%a in ('echo prompt $E^| cmd') do set "ESC=%%a"
set "CYAN=%ESC%[96m"
set "GREEN=%ESC%[92m"
set "RED=%ESC%[91m"
set "YELLOW=%ESC%[93m"
set "BOLD=%ESC%[1m"
set "RESET=%ESC%[0m"


echo %CYAN%%BOLD%=== [1/6] Loading %ENVFILE% ===%RESET%
if not exist "%ENVFILE%" (
    set "ERR=%ENVFILE% not found - cannot pin this build to QA."
    goto :fail
)
REM eol=# skips comments, blank lines are skipped by for /f itself.
REM Each line goes through a subroutine rather than a parenthesised block
REM so delayed expansion can stay OFF - the cookie secrets end in "!!",
REM which delayed expansion would eat.
for /f "usebackq eol=# delims=" %%L in ("%ENVFILE%") do call :set_env "%%L"


echo %CYAN%%BOLD%=== [2/6] Verifying QA environment ===%RESET%
if not defined NEXT_PUBLIC_SUPABASE_URL (
    set "ERR=NEXT_PUBLIC_SUPABASE_URL is not set in %ENVFILE%."
    goto :fail
)
REM A loopback origin is worse than a missing one: site-url.ts discards it
REM when NODE_ENV=production and falls back to CANONICAL_SITE_URL, so the
REM QA build would send password resets and applicant email pointing at
REM PRODUCTION. Fail here instead.
if not defined NEXT_PUBLIC_SITE_URL (
    set "ERR=NEXT_PUBLIC_SITE_URL is not set in %ENVFILE% - a QA build would fall back to https://pashastartuphub.com. Set the real QA origin."
    goto :fail
)
echo %NEXT_PUBLIC_SITE_URL%| findstr /i /c:"localhost" /c:"127.0.0.1" /c:"0.0.0.0" >nul
if not errorlevel 1 (
    set "ERR=NEXT_PUBLIC_SITE_URL is a loopback address - production builds discard it and fall back to https://pashastartuphub.com. Set the real QA origin."
    goto :fail
)
echo     %GREEN%Supabase : %NEXT_PUBLIC_SUPABASE_URL%%RESET%
echo     %GREEN%Origin   : %NEXT_PUBLIC_SITE_URL%%RESET%
echo     %YELLOW%These are baked into the bundle. Confirm this is the QA project, not prod.%RESET%


echo %CYAN%%BOLD%=== [3/6] Building Next.js app (standalone) ===%RESET%
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


echo %CYAN%%BOLD%=== [4/6] Resetting staging folder ===%RESET%
if exist "%STAGE%" rmdir /s /q "%STAGE%"
mkdir "%STAGE%"
if errorlevel 1 (
    set "ERR=Could not create staging folder %STAGE%."
    goto :fail
)


echo %CYAN%%BOLD%=== [5/6] Copying standalone server, static and public assets ===%RESET%
REM /e /i /h /y = recurse incl. empty dirs, treat target as dir, include
REM hidden files, overwrite without prompting. Only the file list is sent
REM to nul - errors still surface on stderr.
xcopy ".next\standalone" "%STAGE%\" /e /i /h /y >nul
if errorlevel 1 (
    set "ERR=Failed to copy .next\standalone."
    goto :fail
)
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


echo %CYAN%%BOLD%=== [6/6] Compressing into %ARCHIVE% ===%RESET%
REM Locate 7-Zip: prefer PATH, fall back to the default install location.
set "SEVENZIP=7z"
where 7z >nul 2>&1 || set "SEVENZIP=%ProgramFiles%\7-Zip\7z.exe"
if not exist "%SEVENZIP%" if "%SEVENZIP:~0,1%"=="C" (
    set "ERR=7-Zip not found. Install it or add 7z.exe to PATH."
    goto :fail
)

if exist "%ARCHIVE%" del /q "%ARCHIVE%"
"%SEVENZIP%" a -t7z "%ARCHIVE%" ".\%STAGE%\*" -mx=9 >nul
if errorlevel 1 (
    set "ERR=Compression failed."
    goto :fail
)

REM Clean up the staging folder - keep only the archive
rmdir /s /q "%STAGE%"

echo.
echo %GREEN%%BOLD%=== Done. ===%RESET%
echo %GREEN%    Archive created: %ARCHIVE%  (ready to upload)%RESET%
echo %GREEN%    Built against  : %NEXT_PUBLIC_SUPABASE_URL%%RESET%
echo %GREEN%    On the server  : extract it, then run: node server.js%RESET%
echo.
endlocal
exit /b 0


REM ------------------------------------------------------------
REM  Sets one KEY=VALUE line into the environment.
REM  Lines ending in "=" (deliberately blank values, e.g. GA) are
REM  skipped rather than set: an unassigned for-token expands to
REM  literal text in batch, so setting them would store garbage.
REM  Leaving them unset is what the app already treats as "off".
REM ------------------------------------------------------------
:set_env
set "_line=%~1"
if not defined _line goto :eof
if "%_line:~-1%"=="=" goto :eof
for /f "tokens=1* delims==" %%A in ("%_line%") do set "%%A=%%B"
goto :eof


:fail
echo.
echo %RED%%BOLD%%ERR% Aborting.%RESET%
REM Hold the window open long enough to read the error when double-clicked
REM (any key skips). Times out rather than blocking forever.
timeout /t 30 >nul 2>&1
endlocal
exit /b 1
