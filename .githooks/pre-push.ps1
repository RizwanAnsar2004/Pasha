#requires -version 5
<#
    pre-push.ps1  -  Next.js "deploy branch" pre-push hook (Windows).

    Behaviour
    ---------
    * Push targets the 'deploy' branch:
        1. package .next/standalone (+ .next/static + public) into a
           server-ready tarball at the repo root,
        2. delete any existing tarball first,
        3. commit the tarball and push it together with the commit.
    * Push targets any other branch:
        -> do nothing, let git push immediately.

    Why the re-push dance?
    ----------------------
    git locks the commit to be pushed BEFORE calling this hook, so a commit
    created here can't ride along on the current push. We therefore commit
    the tarball, push that new commit ourselves (guarded against recursion),
    and abort the original - now stale - push.
#>
[CmdletBinding()]
param(
    [string]$RemoteName = 'origin',
    [string]$RemoteUrl  = ''
)

$ErrorActionPreference = 'Stop'

# ----------------------------- config -----------------------------------
$DeployBranch = 'deploy'
$TarballName  = 'release.tar.gz'
# Set env PREPUSH_BUILD=1 to auto-run `npm run build` when no standalone
# output exists yet. Off by default (a build can take minutes).
$AutoBuild    = ($env:PREPUSH_BUILD -eq '1')
# ------------------------------------------------------------------------

function Info($m) { Write-Host "[pre-push] $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "[pre-push] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[pre-push] $m" -ForegroundColor Yellow }
function Fail($m) { Write-Host "[pre-push] $m" -ForegroundColor Red }

# Recursion guard: the re-push we trigger below must pass straight through.
if ($env:PREPUSH_DEPLOY_GUARD -eq '1') { exit 0 }

# --- Which refs are being pushed? (git feeds them on stdin) -------------
# Each line: <local ref> <local sha> <remote ref> <remote sha>
$stdinText = [Console]::In.ReadToEnd()
$lines = @()
if ($stdinText) {
    $lines = $stdinText -split "`r?`n" | Where-Object { $_.Trim() -ne '' }
}

$pushingDeploy    = $false
$remoteRefToUpdate = "refs/heads/$DeployBranch"
foreach ($line in $lines) {
    $p = $line -split '\s+'
    if ($p.Count -lt 4) { continue }
    $localRef  = $p[0]; $localSha = $p[1]; $remoteRef = $p[2]
    $isDeployRef = ($localRef -eq "refs/heads/$DeployBranch") -or ($remoteRef -eq "refs/heads/$DeployBranch")
    $isDeletion  = ($localSha -match '^0+$')          # deleting the branch
    if ($isDeployRef -and -not $isDeletion) {
        $pushingDeploy     = $true
        $remoteRefToUpdate = $remoteRef
    }
}

# --- Not the deploy branch -> let git push normally --------------------
if (-not $pushingDeploy) { exit 0 }

Info "Push targets '$DeployBranch' - packaging .next standalone..."

# Repo root
$repoRoot = (git rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) { Fail 'Not inside a git work tree.'; exit 1 }
$repoRoot = $repoRoot.Trim()

# We commit the tarball onto HEAD, so deploy must be the checked-out branch.
$currentBranch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()
if ($currentBranch -ne $DeployBranch) {
    Warn "On branch '$currentBranch', not '$DeployBranch'. Skipping tarball; pushing as-is."
    exit 0
}

$standalone = Join-Path $repoRoot '.next\standalone'
$staticDir  = Join-Path $repoRoot '.next\static'
$publicDir  = Join-Path $repoRoot 'public'
$tarball    = Join-Path $repoRoot $TarballName

# --- Ensure a standalone build exists ----------------------------------
if (-not (Test-Path $standalone)) {
    if ($AutoBuild) {
        Info 'No .next\standalone - running `npm run build`...'
        npm run build
        if ($LASTEXITCODE -ne 0) { Fail 'Build failed. Aborting push.'; exit 1 }
    }
    if (-not (Test-Path $standalone)) {
        Fail 'No .next\standalone directory found.'
        Fail "Set  output: 'standalone'  in next.config.* and build first (or set PREPUSH_BUILD=1)."
        exit 1
    }
}

try {
    # --- Delete an existing tarball ------------------------------------
    if (Test-Path $tarball) {
        Info "Removing existing $TarballName ..."
        Remove-Item -LiteralPath $tarball -Force
    }

    # --- Assemble a server-ready layout in a temp staging dir ----------
    #   <root>/            <- contents of .next/standalone (has server.js)
    #   <root>/.next/static
    #   <root>/public
    $staging = Join-Path ([System.IO.Path]::GetTempPath()) ("next-deploy-" + [System.Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $staging -Force | Out-Null

    Copy-Item -Path (Join-Path $standalone '*') -Destination $staging -Recurse -Force

    if (Test-Path $staticDir) {
        $destStatic = Join-Path $staging '.next\static'
        New-Item -ItemType Directory -Path $destStatic -Force | Out-Null
        Copy-Item -Path (Join-Path $staticDir '*') -Destination $destStatic -Recurse -Force
    }

    if (Test-Path $publicDir) {
        $destPublic = Join-Path $staging 'public'
        New-Item -ItemType Directory -Path $destPublic -Force | Out-Null
        Copy-Item -Path (Join-Path $publicDir '*') -Destination $destPublic -Recurse -Force
    }

    # --- Create the tarball at the repo root ---------------------------
    Info "Creating $TarballName ..."
    tar -czf "$tarball" -C "$staging" .
    if ($LASTEXITCODE -ne 0) { throw "tar failed with exit code $LASTEXITCODE" }

    Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue

    $sizeMB = [math]::Round((Get-Item $tarball).Length / 1MB, 2)
    Ok "Built $TarballName ($sizeMB MB)."
}
catch {
    Fail "Failed to build tarball: $($_.Exception.Message)"
    exit 1
}

# --- Commit the tarball onto the deploy branch -------------------------
git add -f -- "$tarball" 2>$null

$pending = git status --porcelain -- "$tarball"
if ([string]::IsNullOrWhiteSpace($pending)) {
    Ok 'Tarball unchanged since last commit - pushing as-is.'
    exit 0
}

Info 'Committing tarball...'
git commit -m "chore(deploy): package .next standalone -> $TarballName [skip ci]" --no-verify | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'git commit failed. Aborting push.'; exit 1 }

# --- Push the new commit, then abort the original (now stale) push -----
Info 'Pushing deploy commit + tarball...'
$env:PREPUSH_DEPLOY_GUARD = '1'
git push $RemoteName ("HEAD:{0}" -f $remoteRefToUpdate)
$pushExit = $LASTEXITCODE
$env:PREPUSH_DEPLOY_GUARD = $null

if ($pushExit -eq 0) {
    Ok   'Deploy commit + tarball pushed successfully.'
    Warn "The 'failed to push some refs' line below is EXPECTED - the deploy push above already succeeded."
} else {
    Fail 'Re-push failed. See git output above.'
}

# Stop the original push: we already pushed the up-to-date commit ourselves.
exit 1
