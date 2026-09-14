/**
 * Deploy CoreSY Backend to EC2 via Instance Connect + SSH.
 * Usage: node scripts/ec2-deploy.js
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');
const {
  EC2InstanceConnectClient,
  SendSSHPublicKeyCommand,
} = require('@aws-sdk/client-ec2-instance-connect');

const INSTANCE_ID = process.env.EC2_INSTANCE_ID || 'i-02a43a2295bc6c32f';
const OS_USER = process.env.EC2_OS_USER || 'ubuntu';
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
const KEY_PATH = path.join(process.env.USERPROFILE || process.env.HOME, '.ssh', 'coresy-ec2-deploy');
const PUB_PATH = `${KEY_PATH}.pub`;
const SSH_EXE = 'C:\\Windows\\System32\\OpenSSH\\ssh.exe';

const REMOTE_SCRIPT = `
set -e
echo "=== Remote deploy start ==="
hostname
whoami
pwd

# Locate project directory
CANDIDATES=(
  "$HOME/CoreSY-Backend"
  "$HOME/coresy-backend"
  "$HOME/CoreSY-Backend-main"
  "/var/www/CoreSY-Backend"
  "/var/www/coresy-backend"
  "/home/ubuntu/CoreSY-Backend"
)

APP_DIR=""
for d in "\${CANDIDATES[@]}"; do
  if [ -d "\$d/.git" ] || [ -f "\$d/package.json" ]; then
    APP_DIR="\$d"
    break
  fi
done

if [ -z "\$APP_DIR" ]; then
  echo "Searching for package.json..."
  FOUND=\$(find "\$HOME" /var/www -maxdepth 3 -name package.json 2>/dev/null | head -n 1 || true)
  if [ -n "\$FOUND" ]; then
    APP_DIR=\$(dirname "\$FOUND")
  fi
fi

if [ -z "\$APP_DIR" ]; then
  echo "ERROR: Could not find CoreSY-Backend on server"
  ls -la "\$HOME"
  exit 1
fi

echo "APP_DIR=\$APP_DIR"
cd "\$APP_DIR"

echo "=== git status before ==="
git remote -v || true
git status -sb || true

echo "=== git pull origin main ==="
git fetch origin main
git checkout main
git pull origin main

echo "=== npm install ==="
npm install --omit=dev

echo "=== prisma generate ==="
npx prisma generate

echo "=== restart app ==="
if command -v pm2 >/dev/null 2>&1; then
  # Production currently runs as PM2 app "coresy" (src/server.js).
  if pm2 describe coresy >/dev/null 2>&1; then
    pm2 restart coresy --update-env
  elif pm2 describe coresy-api >/dev/null 2>&1; then
    pm2 restart coresy-api --update-env
  else
    pm2 start src/server.js --name coresy
  fi
  pm2 save || true
  pm2 status || true
else
  echo "PM2 not found; trying npm start in background is skipped"
  exit 1
fi

echo "=== health check ==="
sleep 2
curl -sS http://127.0.0.1:3000/api/v1/health || true
echo
echo "=== Remote deploy done ==="
`;

async function main() {
  if (!fs.existsSync(KEY_PATH) || !fs.existsSync(PUB_PATH)) {
    throw new Error(`SSH key missing at ${KEY_PATH}`);
  }

  const publicKey = fs.readFileSync(PUB_PATH, 'utf8').trim();
  const ec2 = new EC2Client({ region: REGION });
  const eic = new EC2InstanceConnectClient({ region: REGION });

  const described = await ec2.send(
    new DescribeInstancesCommand({ InstanceIds: [INSTANCE_ID] }),
  );
  const instance = described.Reservations?.[0]?.Instances?.[0];
  if (!instance) {
    throw new Error(`Instance ${INSTANCE_ID} not found in ${REGION}`);
  }

  const az = instance.Placement?.AvailabilityZone;
  const host =
    instance.PublicDnsName ||
    instance.PublicIpAddress ||
    instance.PrivateIpAddress;

  if (!az || !host) {
    throw new Error(`Missing AZ/host for instance. state=${instance.State?.Name}`);
  }

  console.log(`Instance ${INSTANCE_ID} state=${instance.State?.Name} az=${az} host=${host}`);

  await eic.send(
    new SendSSHPublicKeyCommand({
      InstanceId: INSTANCE_ID,
      InstanceOSUser: OS_USER,
      SSHPublicKey: publicKey,
      AvailabilityZone: az,
    }),
  );
  console.log('EC2 Instance Connect public key pushed (valid ~60s)');

  const remoteCmd = REMOTE_SCRIPT.replace(/\r\n/g, '\n');
  execFileSync(
    SSH_EXE,
    [
      '-o',
      'StrictHostKeyChecking=accept-new',
      '-o',
      'ConnectTimeout=15',
      '-o',
      'IdentitiesOnly=yes',
      '-i',
      KEY_PATH,
      `${OS_USER}@${host}`,
      remoteCmd,
    ],
    { stdio: 'inherit' },
  );
}

main().catch((error) => {
  console.error('Deploy failed:', error.message || error);
  process.exit(1);
});
