#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Blockscout + Nitro Devnode Setup Script ===${NC}\n"

# Step 1: Setup blockscout submodule
echo -e "${YELLOW}[1/3] Setting up blockscout submodule...${NC}"
if [ ! -f .gitmodules ]; then
    echo "Creating .gitmodules file..."
    touch .gitmodules
fi

# Check if blockscout is already in .gitmodules
if ! grep -q "blockscout" .gitmodules 2>/dev/null; then
    echo "Adding blockscout to .gitmodules..."
    cat >> .gitmodules << 'EOF'
[submodule "blockscout"]
	path = blockscout
	url = https://github.com/blockscout/blockscout.git
EOF
fi

# Initialize and update submodules
echo "Initializing git submodules..."
git submodule update --init --recursive blockscout

# Apply blockscout customizations for nitro-devnode
echo -e "${GREEN}Applying blockscout customizations for nitro-devnode...${NC}"

BLOCKSCOUT_DIR="blockscout/docker-compose"

# Update docker-compose.yml
echo "  - Updating docker-compose.yml..."
sed -i.bak 's|ETHEREUM_JSONRPC_HTTP_URL: http://host.docker.internal:8545/|ETHEREUM_JSONRPC_HTTP_URL: http://host.docker.internal:8547/|g' "$BLOCKSCOUT_DIR/docker-compose.yml"
sed -i.bak 's|ETHEREUM_JSONRPC_TRACE_URL: http://host.docker.internal:8545/|ETHEREUM_JSONRPC_TRACE_URL: http://host.docker.internal:8547/|g' "$BLOCKSCOUT_DIR/docker-compose.yml"
sed -i.bak 's|ETHEREUM_JSONRPC_WS_URL: ws://host.docker.internal:8545/|ETHEREUM_JSONRPC_WS_URL: ws://host.docker.internal:8547/|g' "$BLOCKSCOUT_DIR/docker-compose.yml"
sed -i.bak "s|CHAIN_ID: '1337'|CHAIN_ID: '412346'|g" "$BLOCKSCOUT_DIR/docker-compose.yml"
rm -f "$BLOCKSCOUT_DIR/docker-compose.yml.bak"

# Update common-blockscout.env
echo "  - Updating common-blockscout.env..."
sed -i.bak 's|ETHEREUM_JSONRPC_HTTP_URL=http://host.docker.internal:8545/|ETHEREUM_JSONRPC_HTTP_URL=http://host.docker.internal:8547/|g' "$BLOCKSCOUT_DIR/envs/common-blockscout.env"
sed -i.bak 's|ETHEREUM_JSONRPC_TRACE_URL=http://host.docker.internal:8545/|ETHEREUM_JSONRPC_TRACE_URL=http://host.docker.internal:8547/|g' "$BLOCKSCOUT_DIR/envs/common-blockscout.env"
sed -i.bak 's|ETHEREUM_JSONRPC_WS_URL=ws://host.docker.internal:8545/|ETHEREUM_JSONRPC_WS_URL=ws://host.docker.internal:8547/|g' "$BLOCKSCOUT_DIR/envs/common-blockscout.env"
sed -i.bak 's|# CHAIN_ID=|CHAIN_ID=412346|g' "$BLOCKSCOUT_DIR/envs/common-blockscout.env"
sed -i.bak 's|COIN_NAME=|COIN_NAME=Ether|g' "$BLOCKSCOUT_DIR/envs/common-blockscout.env"
sed -i.bak 's|COIN=|COIN=ETH|g' "$BLOCKSCOUT_DIR/envs/common-blockscout.env"
# Add WebSocket retry interval if not present
if ! grep -q "^ETHEREUM_JSONRPC_WS_RETRY_INTERVAL=" "$BLOCKSCOUT_DIR/envs/common-blockscout.env"; then
    sed -i.bak '/^ETHEREUM_JSONRPC_TRANSPORT=http/a\
ETHEREUM_JSONRPC_WS_RETRY_INTERVAL=5s' "$BLOCKSCOUT_DIR/envs/common-blockscout.env"
fi
# Enable realtime indexer
sed -i.bak 's|# DISABLE_REALTIME_INDEXER=false|DISABLE_REALTIME_INDEXER=false|g' "$BLOCKSCOUT_DIR/envs/common-blockscout.env"
# Configure realtime fetcher
if ! grep -q "^INDEXER_REALTIME_FETCHER_POLLING_PERIOD=" "$BLOCKSCOUT_DIR/envs/common-blockscout.env"; then
    sed -i.bak '/^# INDEXER_REALTIME_FETCHER_POLLING_PERIOD=/a\
INDEXER_REALTIME_FETCHER_MAX_GAP=50\
INDEXER_REALTIME_FETCHER_POLLING_PERIOD=1s' "$BLOCKSCOUT_DIR/envs/common-blockscout.env"
fi
# Enable pending transactions fetcher
sed -i.bak 's|# INDEXER_PENDING_TRANSACTIONS_SANITIZER_INTERVAL=|INDEXER_PENDING_TRANSACTIONS_SANITIZER_INTERVAL=60s|g' "$BLOCKSCOUT_DIR/envs/common-blockscout.env"
sed -i.bak 's|# INDEXER_DISABLE_PENDING_TRANSACTIONS_FETCHER=false|INDEXER_DISABLE_PENDING_TRANSACTIONS_FETCHER=false|g' "$BLOCKSCOUT_DIR/envs/common-blockscout.env"
# Enable internal transactions fetcher (required for daily transaction charts)
sed -i.bak 's|# INDEXER_DISABLE_INTERNAL_TRANSACTIONS_FETCHER=false|INDEXER_DISABLE_INTERNAL_TRANSACTIONS_FETCHER=false|g' "$BLOCKSCOUT_DIR/envs/common-blockscout.env"
# Configure internal transactions indexing for better performance
if ! grep -q "^INDEXER_INTERNAL_TRANSACTIONS_BATCH_SIZE=" "$BLOCKSCOUT_DIR/envs/common-blockscout.env"; then
    sed -i.bak '/^# INDEXER_INTERNAL_TRANSACTIONS_BATCH_SIZE=/a\
INDEXER_INTERNAL_TRANSACTIONS_BATCH_SIZE=10\
INDEXER_INTERNAL_TRANSACTIONS_CONCURRENCY=10' "$BLOCKSCOUT_DIR/envs/common-blockscout.env"
fi
# Enable transaction stats
sed -i.bak 's|# TXS_STATS_ENABLED=false|TXS_STATS_ENABLED=true|g' "$BLOCKSCOUT_DIR/envs/common-blockscout.env"
rm -f "$BLOCKSCOUT_DIR/envs/common-blockscout.env.bak"

# Update common-frontend.env
echo "  - Updating common-frontend.env..."
sed -i.bak 's|NEXT_PUBLIC_NETWORK_NAME=.*|NEXT_PUBLIC_NETWORK_NAME=Nitro Devnet|g' "$BLOCKSCOUT_DIR/envs/common-frontend.env"
sed -i.bak 's|NEXT_PUBLIC_NETWORK_SHORT_NAME=.*|NEXT_PUBLIC_NETWORK_SHORT_NAME=Nitro Devnet|g' "$BLOCKSCOUT_DIR/envs/common-frontend.env"
sed -i.bak 's|NEXT_PUBLIC_NETWORK_ID=.*|NEXT_PUBLIC_NETWORK_ID=412346|g' "$BLOCKSCOUT_DIR/envs/common-frontend.env"
rm -f "$BLOCKSCOUT_DIR/envs/common-frontend.env.bak"

# Update common-stats.env
echo "  - Updating common-stats.env..."
sed -i.bak 's|STATS__BLOCKSCOUT_API_URL=.*|STATS__BLOCKSCOUT_API_URL=http://backend:4000|g' "$BLOCKSCOUT_DIR/envs/common-stats.env"
sed -i.bak 's|STATS__CREATE_DATABASE=false|STATS__CREATE_DATABASE=true|g' "$BLOCKSCOUT_DIR/envs/common-stats.env"
sed -i.bak 's|STATS__RUN_MIGRATIONS=false|STATS__RUN_MIGRATIONS=true|g' "$BLOCKSCOUT_DIR/envs/common-stats.env"
sed -i.bak 's|STATS__FORCE_UPDATE_ON_START=false|STATS__FORCE_UPDATE_ON_START=true|g' "$BLOCKSCOUT_DIR/envs/common-stats.env"
rm -f "$BLOCKSCOUT_DIR/envs/common-stats.env.bak"

# Update services/stats.yml
echo "  - Updating services/stats.yml..."
if ! grep -q "STATS__BLOCKSCOUT_API_URL" "$BLOCKSCOUT_DIR/services/stats.yml"; then
    sed -i.bak '/STATS__BLOCKSCOUT_DB_URL=/a\
      - STATS__BLOCKSCOUT_API_URL=${STATS__BLOCKSCOUT_API_URL:-http://backend:4000}' "$BLOCKSCOUT_DIR/services/stats.yml"
fi
rm -f "$BLOCKSCOUT_DIR/services/stats.yml.bak"

# Update common-user-ops-indexer.env
echo "  - Updating common-user-ops-indexer.env..."
sed -i.bak 's|USER_OPS_INDEXER__INDEXER__RPC_URL=.*|USER_OPS_INDEXER__INDEXER__RPC_URL=ws://host.docker.internal:8547/|g' "$BLOCKSCOUT_DIR/envs/common-user-ops-indexer.env"
sed -i.bak 's|USER_OPS_INDEXER__DATABASE__CONNECT__URL=.*|USER_OPS_INDEXER__DATABASE__CONNECT__URL=postgresql://blockscout:ceWb1MeLBEeOIfk65gU8EjF8@db:5432/blockscout|g' "$BLOCKSCOUT_DIR/envs/common-user-ops-indexer.env"
sed -i.bak 's|USER_OPS_INDEXER__DATABASE__RUN_MIGRATIONS=false|USER_OPS_INDEXER__DATABASE__RUN_MIGRATIONS=true|g' "$BLOCKSCOUT_DIR/envs/common-user-ops-indexer.env"
rm -f "$BLOCKSCOUT_DIR/envs/common-user-ops-indexer.env.bak"

# Update services/user-ops-indexer.yml
echo "  - Updating services/user-ops-indexer.yml..."
sed -i.bak 's|USER_OPS_INDEXER__INDEXER__RPC_URL=.*8545|USER_OPS_INDEXER__INDEXER__RPC_URL=${USER_OPS_INDEXER__INDEXER__RPC_URL:-ws://host.docker.internal:8547/}|g' "$BLOCKSCOUT_DIR/services/user-ops-indexer.yml"
rm -f "$BLOCKSCOUT_DIR/services/user-ops-indexer.yml.bak"

echo -e "${GREEN}✓ Blockscout customization complete${NC}\n"

# Step 2: Setup nitro-devnode submodule
echo -e "${YELLOW}[2/3] Setting up nitro-devnode submodule...${NC}"
if ! grep -q "nitro-devnode" .gitmodules 2>/dev/null; then
    echo "Adding nitro-devnode to .gitmodules..."
    cat >> .gitmodules << 'EOF'
[submodule "nitro-devnode"]
	path = nitro-devnode
	url = https://github.com/OffchainLabs/nitro-devnode.git
EOF
fi

# Initialize and update submodules
echo "Initializing git submodules..."
git submodule update --init --recursive nitro-devnode

# Apply nitro-devnode customizations
echo -e "${GREEN}Applying nitro-devnode customizations...${NC}"
NITRO_SCRIPT="nitro-devnode/run-dev-node.sh"

# Add --http.vhosts="*" option to allow all hosts
VHOSTS_PATTERN='--http.vhosts'
if ! grep -Fq "$VHOSTS_PATTERN" "$NITRO_SCRIPT"; then
    echo "  - Adding --http.vhosts=\"*\" to run-dev-node.sh..."
    sed -i.bak 's|--http.addr 0.0.0.0 --http.api|--http.addr 0.0.0.0 --http.vhosts="*" --http.api|g' "$NITRO_SCRIPT"
    rm -f "$NITRO_SCRIPT.bak"
else
    echo "  - --http.vhosts already present in run-dev-node.sh"
fi

echo -e "${GREEN}✓ Nitro-devnode customization complete${NC}\n"

# Step 3: Start services
echo -e "${YELLOW}[3/3] Starting services...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Stop existing containers if running
echo "Stopping existing containers..."
docker stop nitro-dev 2>/dev/null || true
cd blockscout/docker-compose && docker-compose down 2>/dev/null || true
cd ../..

# Start nitro-devnode
echo -e "${GREEN}Starting nitro-devnode...${NC}"
cd nitro-devnode
./run-dev-node.sh &
NITRO_PID=$!
cd ..

# Wait for nitro-devnode to be ready
echo "Waiting for nitro-devnode to be ready..."
MAX_WAIT=60
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' \
        http://127.0.0.1:8547 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Nitro-devnode is ready${NC}"
        break
    fi
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    echo -n "."
done

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
    echo -e "\n${RED}Error: Nitro-devnode failed to start within $MAX_WAIT seconds${NC}"
    exit 1
fi

echo ""

# Start blockscout
echo -e "${GREEN}Starting blockscout...${NC}"
cd blockscout/docker-compose
docker-compose up -d
cd ../..

echo ""
echo -e "${GREEN}=== Setup Complete! ===${NC}"
echo ""
echo "Services are starting up:"
echo "  - Nitro-devnode: http://127.0.0.1:8547"
echo "  - Blockscout: http://localhost"
echo "  - Stats API: http://localhost:8080"
echo ""
echo "To view logs:"
echo "  - Nitro-devnode: Check the terminal where this script is running"
echo "  - Blockscout: cd blockscout/docker-compose && docker-compose logs -f"
echo ""
echo "To stop services:"
echo "  - Nitro-devnode: docker stop nitro-dev"
echo "  - Blockscout: cd blockscout/docker-compose && docker-compose down"
echo ""

