const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "../.github/workflows");
fs.mkdirSync(dir, { recursive: true });

const content = `name: Deploy Sahiy Docs to Production

on:
  push:
    branches:
      - master
      - main
  workflow_dispatch:

concurrency:
  group: sahiy-docs-prod
  cancel-in-progress: false

jobs:
  deploy:
    name: Build and Deploy to Production Server
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup SSH Connection
        run: |
          mkdir -p ~/.ssh
          echo "\${{ secrets.PROD_SSH_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H \${{ secrets.PROD_HOST || '158.220.100.58' }} >> ~/.ssh/known_hosts

      - name: Sync code to server and Deploy with Docker
        env:
          PROD_HOST: \${{ secrets.PROD_HOST || '158.220.100.58' }}
          PROD_USER: \${{ secrets.PROD_USER || 'root' }}
          PORT: "3006"
          APP_NAME: "sahiy-docs"
        run: |
          echo "Packaging codebase for server sync..."
          tar --exclude=node_modules --exclude=.next --exclude=.git -czvf sahiy-docs.tar.gz .

          echo "Uploading package to server..."
          scp -i ~/.ssh/id_rsa sahiy-docs.tar.gz \${PROD_USER}@\${PROD_HOST}:/root/sahiy-docs.tar.gz

          echo "Executing Docker build and restart on server..."
          ssh -i ~/.ssh/id_rsa \${PROD_USER}@\${PROD_HOST} << 'EOF'
            set -e
            mkdir -p /root/sahiy-docs
            cd /root/sahiy-docs
            tar -xzvf /root/sahiy-docs.tar.gz
            rm -f /root/sahiy-docs.tar.gz

            echo "Building Docker image..."
            docker build -t sahiy-docs .

            echo "Restarting container..."
            docker stop sahiy-docs || true
            docker rm -f sahiy-docs || true

            docker run -d -p 3006:3000 --name sahiy-docs --restart unless-stopped \\
              --network brend-market_brend-network \\
              --env-file /root/sahiy-docs/.env \\
              sahiy-docs

            sleep 3
            docker ps --filter name=sahiy-docs
          EOF

      - name: Post-deployment Health Check
        run: |
          echo "Verifying server response..."
          sleep 5
          STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://crm.sahiy.uz || true)
          echo "Production URL status code: $STATUS_CODE"

      - name: Cleanup SSH Key
        if: always()
        run: |
          rm -f ~/.ssh/id_rsa
`;

fs.writeFileSync(path.join(dir, "deploy.yml"), content);
console.log("Successfully created .github/workflows/deploy.yml");
