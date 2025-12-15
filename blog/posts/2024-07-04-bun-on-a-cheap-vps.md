# Running A Bun Service On A Cheap VPS

Today, I spun up a Bun service on a Hetzner VPS. It was pretty straightforward, but I thought I'd share my notes.

## Config

Spinning up a new VPS on Hetzner was simple. I took [Hetzner's example config](https://community.hetzner.com/tutorials/basic-cloud-config) and tweaked it to include automatic updates:

```yaml
#cloud-config
users:
  - name: {YOUR_USER_NAME}
    groups: users, admin
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ssh_authorized_keys:
      - {YOUR_PUBLIC_SSH_KEY}
packages:
  - fail2ban
  - ufw
  - unattended-upgrades
  - apt-listchanges
package_update: true
package_upgrade: true
runcmd:
  - printf "[sshd]\nenabled = true\nbanaction = iptables-multiport" > /etc/fail2ban/jail.local
  - systemctl enable fail2ban
  - ufw allow ssh
  - ufw allow http
  - ufw allow https
  - ufw enable
  - sed -i -e '/^\(#\|\)PermitRootLogin/s/^.*$/PermitRootLogin no/' /etc/ssh/sshd_config
  - sed -i -e '/^\(#\|\)PasswordAuthentication/s/^.*$/PasswordAuthentication no/' /etc/ssh/sshd_config
  - sed -i -e '/^\(#\|\)KbdInteractiveAuthentication/s/^.*$/KbdInteractiveAuthentication no/' /etc/ssh/sshd_config
  - sed -i -e '/^\(#\|\)ChallengeResponseAuthentication/s/^.*$/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config
  - sed -i -e '/^\(#\|\)MaxAuthTries/s/^.*$/MaxAuthTries 2/' /etc/ssh/sshd_config
  - sed -i -e '/^\(#\|\)AllowTcpForwarding/s/^.*$/AllowTcpForwarding no/' /etc/ssh/sshd_config
  - sed -i -e '/^\(#\|\)X11Forwarding/s/^.*$/X11Forwarding no/' /etc/ssh/sshd_config
  - sed -i -e '/^\(#\|\)AllowAgentForwarding/s/^.*$/AllowAgentForwarding no/' /etc/ssh/sshd_config
  - sed -i -e '/^\(#\|\)AuthorizedKeysFile/s/^.*$/AuthorizedKeysFile .ssh\/authorized_keys/' /etc/ssh/sshd_config
  - sed -i '$a AllowUsers {YOUR_USER_NAME}' /etc/ssh/sshd_config
  - systemctl enable unattended-upgrades
  - reboot
```

## Verifying the SSH signature

My VPS was ready in a few seconds. (It was ready so fast, I thought maybe something hadn't worked.) When I first SSHed into the box, I was given a message like this:

```
The authenticity of host '...' can't be established.
ED25519 key fingerprint is SHA256:....
```

To verify the key, I ran:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

## Installing Caddy

Once in, it was time to [install Caddy](https://caddyserver.com/docs/install#debian-ubuntu-raspbian):

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

I hit `https://{IP_ADDRESS}` and saw a default Caddy page. Nice! It told me to do the following:

```
Point your domain's A/AAAA DNS records at this machine.
Upload your site's files to /var/www/html.
Edit your Caddyfile at /etc/caddy/Caddyfile:
    Replace :80 with your domain name
    Change the site root to /var/www/html
Reload the configuration: systemctl reload caddy
Visit your site!
```

I love the way Caddy presented that. This is the way dev-tooling should be. Anyway, I'm ignoring all of that advice, since I'm going to instead proxy a Bun service.

## Hello, Bun!

I pointed a test domain at my IP address, [installed Bun](https://bun.sh/docs/installation), then created a little hello-world script:


```ts
// /home/{YOUR_USER_NAME}/hello-world/hi.ts
const port = 3000;

Bun.serve({
  fetch(req) {
    return new Response("Hello, world!");
  },
});

console.log('Listening on', port);
```

Next, I ran my server manually:

```bash
bun hi.ts
```

And, I modified `/etc/caddy/Caddyfile` to look like this:

```
{DOMAIN_NAME} {
  reverse_proxy :3000
}
```

Hey, presto! Everything worked. I can now see `Hello, world!` over HTTPS from any browser on the planet. Neato.

## Systemd

I want my Bun service to run automatically when the server restarts, or after a crash. To do that, I [created a systemd service](https://bun.sh/guides/ecosystem/systemd) like so:

```bash
# /etc/systemd/system/hello-world.service
[Unit]
Description=Hello world web service
After=network.target

[Service]
Type=simple
User={YOUR_USER_NAME}
WorkingDirectory=/home/{YOUR_USER_NAME}/hello-world
ExecStart=/home/{YOUR_USER_NAME}/.bun/bin/bun run hi.ts
Restart=always

[Install]
WantedBy=multi-user.target

```

I enabled and started it:

```bash
sudo systemctl enable hello-world
sudo systemctl start hello-world
```

## Checking the status of everything

Lastly, I created a cheatsheet of the stuff I might want to hop in and check later:

```bash
# Review statuses, logs, etc
# View unattended-upgrades logs here:
#
#   /var/log/unattended-upgrades/
#
sudo unattended-upgrades --dry-run --debug
sudo fail2ban-client status ssh
sudo ufw status
sudo systemctl status hello-world
sudo systemctl status caddy
sudo journalctl -u caddy -f
```

## That's all, folks

And that's it. A working Bun service running on a cheap Hetzner VPS, served over https.

Happy hacking.

