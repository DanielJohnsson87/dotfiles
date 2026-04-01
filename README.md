# Dotfiles 

# Installation
- Clone repository
- Symlink each directory you want to use to the corresponding location in your home directory

## Symlink examples
```bash
# Neovim
ln -s ~/dotfiles/nvim ~/.config/nvim

# Tmux
ln -s ~/dotfiles/tmux/.tmux.conf ~/.tmux.conf

# Claude Code
ln -s ~/dotfiles/claude/CLAUDE.md ~/.claude/CLAUDE.md
ln -s ~/dotfiles/claude/settings.json ~/.claude/settings.json
ln -s ~/dotfiles/claude/statusline-command.sh ~/.claude/statusline-command.sh
ln -s ~/dotfiles/claude/mcp_servers.json ~/.claude/mcp_servers.json
ln -s ~/dotfiles/claude/skills/feature-plan ~/.claude/skills/feature-plan
```

# Additional notes
- A Nerd Font is used by neovim, so make sure to install one of those.
- Karabiner Elements is used to remap Caps Lock to work as Control.
