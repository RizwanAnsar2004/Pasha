@echo off
REM ============================================================
REM  Pasha - Standalone build assembler
REM
REM  1. Runs the Next.js production build (output: "standalone")
REM  2. Assembles a self-contained folder containing:
REM       server.js + node_modules  <- .next\standalone
REM       .next\static              <- .next\static (JS/CSS chunks)
REM       public                    <- public assets
REM  3. Compresses it into build.7z, then removes the temp folder
REM     so only build.7z remains (ready to upload to server)
REM
REM  On the server: extract build.7z, then run: node server.js
REM ============================================================
setlocal

cd /d "%~dp0"

set "STAGE=.build-stage"

echo(
echo === [1/5] Building Next.js app (standalone) ===
call npm run build
if errorlevel 1 (
    echo Build failed. Aborting.
    exit /b 1
)

echo(
echo === [2/5] Resetting staging folder ===
if exist "%STAGE%" rmdir /s /q "%STAGE%"
mkdir "%STAGE%"

echo(
echo === [3/5] Copying standalone server ===
xcopy ".next\standalone" "%STAGE%\" /e /i /h /y >nul
if errorlevel 1 (
    echo Failed to copy .next\standalone. Aborting.
    exit /b 1
)

echo(
echo === [4/5] Copying static and public assets ===
xcopy ".next\static" "%STAGE%\.next\static\" /e /i /h /y >nul
if exist "public" xcopy "public" "%STAGE%\public\" /e /i /h /y >nul

echo(
echo === [5/5] Compressing into build.7z ===
REM Locate 7-Zip: prefer PATH, fall back to the default install location.
set "SEVENZIP=7z"
where 7z >nul 2>&1 || set "SEVENZIP=%ProgramFiles%\7-Zip\7z.exe"
if not exist "%SEVENZIP%" if "%SEVENZIP:~0,1%"=="C" (
    echo 7-Zip not found. Install it or add 7z.exe to PATH.
    exit /b 1
)

if exist "build.7z" del /q "build.7z"
"%SEVENZIP%" a -t7z "build.7z" ".\%STAGE%\*" -mx=9 >nul
if errorlevel 1 (
    echo Compression failed. Aborting.
    exit /b 1
)

REM Clean up the staging folder - keep only build.7z
rmdir /s /q "%STAGE%"

echo(
echo === Done. ===
echo     Archive created: build.7z  (ready to upload)
echo     On the server: extract it, then run: node server.js
echo(
endlocal