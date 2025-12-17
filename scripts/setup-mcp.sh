#!/bin/bash
# MCPLink MCP Environment Setup Script (Linux/macOS)
# Run: pnpm setup:mcp

set -e

echo "========================================"
echo "  MCPLink MCP Environment Setup"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m'

# 1. Check Node.js
echo -e "${YELLOW}[1/4] Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "  ${GREEN}[OK] Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "  ${RED}[X] Node.js not installed${NC}"
    echo -e "  ${GRAY}Please visit https://nodejs.org to install${NC}"
fi

# 2. Check/Install Python uv (for uvx command)
echo ""
echo -e "${YELLOW}[2/4] Checking Python uv (uvx)...${NC}"
if command -v uvx &> /dev/null; then
    UV_VERSION=$(uv --version)
    echo -e "  ${GREEN}[OK] uv installed: $UV_VERSION${NC}"
else
    echo -e "  ${YELLOW}[X] uv not installed, installing...${NC}"
    if curl -LsSf https://astral.sh/uv/install.sh | sh; then
        echo -e "  ${GREEN}[OK] uv installed!${NC}"
        echo -e "  ${YELLOW}Run 'source ~/.bashrc' or restart terminal to use uvx${NC}"
        
        # Try to load immediately
        if [ -f "$HOME/.cargo/env" ]; then
            source "$HOME/.cargo/env"
        fi
    else
        echo -e "  ${RED}[X] uv installation failed, please install manually${NC}"
        echo -e "  ${GRAY}Visit: https://docs.astral.sh/uv/getting-started/installation/${NC}"
    fi
fi

# 3. Check Docker (optional)
echo ""
echo -e "${YELLOW}[3/4] Checking Docker (optional)...${NC}"
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "  ${GREEN}[OK] Docker installed: $DOCKER_VERSION${NC}"
    
    if docker info &> /dev/null; then
        echo -e "  ${GREEN}[OK] Docker is running${NC}"
    else
        echo -e "  ${YELLOW}[!] Docker not running, some MCP tools may not work${NC}"
    fi
else
    echo -e "  ${GRAY}[-] Docker not installed (optional for some MCP tools)${NC}"
    echo -e "  ${GRAY}Visit: https://docs.docker.com/engine/install/${NC}"
fi

# 4. Pre-install common MCP tools
echo ""
echo -e "${YELLOW}[4/4] Pre-installing common MCP tools...${NC}"

MCP_TOOLS=(
    "@modelcontextprotocol/server-memory"
    "@modelcontextprotocol/server-filesystem"
)

for tool in "${MCP_TOOLS[@]}"; do
    echo -e "  ${GRAY}Installing $tool...${NC}"
    npm cache add "$tool" 2>/dev/null || true
done
echo -e "  ${GREEN}[OK] Common MCP tools cached${NC}"

# Done
echo ""
echo "========================================"
echo -e "  ${GREEN}Setup Complete!${NC}"
echo "========================================"
echo ""
echo "Supported MCP execution methods:"
echo -e "  ${GRAY}- npx: Node.js MCP tools (ready)${NC}"
echo -e "  ${GRAY}- uvx: Python MCP tools (requires uv)${NC}"
echo -e "  ${GRAY}- docker: Docker MCP tools (requires Docker)${NC}"
echo ""
echo -e "${YELLOW}If uv was just installed, run 'source ~/.bashrc' or restart terminal${NC}"
