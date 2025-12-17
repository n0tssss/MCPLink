# MCPLink MCP Environment Setup Script (Windows PowerShell)
# Run: pnpm setup:mcp

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MCPLink MCP Environment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js
Write-Host "[1/4] Checking Node.js..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "  [OK] Node.js installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  [X] Node.js not installed" -ForegroundColor Red
    Write-Host "  Please visit https://nodejs.org to install" -ForegroundColor Gray
}

# 2. Check/Install Python uv (for uvx command)
Write-Host ""
Write-Host "[2/4] Checking Python uv (uvx)..." -ForegroundColor Yellow
if (Get-Command uvx -ErrorAction SilentlyContinue) {
    $uvVersion = uv --version
    Write-Host "  [OK] uv installed: $uvVersion" -ForegroundColor Green
} else {
    Write-Host "  [X] uv not installed, installing..." -ForegroundColor Yellow
    try {
        Invoke-RestMethod https://astral.sh/uv/install.ps1 | Invoke-Expression
        Write-Host "  [OK] uv installed! Please restart terminal to use uvx" -ForegroundColor Green
    } catch {
        Write-Host "  [X] uv installation failed, please install manually" -ForegroundColor Red
        Write-Host "  Visit: https://docs.astral.sh/uv/getting-started/installation/" -ForegroundColor Gray
    }
}

# 3. Check Docker (optional)
Write-Host ""
Write-Host "[3/4] Checking Docker (optional)..." -ForegroundColor Yellow
if (Get-Command docker -ErrorAction SilentlyContinue) {
    $dockerVersion = docker --version
    Write-Host "  [OK] Docker installed: $dockerVersion" -ForegroundColor Green
    
    $dockerRunning = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Docker is running" -ForegroundColor Green
    } else {
        Write-Host "  [!] Docker not running, some MCP tools may not work" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [-] Docker not installed (optional for some MCP tools)" -ForegroundColor Gray
    Write-Host "  Visit: https://www.docker.com/products/docker-desktop" -ForegroundColor Gray
}

# 4. Pre-install common MCP tools
Write-Host ""
Write-Host "[4/4] Pre-installing common MCP tools..." -ForegroundColor Yellow

$mcpTools = @(
    "@modelcontextprotocol/server-memory",
    "@modelcontextprotocol/server-filesystem"
)

foreach ($tool in $mcpTools) {
    Write-Host "  Installing $tool..." -ForegroundColor Gray
    npm cache add $tool 2>$null
}
Write-Host "  [OK] Common MCP tools cached" -ForegroundColor Green

# Done
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Supported MCP execution methods:" -ForegroundColor White
Write-Host "  - npx: Node.js MCP tools (ready)" -ForegroundColor Gray
Write-Host "  - uvx: Python MCP tools (requires uv)" -ForegroundColor Gray
Write-Host "  - docker: Docker MCP tools (requires Docker)" -ForegroundColor Gray
Write-Host ""
Write-Host "If uv was just installed, please restart terminal to use uvx command" -ForegroundColor Yellow
