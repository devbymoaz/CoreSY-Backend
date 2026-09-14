/**
 * Run a one-off remote command on EC2 via Instance Connect.
 * Usage: node scripts/ec2-run.js "command here"
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
const REGION = process.env.AWS_REGION || 'us-east-1';
const KEY_PATH = path.join(process.env.USERPROFILE || process.env.HOME, '.ssh', 'coresy-ec2-deploy');
const PUB_PATH = `${KEY_PATH}.pub`;
const SSH_EXE = 'C:\\Windows\\System32\\OpenSSH\\ssh.exe';

async function main() {
  const remoteCmd = process.argv.slice(2).join(' ');
  if (!remoteCmd) {
    throw new Error('Pass a remote command, e.g. node scripts/ec2-run.js "pm2 status"');
  }

  const publicKey = fs.readFileSync(PUB_PATH, 'utf8').trim();
  const ec2 = new EC2Client({ region: REGION });
  const eic = new EC2InstanceConnectClient({ region: REGION });

  const described = await ec2.send(
    new DescribeInstancesCommand({ InstanceIds: [INSTANCE_ID] }),
  );
  const instance = described.Reservations?.[0]?.Instances?.[0];
  const az = instance.Placement?.AvailabilityZone;
  const host =
    instance.PublicDnsName ||
    instance.PublicIpAddress ||
    instance.PrivateIpAddress;

  await eic.send(
    new SendSSHPublicKeyCommand({
      InstanceId: INSTANCE_ID,
      InstanceOSUser: OS_USER,
      SSHPublicKey: publicKey,
      AvailabilityZone: az,
    }),
  );

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
  console.error(error.message || error);
  process.exit(1);
});
