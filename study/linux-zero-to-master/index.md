Linux runs most of the world's servers, practically all of its cloud workloads, nearly every container you have ever pulled, Android phones, routers, cars and all of the top supercomputers. If you work anywhere near software, you will end up at a Linux prompt sooner or later. This guide takes you from "what even is a distro?" to reading kernel data structures through `/proc` and tracing system calls, in six levels. Each level builds on the last and ends with an exercise. Do the exercises: you learn Linux with your fingers, not your eyes.

![Six stacked levels from Newcomer to Master, each listing the topics it covers](study/linux-zero-to-master/learning-roadmap.svg "The roadmap: six levels, each assumes the one before it")

## Level 0: What Linux is, and getting a box

### Kernel, userland, distribution

Strictly speaking, **Linux is a kernel**: one large program that Linus Torvalds started in 1991 and thousands of developers maintain today. The kernel is the only software that talks to hardware directly. It schedules processes onto CPUs, hands out memory, implements filesystems and the TCP/IP stack, and drives your disks and network cards. The kernel line moved from 6.x to 7.0 in 2026; the version number jump means nothing special, since Linus bumps the major number when the minor gets unwieldy.

Everything else you touch is **userland** (user space): the shell, `ls`, `grep`, the C library, the init system, your web server. Much of the classic userland came from the **GNU project** (bash, coreutils, glibc, gcc), which is why some people insist on "GNU/Linux". Not every Linux system is GNU-flavored, though: Alpine uses musl libc and BusyBox, and Android uses its own userland entirely.

Programs in user space cannot touch hardware. When `cat` wants to read a file, it asks the kernel through a **system call** (`openat`, `read`, `write`, `close`). The CPU switches into privileged mode, the kernel does the work, and control returns. That boundary is the single most important idea in this article; almost everything at Level 5 is about peeking across it.

![Layer stack: applications, libraries, the system call interface, the kernel subsystems, hardware](study/linux-zero-to-master/linux-layers.svg "User space asks, the kernel does: the system call interface is the only door")

A **distribution** (distro) packages a kernel with a userland, a package manager, an installer, sane defaults and a release policy. Distros differ in how often they update, which package format they use, and who backs them. The families that matter in 2026:

| Family | Members | Packages | Character |
|---|---|---|---|
| Debian | Debian 13 "trixie", Ubuntu (26.04 LTS is current), Linux Mint, Pop!_OS | `.deb`, `apt` | Huge archive, conservative (Debian) to polished (Ubuntu) |
| Red Hat | Fedora, RHEL 10, CentOS Stream, AlmaLinux, Rocky Linux | `.rpm`, `dnf` | Enterprise standard; Fedora is the fast-moving upstream |
| Arch | Arch Linux, EndeavourOS, Manjaro, CachyOS | `pacman` | Rolling release, minimal, superb wiki |
| SUSE | openSUSE Tumbleweed, Leap, SLES | `.rpm`, `zypper` | Strong in European enterprise, great tooling |
| Independent | Alpine, NixOS, Gentoo, Void | varies | Container base images (Alpine), declarative config (NixOS) |

There is also a growing class of **image-based ("immutable")** systems such as Fedora Silverblue, Fedora CoreOS and openSUSE Aeon, where the base OS is updated atomically as a whole and apps come from Flatpak or containers.

> **TIP:** If you are unsure, pick **Ubuntu LTS** or **Debian** for servers and learning, **Fedora** if you want newer software. Everything in this guide works on all three; where commands differ, both are shown.

### Getting a Linux box for free

You do not need to wipe your laptop. Four free options, from least to most effort:

1. **WSL2 on Windows.** A real Linux kernel running in a lightweight VM, integrated with Windows. In an admin PowerShell run `wsl --install` (Ubuntu by default) or `wsl --install -d Debian`; `wsl --list --online` shows what is available. Modern WSL supports systemd, so almost everything in this guide works.
2. **A local virtual machine.** VirtualBox (free), VMware Workstation Pro (free for personal use), GNOME Boxes, or UTM on Apple Silicon Macs. Download a distro ISO, give the VM 2 CPUs, 4 GB RAM and 25 GB disk. VMs are perfect for breaking things: take a snapshot before experiments.
3. **A live USB.** Write an ISO to a USB stick with Ventoy, Fedora Media Writer or balenaEtcher, boot from it, and you are running Linux without touching your disk.
4. **A free cloud VM.** Oracle Cloud's Always Free tier includes Arm (Ampere A1) instances; at the time of writing (2026) the allowance was cut from 4 OCPUs / 24 GB to 2 OCPUs / 12 GB. Google Cloud's free tier includes a small `e2-micro` in selected US regions, and AWS moved to a credit-based free plan in 2025. Free-tier terms change often, so check each provider's page before you rely on one. A cloud VM gives you a real public IP, which matters for the networking and hardening sections.

> **EXERCISE:** Get a Linux shell by any of the methods above. Then run `uname -a`, `cat /etc/os-release` and `whoami`. Write down which kernel version and which distro you have. You will refer back to this.

## Level 0: The shell, the terminal, and the filesystem

### Terminal versus shell

The **terminal** (or terminal emulator: Windows Terminal, GNOME Terminal, iTerm2, Alacritty) is just a window that draws characters and forwards keystrokes. The **shell** is the program running inside it that reads your commands, expands them, and starts processes. The default shell on nearly every distro is **bash**; zsh and fish are popular alternatives. Scripts in this guide use bash.

A command line has a simple anatomy:

```bash
ls -l --human-readable /var/log
#^  ^  ^                ^
#|  |  long option      argument
#|  short option
#command
```

Keys that save hours: **Tab** completes commands and paths (press twice to list options), **Ctrl+R** searches history, **Ctrl+C** interrupts, **Ctrl+D** sends end-of-input (logs out of an empty shell), **Ctrl+L** clears the screen, **Ctrl+A / Ctrl+E** jump to start / end of line, and `!!` repeats the last command (`sudo !!` is a classic).

### Getting help

Before you search the web, ask the system. `man ls` opens the manual page (press `/` to search, `q` to quit). `ls --help` prints a quick summary. `man -k keyword` (or `apropos`) searches all man page descriptions. `type cd` tells you whether something is a builtin, alias, or file. `tldr` (installable) gives short example-driven pages and is great for beginners.

### Everything is a file

Linux presents one single directory tree starting at `/` (root). There are no drive letters; other disks are **mounted** at directories inside the tree. The **Filesystem Hierarchy Standard (FHS)** says what goes where, and once you know it you can find your way around any distro.

![Tree of top-level directories under root with a one-line purpose for each](study/linux-zero-to-master/fhs-tree.svg "The FHS: config lives in /etc, variable data in /var, virtual views in /proc and /sys")

The phrase **"everything is a file"** means the kernel exposes many things through the same open/read/write interface as regular files. `/dev/nvme0n1` is your disk, `/dev/null` swallows whatever you write to it, `/dev/urandom` produces random bytes, `/proc/cpuinfo` describes your CPUs, and `/sys/class/net/` lists network interfaces. Because the interface is uniform, the same small tools (`cat`, `echo`, `grep`) work on all of them:

```bash
cat /proc/loadavg              # kernel data as text
head -c 16 /dev/urandom | xxd  # random bytes from a device
echo "hello" > /dev/null       # discarded
ls -l /dev/sda /dev/null       # 'b' = block device, 'c' = character device
```

Two more directories deserve a note. Most modern distros have **merged `/usr`**: `/bin`, `/sbin` and `/lib` are symlinks into `/usr`. And your personal configuration lives as **dotfiles** in your home directory (`~/.bashrc`, `~/.ssh/`, `~/.config/`), hidden from plain `ls` because their names start with a dot.

> **EXERCISE:** Walk the tree. Run `ls /`, then `ls -l /bin` to see whether it is a symlink on your distro. Read `/etc/hostname` and `/etc/os-release`. Find how much RAM you have using only `/proc/meminfo`. Find the name of your network interfaces in `/sys/class/net`.

## Level 1: Navigating and manipulating files

### Moving around

```bash
pwd                  # print working directory
cd /var/log          # absolute path (starts with /)
cd ../..             # relative path: up two levels
cd ~                 # home (also plain `cd`)
cd -                 # back to previous directory
ls -la               # long listing, including dotfiles
ls -lhS              # human sizes, sorted by size
ls -lt | head        # newest first
tree -L 2            # visual tree (install `tree` if missing)
```

`.` is the current directory and `..` is the parent. Paths are case-sensitive: `Readme.md` and `README.md` are different files.

### Creating, copying, moving, deleting

```bash
mkdir -p projects/demo/src     # -p: create parents, no error if exists
touch notes.txt                # create empty file or update timestamp
cp notes.txt backup.txt
cp -r projects/ projects-bak/  # -r: recursive for directories
cp -a src/ dst/                # -a: archive, preserves perms, times, links
mv backup.txt old/             # move (also how you rename)
rm file.txt
rm -r old/                     # delete a directory tree
rmdir emptydir
ln -s /var/log/nginx logs      # symbolic link named "logs"
```

> **WARNING:** There is no recycle bin. `rm -rf` deletes immediately and recursively without asking. Never run it with a variable you have not checked (`rm -rf "$DIR/"` with an empty `$DIR` becomes `rm -rf /`), and never paste it from the internet without reading it. Use `rm -ri` while you are learning.

### Reading files

`cat` dumps a file, `less` pages through it (`/` search, `n` next match, `G` end, `q` quit), `head -n 20` and `tail -n 20` show the ends, and `tail -f` follows a file as it grows, which is how you watch logs live. `wc -l` counts lines. `file mystery.bin` guesses a file's type from its content, not its extension, because Linux does not care about extensions.

### Links, inodes, and globbing

A file's data and metadata live in an **inode**; a filename is just a directory entry pointing to an inode. A **hard link** (`ln a b`) is a second name for the same inode, and the data survives until the last name is removed. A **symbolic link** (`ln -s`) is a small file containing a path, which can dangle if the target disappears. `ls -li` shows inode numbers.

The shell expands **globs** before the command even runs: `*.log` (any characters), `file?.txt` (one character), `[abc]*` (character class), `{jpg,png}` (brace expansion, bash-specific). Run `echo *.log` to see what a glob expands to before you hand it to `rm`.

### Editors

You must be able to edit a file on a server with no GUI. `nano` is friendly (shortcuts shown at the bottom, Ctrl+O save, Ctrl+X exit). `vim` is everywhere and worth learning eventually: `i` to insert, `Esc` to stop, `:wq` to save and quit, `:q!` to quit without saving. Run `vimtutor` for a 30-minute interactive lesson.

> **EXERCISE:** In your home directory, build `lab/{a,b,c}/` with one `mkdir -p` and brace expansion. Create `lab/a/notes.txt` with nano, copy it into `b` preserving attributes, make a symlink in `c` pointing to it, then delete the original. What does `cat lab/c/notes.txt` do now, and what does `ls -l lab/c` show? Now repeat with a hard link and explain the difference.

## Level 1: Permissions, users, groups, and sudo

### Users and groups

Linux is multi-user from the ground up. Every process runs as some **user** (identified by a numeric UID) and a set of **groups** (GIDs). `root` is UID 0 and bypasses permission checks. Services usually run as dedicated low-privilege users (`www-data`, `nginx`, `postgres`), so a compromised web server cannot read everyone's files.

```bash
id                          # your uid, gid, groups
getent passwd alice         # user record (from /etc/passwd or LDAP etc.)
sudo useradd -m -s /bin/bash alice   # -m create home dir
sudo passwd alice
sudo usermod -aG docker alice        # -a APPEND to supplementary groups
sudo groupadd devs
sudo userdel -r alice                # -r also remove home
```

User records live in `/etc/passwd`, password hashes in `/etc/shadow` (readable only by root), groups in `/etc/group`. On Debian and Ubuntu, `adduser` is a friendlier interactive wrapper around `useradd`.

> **WARNING:** `usermod -G docker alice` without `-a` *replaces* all of alice's supplementary groups with just `docker`, which can lock her out of sudo. Always use `-aG`. Group changes apply to new login sessions; log out and back in (or run `newgrp`).

### Reading permissions

Run `ls -l deploy.sh` and you get `-rwxr-x--- 1 alice devs 812 Sep 19 10:00 deploy.sh`. The first character is the type (`-` file, `d` directory, `l` symlink, `b`/`c` devices, `s` socket, `p` pipe). The next nine are three triplets for **user** (owner), **group**, and **other**.

![The mode string -rwxr-x--- split into type and three triplets, converted to octal 750](study/linux-zero-to-master/permission-bits.svg "Each triplet is three bits: r=4, w=2, x=1, so rwxr-x--- is 750")

The kernel checks in order: if you are the owner, only the user triplet applies; else if you are in the group, only the group triplet applies; else "other". Note the directory semantics, which trip up everyone: to delete a file you need `w` on the **directory**, not on the file. And `x` on a directory is what lets you traverse it, so a directory with `r` but no `x` lets you list names but not open anything inside.

```bash
chmod 750 deploy.sh           # octal: rwx r-x ---
chmod u+x,g-w,o= script.sh    # symbolic: add, remove, set exactly
chmod -R g+rX shared/         # capital X: execute only on dirs (and already-executable files)
sudo chown alice:devs report.pdf
sudo chown -R www-data: /var/www/site   # "user:" means user and their login group
```

### umask, special bits, and ACLs

New files are created with mode 666 and directories with 777, minus the **umask**. A umask of `022` gives 644 files and 755 directories; `077` gives private 600/700. Run `umask` to see yours; distros using per-user private groups often default to `002`.

Three special bits sit in front of the triplets:

- **setuid (4)** on an executable: it runs as the file's owner. That is how `passwd` (owned by root) can write `/etc/shadow`. `ls` shows `s` in the user x slot. Setuid binaries are prime attack targets, so audit them with `find / -perm -4000 -type f 2>/dev/null`.
- **setgid (2)** on a directory: new files inherit the directory's group, which is ideal for shared team folders (`chmod 2775 /srv/shared`).
- **sticky (1)** on a directory: only a file's owner can delete it, even if others have `w` on the directory. `/tmp` is `1777` (`drwxrwxrwt`).

When owner/group/other is too coarse, **POSIX ACLs** add per-user rules: `setfacl -m u:bob:rw report.pdf`, inspect with `getfacl`. A trailing `+` in `ls -l` output means an ACL is present.

### sudo

Do not log in as root. Use `sudo` to run single commands as root; it checks that you are in the admin group (`sudo` on Debian/Ubuntu, `wheel` on Fedora/RHEL/Arch), asks for *your* password, and logs the command. Edit its rules only with `sudo visudo` (or a file in `/etc/sudoers.d/` via `visudo -f`), which syntax-checks before saving, because a broken sudoers file can lock you out. `sudo -i` gives a root login shell when you truly need one. Ubuntu 25.10 and later ship **sudo-rs**, a memory-safe Rust rewrite; the command-line interface is the same.

> **EXERCISE:** Create users `ann` and `ben` and a group `team`. Make `/srv/team` owned by `root:team` with mode `2770`, add both users to `team`, and verify with `sudo -u ann touch /srv/team/a` that files inherit the group. Then add the sticky bit and prove that `ben` can no longer delete `ann`'s file. Finally, explain why `chmod 644` on a directory makes it unusable.

## Level 2: Pipes, redirection, and the text toolbox

This is where Linux starts to feel like a superpower. The Unix philosophy is small tools that do one thing well, glued together with text streams.

### The three streams

Every process starts with three open file descriptors: **0 stdin**, **1 stdout**, **2 stderr**. By default all three are connected to your terminal. Redirection rewires them; a pipe connects one process's stdout to the next process's stdin.

![A process with stdin, stdout and stderr, and a four-stage pipeline where stderr bypasses the pipe](study/linux-zero-to-master/pipes-redirection.svg "Pipes carry stdout only; stderr goes to the terminal unless you redirect it")

```bash
cmd > out.txt          # stdout to file (truncate)
cmd >> out.txt         # stdout to file (append)
cmd 2> err.txt         # stderr to file
cmd > all.txt 2>&1     # both to file; order matters: redirect 1 first, then 2 to where 1 points
cmd &> all.txt         # bash shorthand for the same
cmd < input.txt        # stdin from file
cmd 2>/dev/null        # silence errors
cmd | tee log.txt      # show AND save
cmd1 | cmd2            # stdout of cmd1 -> stdin of cmd2
cmd1 |& cmd2           # bash: stdout and stderr into the pipe
diff <(sort a) <(sort b)   # process substitution: treat output as a file
```

A **here-document** feeds multi-line input: `cat <<'EOF' > config.ini` followed by lines and a closing `EOF`. Quoting the delimiter prevents variable expansion inside.

### The toolbox

| Tool | Does | Example |
|---|---|---|
| `grep` | Filter lines by pattern | `grep -rn "TODO" src/` |
| `cut` | Extract fields by delimiter | `cut -d: -f1 /etc/passwd` |
| `sort` | Sort lines | `sort -t, -k3 -n data.csv` |
| `uniq` | Collapse adjacent duplicates | `sort \| uniq -c` |
| `tr` | Translate or delete characters | `tr 'a-z' 'A-Z'` |
| `sed` | Stream editor: substitute, delete | `sed -i 's/foo/bar/g' f.txt` |
| `awk` | Field-aware mini language | `awk '$9 == 500 {print $7}' access.log` |
| `find` | Search the tree by name, size, time | `find . -name '*.log' -mtime +7` |
| `xargs` | Turn stdin into arguments | `find ... -print0 \| xargs -0 rm` |

Useful `grep` flags: `-i` ignore case, `-v` invert, `-r` recursive, `-n` line numbers, `-l` only filenames, `-c` count, `-w` whole words, `-o` only the match, `-E` extended regex (`grep -E 'error|fail'`), `-A 3 -B 3` context lines. `uniq` only merges *adjacent* duplicates, which is why it almost always follows `sort`.

`sed` is mostly used for substitution: `sed 's/old/new/g'` prints the changed stream, `sed -i.bak 's/old/new/g' file` edits in place and keeps a backup, `sed -n '10,20p'` prints a range, `sed '/^#/d'` deletes comment lines.

`awk` splits each line into fields `$1`, `$2`, ... (`$0` is the whole line, `NF` the number of fields, `NR` the line number) and runs pattern-action rules:

```bash
awk -F: '$3 >= 1000 {print $1}' /etc/passwd            # human users
awk '{sum += $10} END {print sum/1024/1024 " MB"}' access.log   # total bytes served
df -h | awk 'NR > 1 && $5+0 > 80 {print $6, $5}'       # filesystems over 80%
```

`find` combines tests with actions:

```bash
find /var/log -type f -name '*.gz' -mtime +30 -delete       # old compressed logs
find . -type f -size +100M -exec ls -lh {} +                # big files
find ~/code -name node_modules -type d -prune               # list, do not descend
find . -type f -name '*.jpg' -print0 | xargs -0 -P4 -n 20 jpegoptim   # 4 in parallel
```

Always pair `-print0` with `xargs -0` so filenames containing spaces or newlines survive.

### A worked scenario

Your web server is slow and you suspect a scraper. Which client IPs made the most requests that returned 404?

```bash
awk '$9 == 404 {print $1}' /var/log/nginx/access.log \
  | sort | uniq -c | sort -rn | head -10
```

Read it left to right: select lines where the status field is 404 and print the IP, sort so identical IPs are adjacent, count them, sort numerically in reverse, show the top ten. Each stage is trivial; the composition is powerful. Build pipelines one stage at a time, checking output as you go.

> **EXERCISE:** Using `/etc/passwd`, print the login shells in use and how many users have each, sorted by count. Then find every file in your home directory modified in the last 24 hours that is larger than 1 MB. Finally, replace every occurrence of `http://` with `https://` in all `.md` files under a test directory, keeping `.bak` backups.

## Level 2: Processes, signals, jobs, and systemd

### What a process is

A **process** is a running program: code, memory, open file descriptors, a current directory, environment variables, and a user identity. Each has a **PID** and a parent (**PPID**). New processes are created by `fork()` (clone the parent) followed by `exec()` (replace the clone's program). Your shell does exactly this for every command you type. PID 1 is the init system, the ancestor of everything.

![State machine: new, runnable, running, sleeping, stopped, zombie, gone, with a table of common signals](study/linux-zero-to-master/process-lifecycle.svg "Process states as shown in the ps STAT column, and the signals that move between them")

```bash
ps aux                       # every process, BSD-style columns
ps -ef --forest              # with parent/child tree
pstree -p                    # tree with PIDs
pgrep -a nginx               # find by name
top                          # live view (htop is nicer)
cat /proc/$$/status          # $$ = PID of your current shell
```

In `ps` output, the `STAT` column shows state: `R` running or runnable, `S` interruptible sleep (waiting for an event), `D` uninterruptible sleep (usually waiting on disk or network storage; cannot be killed until the I/O returns), `T` stopped, `Z` zombie. A **zombie** is a process that has exited but whose parent has not yet collected its exit status with `wait()`. Zombies use no memory, only a process table slot; the fix is the parent, not the zombie.

### Signals

Signals are small asynchronous notifications. `kill` sends them; the name is historical.

```bash
kill 1234              # SIGTERM (15): please shut down cleanly
kill -HUP 1234         # SIGHUP (1): many daemons reload config
kill -9 1234           # SIGKILL: cannot be caught; last resort
pkill -f 'python app.py'   # by command line match
killall firefox
```

Always try `SIGTERM` first. `SIGKILL` gives the program no chance to flush buffers, remove lock files, or finish transactions. `SIGKILL` and `SIGSTOP` are the only two signals a process cannot catch or ignore.

### Jobs

The shell can juggle several processes. Append `&` to run in the background. **Ctrl+Z** stops the foreground job (sends `SIGTSTP`); `bg` resumes it in the background, `fg` brings it back, `jobs` lists them. A background job still dies when you close the terminal (it gets `SIGHUP`) unless you use `nohup cmd &` or `disown`. For anything long-running on a remote server, use **tmux** (or screen): detach with `Ctrl+B d`, reconnect later with `tmux attach`.

Priority is controlled by **niceness**, from -20 (greedy) to 19 (polite): `nice -n 10 ./backup.sh`, `renice 15 -p 1234`. Only root can lower niceness.

### systemd

On virtually every mainstream distro, PID 1 is **systemd**. It starts services in dependency order, restarts them when they crash, captures their logs, and manages much more (mounts, timers, sockets, network, DNS resolution). The unit of work is a **unit**: `nginx.service`, `data.mount`, `backup.timer`, `multi-user.target`.

```bash
systemctl status nginx
sudo systemctl start|stop|restart|reload nginx
sudo systemctl enable --now nginx    # start at boot AND now
sudo systemctl disable nginx
sudo systemctl mask nginx            # make it impossible to start
systemctl --failed                   # what is broken
systemctl list-units --type=service
systemctl cat nginx                  # show the unit file(s)
```

Writing your own service is short. Create `/etc/systemd/system/myapp.service`:

```ini
[Unit]
Description=My API
After=network-online.target
Wants=network-online.target

[Service]
User=myapp
WorkingDirectory=/opt/myapp
ExecStart=/opt/myapp/bin/server --port 8080
Restart=on-failure
RestartSec=5
Environment=APP_ENV=production

[Install]
WantedBy=multi-user.target
```

Then `sudo systemctl daemon-reload && sudo systemctl enable --now myapp`. You get automatic restarts, logging, and boot-time startup without writing a single shell wrapper. To change a packaged unit, use `sudo systemctl edit nginx`, which creates a drop-in override instead of editing the vendor file.

### journalctl

systemd's journal collects logs from the kernel, services and anything writing to stdout/stderr under systemd.

```bash
journalctl -u nginx              # one unit
journalctl -u nginx -f           # follow live
journalctl -b                    # this boot; -b -1 = previous boot
journalctl -p err -b             # priority err and worse
journalctl --since "1 hour ago" --until "10 min ago"
journalctl -k                    # kernel messages (like dmesg)
journalctl --disk-usage
sudo journalctl --vacuum-time=14d
```

> **EXERCISE:** Start `sleep 1000` in the foreground, stop it with Ctrl+Z, list it with `jobs`, resume it in the background, and find it with `pgrep -a sleep`. Kill it with SIGTERM. Then write a systemd service that runs `python3 -m http.server 8000` as your user, enable it, confirm with `curl localhost:8000`, kill the Python process with `kill -9`, and watch systemd restart it in `journalctl -u` output.

## Level 3: Package management across families

Software on Linux is installed from **repositories**: signed collections of packages that the package manager downloads, verifies, and installs along with dependencies. This is safer than downloading installers from random websites, and it means one command updates *everything*.

| Task | Debian / Ubuntu | Fedora / RHEL | Arch |
|---|---|---|---|
| Refresh metadata | `apt update` | automatic (`dnf makecache`) | `pacman -Sy` (only with `-u`) |
| Upgrade everything | `apt upgrade` | `dnf upgrade` | `pacman -Syu` |
| Install | `apt install nginx` | `dnf install nginx` | `pacman -S nginx` |
| Remove | `apt remove` / `apt purge` | `dnf remove` | `pacman -Rns` |
| Search | `apt search term` | `dnf search term` | `pacman -Ss term` |
| Info | `apt show nginx` | `dnf info nginx` | `pacman -Si nginx` |
| Which package owns a file | `dpkg -S /usr/bin/ls` | `rpm -qf /usr/bin/ls` | `pacman -Qo /usr/bin/ls` |
| List a package's files | `dpkg -L nginx` | `rpm -ql nginx` | `pacman -Ql nginx` |
| Which package provides X | `apt-file search X` | `dnf provides X` | `pacman -F X` |
| Clean unused deps | `apt autoremove` | `dnf autoremove` | `pacman -Rns $(pacman -Qdtq)` |

Notes that save you pain:

- On Debian/Ubuntu, always `apt update` before installing, or you may get 404s for stale package versions. `apt purge` also removes config files.
- Fedora uses **dnf5** (a faster rewrite) since Fedora 41; commands are the same. RHEL and its rebuilds add software via extra repos such as EPEL.
- Arch is **rolling**: never run `pacman -Sy pkg` without `-u`. A partial upgrade can leave libraries mismatched and break the system. Read the Arch news before big upgrades. The AUR is community-maintained build scripts, not official packages, so read the PKGBUILD before building.
- openSUSE uses `zypper install`, `zypper dup` on Tumbleweed.

### Universal formats

**Flatpak** (dominant on desktops, via the Flathub repository) and **Snap** (Canonical's format, built into Ubuntu) bundle an app with its dependencies and run it sandboxed. They are great for desktop apps that want newer versions than your distro ships: `flatpak install flathub org.gimp.GIMP`, `snap install code --classic`. **AppImage** is a single executable file with no installation. For servers, you will mostly use distro packages and containers instead.

> **TIP:** Automate security updates on servers: `unattended-upgrades` on Debian/Ubuntu, `dnf-automatic` on Fedora/RHEL. A patched system beats a clever firewall.

> **EXERCISE:** Install `htop`, `tree`, and `jq` with your distro's package manager. Find which package owns `/usr/bin/ssh`. List the files installed by `jq`. If you have a second family available (a WSL Debian and a Fedora VM, say), do the same there and compare.

## Level 3: Networking and SSH

### Where am I on the network?

The modern tool is `ip` (from iproute2); `ifconfig` and `netstat` are deprecated and often not installed.

```bash
ip -br addr                  # brief: interfaces and IPs
ip route                     # routing table; "default via" is your gateway
ip link set eth0 up
ss -tulpn                    # listening TCP/UDP sockets with processes (sudo for all)
ss -tn state established     # current connections
resolvectl status            # DNS servers when systemd-resolved is in use
cat /etc/resolv.conf
```

Network configuration itself is distro-dependent: **NetworkManager** (`nmcli`) on desktops and Fedora/RHEL servers, **netplan** YAML on Ubuntu servers (which renders to systemd-networkd or NetworkManager), `/etc/network/interfaces` on classic Debian.

### Testing connectivity layer by layer

Troubleshoot bottom-up: link, IP, routing, DNS, port, application.

```bash
ping -c 3 1.1.1.1              # IP reachability (ICMP may be blocked)
ping -c 3 example.com          # adds DNS
dig +short example.com A       # DNS only (package: dnsutils / bind-utils)
dig @1.1.1.1 example.com       # ask a specific resolver
tracepath example.com          # or mtr for a live view
nc -zv example.com 443         # is the TCP port open?
curl -I https://example.com    # HTTP headers only
curl -v https://api.example.com/health   # full request/response, TLS details
curl -sS -o /dev/null -w '%{http_code} %{time_total}s\n' https://example.com
```

If `ping 1.1.1.1` works but `ping example.com` does not, it is DNS. If DNS resolves but `nc` to the port fails, it is a firewall or the service is down. `ss -tulpn` on the server tells you whether anything is listening, and on which address: a service bound to `127.0.0.1:8080` is unreachable from outside by design.

### SSH and keys

SSH gives you an encrypted shell on remote machines, and keys are both safer and more convenient than passwords.

```bash
ssh-keygen -t ed25519 -C "you@laptop"     # creates ~/.ssh/id_ed25519 and .pub
ssh-copy-id user@server                   # appends .pub to server's ~/.ssh/authorized_keys
ssh user@server
scp file.txt user@server:/tmp/
rsync -avz --progress site/ user@server:/var/www/site/
ssh -L 5432:localhost:5432 user@server    # local port forward: reach remote Postgres
ssh -J bastion user@internal              # jump through a bastion host
```

Put per-host settings in `~/.ssh/config` so `ssh web` just works:

```text
Host web
    HostName 203.0.113.10
    User deploy
    IdentityFile ~/.ssh/id_ed25519
```

The private key never leaves your machine; protect it with a passphrase and `ssh-agent`. Permissions matter: `~/.ssh` should be `700` and private keys `600`, or SSH refuses to use them.

### Firewalls

The kernel's packet filter is **netfilter**, configured today through **nftables** (`nft`). The legacy `iptables` command still exists on most distros as a compatibility layer over nftables. Most people use a friendlier front end:

```bash
# Ubuntu/Debian: ufw
sudo ufw default deny incoming
sudo ufw allow OpenSSH           # do this BEFORE enabling, or you lock yourself out
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose

# Fedora/RHEL: firewalld
sudo firewall-cmd --add-service=https --permanent
sudo firewall-cmd --reload
sudo firewall-cmd --list-all

# What the kernel actually has loaded
sudo nft list ruleset
```

> **WARNING:** On a remote box, always allow SSH before enabling a default-deny firewall. On cloud VMs, remember there is often a second firewall (security group or VCN security list) in the provider's console, and both must allow the traffic.

> **EXERCISE:** On your cloud VM or a second local VM, generate an ed25519 key, install it with `ssh-copy-id`, and add a `~/.ssh/config` alias. Install nginx, confirm it listens with `ss -tlnp`, reach it with `curl` from the other machine, then block port 80 in the firewall and observe what `curl` and `nc -zv` report.

## Level 3: Storage, filesystems, and LVM

### Seeing your disks

```bash
lsblk -f            # block devices, partitions, filesystems, mountpoints
sudo blkid          # UUIDs and filesystem types
df -h               # free space per mounted filesystem
df -i               # free inodes (you can run out with space left!)
du -sh /var/*       # size of each directory
du -xh / 2>/dev/null | sort -h | tail -20   # biggest dirs on the root fs
findmnt             # mount tree
```

Device names: `/dev/sda`, `/dev/sdb` for SATA/SCSI/USB disks, `/dev/nvme0n1` for NVMe, `/dev/vda` for virtio disks in VMs. Partitions add a number (`sda1`, `nvme0n1p1`). Because names can change between boots, configuration should refer to filesystems by **UUID**.

### Partition, format, mount

Suppose you attached a new empty 50 GB disk at `/dev/vdb`:

```bash
sudo parted /dev/vdb --script mklabel gpt mkpart data ext4 1MiB 100%
sudo mkfs.ext4 -L data /dev/vdb1
sudo mkdir -p /data
sudo mount /dev/vdb1 /data
```

That mount disappears on reboot. To make it permanent, add a line to `/etc/fstab` using the UUID from `blkid`:

```text
UUID=3f1c...-e9a2  /data  ext4  defaults,nofail  0  2
```

Fields: what, where, filesystem type, options, dump (legacy, 0), fsck order (1 for root, 2 for others, 0 to skip). `nofail` keeps the system booting if the disk is missing. Test before rebooting with `sudo findmnt --verify` and `sudo mount -a`; a broken fstab can drop you into emergency mode.

Common filesystems: **ext4** (default on Debian/Ubuntu, rock solid), **XFS** (default on RHEL, great for large files and parallel I/O, cannot shrink), **Btrfs** (default on Fedora desktop and openSUSE, copy-on-write with snapshots, compression and subvolumes). Swap can be a partition or a swap file (`fallocate`, `mkswap`, `swapon`).

### LVM: flexible storage

**Logical Volume Manager** adds a layer between disks and filesystems so you can grow volumes, span disks, and take snapshots. Three concepts: **physical volumes** (PVs, disks or partitions), pooled into **volume groups** (VGs), carved into **logical volumes** (LVs) that you format and mount.

```bash
sudo pvcreate /dev/vdb /dev/vdc
sudo vgcreate vg_data /dev/vdb /dev/vdc
sudo lvcreate -n lv_app -L 30G vg_data
sudo mkfs.xfs /dev/vg_data/lv_app
# later, when it fills up:
sudo lvextend -r -L +10G /dev/vg_data/lv_app   # -r also grows the filesystem
sudo pvs; sudo vgs; sudo lvs                    # summaries
```

The `-r` flag is the key trick: it resizes the filesystem along with the volume, online, with no downtime. Many server installers (RHEL, Ubuntu Server's default guided layout) use LVM for exactly this reason.

> **EXERCISE:** In a VM, add two small virtual disks. Create an LVM volume group across both, a 1 GB logical volume, format it ext4, mount it at `/mnt/lab` via an fstab entry by UUID, and reboot to prove it persists. Then grow it by 500 MB with `lvextend -r` while a file is open on it, and confirm with `df -h`.

## Level 4: Bash scripting and scheduling

When you type the same five commands twice, write a script. Bash is not a great programming language, but it is the universal glue of Linux administration.

### The essentials

```bash
#!/usr/bin/env bash
set -euo pipefail          # strict mode (explained below)

name="world"               # no spaces around =
echo "Hello, ${name}"      # always quote expansions
files=$(ls /etc | wc -l)   # command substitution
count=$(( files * 2 ))     # arithmetic
readonly CONFIG=/etc/app.conf

if [[ -f "$CONFIG" ]]; then
  echo "config exists"
elif [[ -d /etc/app ]]; then
  echo "dir exists"
else
  echo "nothing" >&2       # errors to stderr
fi

for host in web1 web2 db1; do
  ping -c1 -W1 "$host" >/dev/null && echo "$host up" || echo "$host DOWN"
done

while read -r line; do
  echo "got: $line"
done < input.txt

greet() {
  local who="$1"           # function arguments are $1, $2 ...; $@ is all of them
  echo "hi $who"
  return 0
}
greet "Ann"
```

Useful tests inside `[[ ]]`: `-f` file exists, `-d` directory, `-x` executable, `-z` string empty, `-n` non-empty, `==` / `!=` string compare, `=~` regex, and for integers `-eq -ne -lt -gt`. Special variables: `$0` script name, `$#` argument count, `$?` exit status of the last command, `$$` current PID.

### Exit codes and strict mode

Every command returns an **exit status**: `0` means success, anything else means failure. `&&` runs the next command only on success, `||` only on failure. Your scripts should `exit 1` (or another non-zero code) when they fail, so callers, cron, and systemd can tell.

`set -euo pipefail` makes bash far less forgiving, which is what you want:

- `-e`: exit immediately when a command fails (with some exceptions, such as commands in `if` conditions).
- `-u`: treat unset variables as errors, so a typo like `$DRI` does not silently become empty.
- `-o pipefail`: a pipeline fails if *any* stage fails, not just the last one.

Add `trap cleanup EXIT` to always run a cleanup function, and check your scripts with **ShellCheck**, which catches quoting bugs and common pitfalls before they bite.

### A real, useful script

This backup script archives a directory, keeps the newest N archives, logs what it did, and fails loudly.

```bash
#!/usr/bin/env bash
# backup.sh - archive a directory and keep the newest N copies
set -euo pipefail

usage() { echo "usage: $0 -s SRC_DIR -d DEST_DIR [-k KEEP]" >&2; exit 2; }

KEEP=7
while getopts ":s:d:k:" opt; do
  case "$opt" in
    s) SRC="$OPTARG" ;;
    d) DEST="$OPTARG" ;;
    k) KEEP="$OPTARG" ;;
    *) usage ;;
  esac
done
[[ -n "${SRC:-}" && -n "${DEST:-}" ]] || usage
[[ -d "$SRC" ]] || { echo "source $SRC not found" >&2; exit 1; }
[[ "$KEEP" =~ ^[0-9]+$ ]] || { echo "KEEP must be a number" >&2; exit 2; }

mkdir -p "$DEST"
stamp=$(date +%Y%m%d-%H%M%S)
name="$(basename "$SRC")-${stamp}.tar.gz"
tmp=$(mktemp "${DEST}/.partial.XXXXXX")
trap 'rm -f "$tmp"' EXIT          # never leave half-written archives behind

log() { logger -t backup "$*"; echo "$(date -Is) $*"; }

log "archiving $SRC"
tar -czf "$tmp" -C "$(dirname "$SRC")" "$(basename "$SRC")"
mv "$tmp" "${DEST}/${name}"
log "wrote ${DEST}/${name} ($(du -h "${DEST}/${name}" | cut -f1))"

# rotation: list newest first, delete everything after the first $KEEP
mapfile -t old < <(ls -1t "$DEST"/"$(basename "$SRC")"-*.tar.gz | tail -n +"$((KEEP + 1))")
for f in "${old[@]}"; do
  rm -f -- "$f"
  log "rotated out $f"
done
```

Why the details matter: writing to a temp file and then `mv` makes the new archive appear atomically; the `trap` removes partial files if `tar` fails; `logger` sends messages to the journal so you can later run `journalctl -t backup`; `--` protects `rm` from filenames beginning with `-`. Make it executable with `chmod +x backup.sh`.

### Scheduling: cron and systemd timers

**cron** is the classic scheduler. Edit your user's table with `crontab -e`; the five time fields are minute, hour, day of month, month, day of week.

```text
# m  h  dom mon dow  command
30   2  *   *   *    /usr/local/bin/backup.sh -s /srv/app -d /backups >> /var/log/backup.log 2>&1
*/15 *  *   *   1-5  /usr/local/bin/healthcheck.sh
```

Cron runs with a minimal environment (a short `PATH`, no aliases), so use absolute paths and redirect output, or failures vanish silently.

**systemd timers** are the modern alternative: logs land in the journal, runs can be catch-up (`Persistent=true` runs a missed job after the machine was off), and you can add resource limits. You need two files. `/etc/systemd/system/backup.service`:

```ini
[Unit]
Description=Nightly app backup

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh -s /srv/app -d /backups -k 14
```

And `/etc/systemd/system/backup.timer`:

```ini
[Unit]
Description=Run backup nightly

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true
RandomizedDelaySec=10min

[Install]
WantedBy=timers.target
```

Enable with `sudo systemctl enable --now backup.timer`, check with `systemctl list-timers`, and validate calendar expressions with `systemd-analyze calendar "Mon..Fri 09:00"`.

> **EXERCISE:** Run the backup script by hand against a test directory with `-k 3`, run it five times, and confirm only three archives remain. Break it on purpose (a nonexistent source) and check the exit code with `echo $?`. Then schedule it with a systemd timer every five minutes (`OnCalendar=*:0/5`) and read its output with `journalctl -u backup.service`.

## Level 4: Logs, troubleshooting, performance, and hardening

### Where the logs are

The journal (`journalctl`) is the first stop. Many distros also keep text logs under `/var/log`: `syslog` or `messages` (general), `auth.log` or `secure` (logins, sudo), and application logs such as `/var/log/nginx/`. `dmesg -T` shows the kernel ring buffer with readable timestamps: hardware errors, driver messages, and the out-of-memory killer (`dmesg -T | grep -i 'killed process'`). Old logs are rotated and compressed by `logrotate`; `zgrep` searches `.gz` files directly.

### A troubleshooting method

Random command-guessing wastes hours. Use a method:

1. **Define the symptom precisely.** "The site is slow" becomes "p95 latency for /api went from 80 ms to 2 s at 14:05".
2. **Check what changed.** Deploys, package upgrades (`/var/log/apt/history.log`, `dnf history`), config edits, certificate expiry, disk filling up.
3. **Check resources with the USE method** (Brendan Gregg): for each resource (CPU, memory, disk, network), look at **U**tilization, **S**aturation, and **E**rrors.
4. **Read the logs** around the time of the symptom: `journalctl --since "14:00" --until "14:10"`.
5. **Form one hypothesis, test it, change one thing at a time**, and write down what you did.

The first 60 seconds on a misbehaving box often look like this: `uptime`, `dmesg -T | tail`, `vmstat 1 5`, `free -h`, `df -h`, `iostat -xz 1 3`, `ss -s`, `top`, `systemctl --failed`, `journalctl -p err -b`.

### Performance tools and load average explained

`top` and the friendlier `htop` show per-process CPU and memory, sortable. `btop` is a prettier option. But you should understand the numbers underneath.

**Load average** (from `uptime` or `/proc/loadavg`) is three exponentially damped averages over 1, 5, and 15 minutes of the number of tasks that are **runnable** (running or waiting for a CPU) **plus tasks in uninterruptible sleep** (state `D`, usually waiting on disk). That last part is Linux-specific and important: a high load with idle CPUs usually means processes are stuck on I/O, often slow or hung storage such as an unresponsive NFS mount. Interpret load relative to CPU count (`nproc`): a load of 8 on a 16-core machine is fine; on a 2-core machine, work is queuing.

```bash
vmstat 1        # r = runnable, b = blocked (D); si/so = swap in/out; us sy id wa st = CPU split
iostat -xz 1    # per-disk: r/s w/s, await (ms per I/O), %util (from the sysstat package)
free -h         # look at "available", not "free"
pidstat 1       # per-process CPU over time (sysstat)
cat /proc/pressure/cpu /proc/pressure/memory /proc/pressure/io   # PSI: time stalled on each resource
```

About memory: Linux deliberately uses spare RAM as **page cache** for file data, so "free" is often near zero on a healthy machine. The `available` column estimates how much can be handed to applications without swapping, and that is the number to watch. Sustained non-zero `si`/`so` in `vmstat` means you are actually short of RAM. When memory truly runs out, the kernel's **OOM killer** picks a process to kill, which shows up in `dmesg`.

In `vmstat`, a high `wa` (iowait) means CPUs are idle while waiting on I/O; high `st` (steal) on a VM means the hypervisor is giving your CPU time to other tenants.

### Security hardening basics

Security is mostly boring discipline. For any internet-facing server:

- **Patch.** Enable automatic security updates and reboot for kernel updates (or use live patching where available).
- **SSH:** keys only. In `/etc/ssh/sshd_config` (or a file in `/etc/ssh/sshd_config.d/`) set `PasswordAuthentication no` and `PermitRootLogin no` (or `prohibit-password`), then `sudo sshd -t` to validate and restart the service (`ssh` on Debian/Ubuntu, `sshd` on Fedora/RHEL). Keep a second session open while you test, so a mistake cannot lock you out.
- **Firewall:** default deny inbound, open only what you serve.
- **Minimize:** remove packages and stop services you do not need; check listeners with `ss -tulpn`.
- **Least privilege:** run services as dedicated users; give humans sudo only where needed; audit setuid binaries.
- **Keep the MAC layer on.** SELinux (Fedora/RHEL) and AppArmor (Ubuntu/Debian/SUSE) confine services even when they are compromised. When something is denied, read the audit log (`ausearch -m avc` on SELinux) and fix the policy or labels rather than disabling it.
- **Brute-force protection:** `fail2ban` bans IPs that repeatedly fail authentication.
- **systemd sandboxing** for your own services: `NoNewPrivileges=yes`, `ProtectSystem=strict`, `ProtectHome=yes`, `PrivateTmp=yes`. `systemd-analyze security myapp` scores a unit's exposure.
- **Backups you have tested restoring.** Ransomware and `rm -rf` do not care about your firewall.

> **EXERCISE:** Run `stress-ng --cpu 4 --timeout 60s` (or `yes > /dev/null &` a few times) and watch `uptime`, `vmstat 1` and `htop` react; then do the same with `stress-ng --io 4`. Explain which columns moved and why. Then harden your cloud VM: key-only SSH, firewall, automatic updates, and confirm with `systemd-analyze security` on your own service from Level 2.

## Level 5: Under the hood

At this level you stop treating Linux as a black box. Everything here is about seeing what the kernel is doing and why.

### Reading /proc

`/proc` is the kernel talking to you in text. Each running process has a directory `/proc/<pid>/`:

```bash
pid=$(pgrep -o nginx)
cat /proc/$pid/status            # state, UIDs, memory (VmRSS), threads, capabilities
tr '\0' ' ' < /proc/$pid/cmdline; echo   # exact command line (NUL-separated)
sudo ls -l /proc/$pid/fd         # every open file, socket and pipe
sudo cat /proc/$pid/limits       # ulimits in effect
sudo cat /proc/$pid/maps         # memory mappings: binary, libraries, heap, stack
cat /proc/meminfo /proc/loadavg /proc/cmdline
sysctl net.ipv4.ip_forward       # same as cat /proc/sys/net/ipv4/ip_forward
```

A classic trick: a deleted log file that a process still holds open keeps using disk space, which is why `df` says the disk is full while `du` cannot find the space. `sudo ls -l /proc/*/fd 2>/dev/null | grep deleted` (or `lsof +L1`) finds the culprit; restart or signal that process to release it. Tunables under `/proc/sys` are set persistently with files in `/etc/sysctl.d/`.

### strace: watching system calls

`strace` shows every system call a process makes, which answers questions no log will: which config file is it actually reading? Why does it hang?

```bash
strace -f -e trace=openat,execve ls /tmp    # which files and programs, following children
strace -c -f ./slow-script.sh               # summary: count and time per syscall
sudo strace -p 1234 -tt -T                  # attach to a running process; timestamps and durations
```

A process stuck in `read(5, ...` or `futex(...` tells you it is waiting on a descriptor or a lock; `ls -l /proc/1234/fd/5` tells you what descriptor 5 is. Note that `strace` slows the traced program significantly, so be careful on production hot paths.

### perf and eBPF

`perf` samples what CPUs are executing, with very low overhead:

```bash
sudo perf top                          # live hottest functions, system-wide
sudo perf record -g -p 1234 -- sleep 30
sudo perf report                       # call graph of where time went
sudo perf stat -e cycles,instructions,cache-misses ./program
```

Turn `perf record -g` output into **flame graphs** to see at a glance which code paths burn CPU.

**eBPF** lets you run small, verified programs inside the kernel, attached to events such as syscalls, function entries, network packets, or scheduler events, and aggregate results in kernel before sending them to user space. It powers modern observability, networking (Cilium) and security tools. You can use it without writing any C:

```bash
# Every file opened, and by whom
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_openat { printf("%s %s\n", comm, str(args.filename)); }'

# Histogram of read() sizes per process
sudo bpftrace -e 'tracepoint:syscalls:sys_exit_read /args.ret > 0/ { @[comm] = hist(args.ret); }'
```

The BCC tool collection ships ready-made tools such as `execsnoop` (every new process), `opensnoop`, `biolatency` (disk latency histogram) and `tcpconnect`. On Debian/Ubuntu they are installed with a `-bpfcc` suffix (for example `execsnoop-bpfcc`).

### Containers under the hood

A container is not a VM. It is an ordinary Linux process with two kernel features applied:

- **Namespaces** give it a private view of the system. There are eight kinds: `pid` (own PID numbering, so the app is PID 1), `net` (own interfaces, routes, ports), `mnt` (own mount table and root filesystem), `uts` (own hostname), `ipc`, `user` (UID mapping, so root inside can be an unprivileged user outside), `cgroup`, and `time`.
- **cgroups (v2)** limit and account resources: `memory.max`, `cpu.max`, `pids.max`, `io.max`. All mainstream distros now use the unified cgroup v2 hierarchy mounted at `/sys/fs/cgroup`.

Add a layered root filesystem (**overlayfs** stacking read-only image layers under a writable layer), a set of dropped **capabilities**, and a **seccomp** filter restricting syscalls, and you have a container.

![Two containers with their own namespaces and overlay rootfs, cgroup limits, one shared kernel, and the docker/podman tool chain](study/linux-zero-to-master/container-model.svg "Namespaces limit what a process sees, cgroups limit what it uses, and every container shares the host kernel")

Docker's CLI talks to `dockerd`, which delegates to **containerd**, which calls an OCI runtime such as **runc** to make the actual `clone()` and cgroup calls. **Podman** is daemonless: it forks the runtime (`crun` by default on Fedora/RHEL, or `runc`) directly, with `conmon` supervising each container, and it runs rootless by default using user namespaces. The consequence of the shared kernel: containers start in milliseconds and cost almost nothing, but a kernel vulnerability can affect all of them, and you cannot run a Windows or different-kernel workload in a Linux container.

You can build one with your bare hands:

```bash
# new PID, mount, UTS namespaces, as an unprivileged user mapped to root
unshare --user --map-root-user --pid --fork --mount-proc --uts bash
hostname sandbox && hostname     # changes only inside
ps aux                           # bash is PID 1; host processes are invisible
exit

lsns                             # list namespaces on the host
systemd-cgls                     # cgroup tree
sudo systemd-run --scope -p MemoryMax=200M -p CPUQuota=50% stress-ng --vm 1 --vm-bytes 500M
```

The last command runs a process in a transient cgroup; watch it get OOM-killed at 200 MB. That is exactly what `docker run --memory 200m` does.

### The boot process

![Six boot stages from UEFI firmware through bootloader, kernel, initramfs and systemd to the default target](study/linux-zero-to-master/boot-sequence.svg "From firmware to login: each stage loads the next, and systemd-analyze shows where the time went")

1. **Firmware (UEFI)** initializes hardware and runs a bootloader `.efi` file from the EFI System Partition (a small FAT partition, usually mounted at `/boot/efi` or `/efi`). Secure Boot verifies signatures along this chain.
2. **The bootloader** (GRUB 2 on most distros, systemd-boot on some) shows a menu, loads the kernel image (`vmlinuz`) and the **initramfs**, and passes the kernel command line (`root=UUID=... ro quiet`). Some distros now boot **Unified Kernel Images (UKIs)** that bundle kernel, initramfs, and command line into one signed EFI binary.
3. **The kernel** initializes CPUs, memory management, and built-in drivers, then unpacks the initramfs into memory as a temporary root.
4. **The initramfs** contains just enough to find the real root: storage and filesystem modules, LVM/RAID assembly, LUKS decryption prompts. It mounts the real root and switches to it.
5. **systemd (PID 1)** takes over, mounts filesystems from fstab, and starts units in parallel according to their dependencies.
6. It reaches the **default target** (`systemctl get-default`): `multi-user.target` on servers, `graphical.target` on desktops, and you get a login prompt.

Diagnose boots with `systemd-analyze` (total time), `systemd-analyze blame` and `systemd-analyze critical-chain`, and `journalctl -b`. If a system will not boot, edit the entry in the GRUB menu (press `e`) and append `systemd.unit=rescue.target` or `emergency.target` to the kernel line to get a minimal shell.

### Kernel modules

Most drivers are **loadable modules** (`.ko` files under `/lib/modules/$(uname -r)/`), loaded on demand when hardware is detected.

```bash
lsmod                          # loaded modules
modinfo e1000e                 # description, parameters, dependencies
sudo modprobe br_netfilter     # load (with dependencies)
sudo modprobe -r pcspkr        # unload
echo br_netfilter | sudo tee /etc/modules-load.d/k8s.conf    # load at every boot
echo "blacklist pcspkr" | sudo tee /etc/modprobe.d/nobeep.conf
```

After changing module configuration that is needed early in boot, regenerate the initramfs (`update-initramfs -u` on Debian/Ubuntu, `dracut -f` on Fedora/RHEL, `mkinitcpio -P` on Arch). With Secure Boot on, third-party modules (for example, out-of-tree GPU drivers) must be signed or they will not load.

### Compiling a kernel (overview)

You will rarely need a custom kernel in production, but building one once demystifies it:

```bash
# Debian/Ubuntu build dependencies (names differ on other distros)
sudo apt install build-essential bc flex bison libelf-dev libssl-dev libncurses-dev dwarves
# get a stable release tarball from kernel.org, then:
tar xf linux-*.tar.xz && cd linux-*/
cp /boot/config-"$(uname -r)" .config   # start from your distro's config
make olddefconfig                       # accept defaults for new options
make localmodconfig                     # optional: only modules currently loaded (much faster build)
make menuconfig                         # optional: browse and tweak options
make -j"$(nproc)"
sudo make modules_install
sudo make install                       # installs kernel, usually regenerates initramfs and bootloader entries
```

Reboot and pick the new kernel from the menu; `uname -r` confirms it. Keep your distro kernel installed as a fallback. On Debian-based systems, `make bindeb-pkg` builds proper `.deb` packages instead, which are easier to remove later.

> **EXERCISE:** (1) Use `strace -f -e trace=openat` on `bash -c 'echo hi'` and list every config file bash reads at startup. (2) Build a namespace sandbox with `unshare` and prove that `ps` and `hostname` are isolated. (3) Run `systemd-analyze critical-chain` and find the slowest unit on your boot path. (4) Use `bpftrace` or `execsnoop` to catch every process started while you run `apt update` or `dnf check-update`. (5) Stretch goal: build and boot your own kernel in a VM, with a custom `CONFIG_LOCALVERSION` so you can recognize it in `uname -r`.

## Cheat sheet

```text
HELP        man cmd | cmd --help | man -k word | type cmd | tldr cmd
NAVIGATE    pwd  cd -  ls -lah  tree -L 2  find . -name '*.x'
FILES       cp -a  mv  rm -ri  mkdir -p  ln -s TARGET NAME  less  tail -f
PERMS       chmod 750 f | chmod u+x f | chown user:grp f | umask | setfacl -m u:bob:rw f
USERS       id | useradd -m -s /bin/bash u | usermod -aG grp u | sudo -i | visudo
STREAMS     > >> 2> 2>&1 &> < | |& tee  <(cmd)
TEXT        grep -rniE  cut -d: -f1  sort -rn  uniq -c  sed -i 's/a/b/g'  awk '{print $1}'
FIND+XARGS  find . -type f -mtime +7 -print0 | xargs -0 rm
PROCESSES   ps aux | pgrep -a x | kill -TERM pid | kill -9 pid | jobs fg bg | nice renice
SYSTEMD     systemctl status|start|enable --now|edit|cat UNIT | systemctl --failed
LOGS        journalctl -u UNIT -f | -b -p err | --since "1h ago" | dmesg -T
PACKAGES    apt update && apt upgrade | dnf upgrade | pacman -Syu | flatpak install
NETWORK     ip -br a | ip r | ss -tulpn | dig +short | curl -v | nc -zv host port
SSH         ssh-keygen -t ed25519 | ssh-copy-id | ~/.ssh/config | ssh -L | ssh -J | rsync -avz
FIREWALL    ufw allow OpenSSH && ufw enable | firewall-cmd --add-service=X --permanent | nft list ruleset
STORAGE     lsblk -f | blkid | df -hT | du -sh * | mount | findmnt --verify | mkfs.ext4
LVM         pvcreate | vgcreate | lvcreate -L | lvextend -r -L +10G | pvs vgs lvs
SCRIPTING   #!/usr/bin/env bash ; set -euo pipefail ; "$quote" ; trap ... EXIT ; shellcheck
SCHEDULE    crontab -e (m h dom mon dow) | systemctl list-timers | OnCalendar= Persistent=true
PERF        uptime | vmstat 1 | iostat -xz 1 | free -h | htop | /proc/pressure/*
INTERNALS   /proc/PID/{status,fd,maps} | strace -f -c | perf top | bpftrace -e | lsns | systemd-cgls
BOOT        systemd-analyze blame | critical-chain | journalctl -b -1 | lsmod | modprobe
```

Rules of thumb worth memorizing: quote your variables, try SIGTERM before SIGKILL, allow SSH before enabling a firewall, test fstab with `findmnt --verify` before rebooting, watch "available" not "free" memory, compare load average to `nproc`, and never disable SELinux or AppArmor to make a problem go away.

## Where to go next

- **Practice daily.** Use Linux as your main environment for a month, even if only through WSL2. Nothing replaces muscle memory.
- **The Arch Wiki** (wiki.archlinux.org) is the best Linux documentation on the web, useful whatever distro you run.
- **Books:** *The Linux Command Line* by William Shotts (free online), *How Linux Works* by Brian Ward, *UNIX and Linux System Administration Handbook* by Nemeth et al., and *Systems Performance* plus *BPF Performance Tools* by Brendan Gregg for Level 5.
- **Games and labs:** OverTheWire's *Bandit* wargame teaches shell skills through puzzles; *Linux Upskill Challenge* is a free month-long server course; *Linux From Scratch* walks you through building an entire system from source.
- **Certifications**, if you want a structured goal: LPIC-1, Linux Foundation LFCS, or Red Hat's RHCSA, all hands-on or scenario-based.
- **Next topics:** containers in depth (Dockerfiles, Kubernetes), configuration management (Ansible), infrastructure as code, observability stacks (Prometheus, Grafana, OpenTelemetry), and reading kernel source at elixir.bootlin.com when you want to know exactly what a syscall does.

The path from zero to master is not about memorizing flags; `man` remembers those for you. It is about building an accurate mental model: processes asking a kernel for resources through system calls, files and streams as the universal interface, and small tools composed into large solutions. Once that model clicks, every new tool is just another way of looking at the same machine.
