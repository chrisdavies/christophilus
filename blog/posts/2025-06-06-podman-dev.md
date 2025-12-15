# Podman dev environment

A couple years ago, after yet another egregious malicious npm package, I changed my dev environment.

A friend asked me to do a quick write-up, so here you go. You're welcome, Matt.

I run a lot of little local projects, each of which has their own dependencies. I don't trust the supply chain for all of my Neovim plugins, Ruby gems, Go deps, npm packages, etc. So, I decided to create a little tool based on Podman which allows me to quickly spin up a dev container in any given folder. And sandbox all of my dependencies-- including my dev tools-- inside it.

## The workflow

I `cd ./some/folder`, then type `dev sh`, and I'm in a container with `./some/folder` mounted at `/src`. That's it.

I generally spawn a few terminals and run `dev sh` in each: one for `npm start` or whatever, one for `claude` or my terminal-based AI agent, and one for `nvim`. Could I use tmux or Nvim to multiplex? Yes. Do I want to? No. I like letting my window manager handle this, and it's not a big enough hassle that I've ever considered automating it in any way.

## Securityish

The containers don't have access to anything on the host machine other than the specific folder from which I ran my `dev sh` command and any ports which my `.podman/env` file directs it to expose.

Since it's podman, it is rootless. This means, if anything running in the container gets out onto my host machine, at least it won't be running with root privileges.

## No orchestration

I install *all* of my dependencies in the container. This includes my editor (Neovim and various plugins), database (generally Postgres using pgenv), Claude Code, etc.

Basically, I treat my podman containers as if they're a traditional virtual machine. I put everything in there. I don't bother with docker compose or whatever. That's for CI and production pipelines. On my dev box, every project is a single container, and it's super simple.

Terminal-based tools work really well here. Neovim and Claude Code run in the containers, so I don't have to fiddle with trying to get my IDE or whatever to understand that I'm using docker.

I don't need to worry (as much) about Claude Code or a rogue Neovim plugin grabbing stuff they shouldn't. They can only grab what's in my container which is never super sensitive info.

## Arch

I've used Debian, Fedora, and Arch-based images, but I've settled on Arch. This is mainly because I like to have the latest packages. If I need a specific version of a thing, I'll install that thing using a tool like `pgenv` for Postgres, or `nvm` for Node. For everything else, I just use Arch's package manager.

## Niri

On my host machine, I run Fedora or Arch with Niri as the window manager. Niri is awesome. Spawning, switching between, and closing windows is natural, and my hands barely have to move to make it happen.

I never liked tiling WMs, because I can't do anything useful in a tiny square. Niri gives each window full height and a decent width by default, and simply places all of your windows in an infinite horizontal line. I quickly move between windows using the Super key + vim motions (e.g. `Super+l` focuses the window to the right `Super+h` focuses the window to the left). Resizing windows, moving them, stacking or unstacking them centering / uncentering them, etc are all very quick operations with efficient keybindings to keep me in my flow state.

Speaking of flow-state, I spawn a lot of ad-hoc terminal instances. I use the Foot terminal because it launches instantly and is very light-weight by modern terminal standards, so I can go from "I wonder what the output of `foo bar` is?" to spawning + running that command instantly without interrupting my flow-state.

Basically, Niri + Foot + Podman = <3.

