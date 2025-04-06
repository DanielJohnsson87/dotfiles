-- matze/vim-move
vim.g.move_key_modifier = 'C'
vim.g.move_key_modifier_visualmode = 'C'

require("config.options")
require("config.plugins")
require("config.lsp")
require("config.keymaps")

-- Colorscheme
vim.cmd("colorscheme tokyonight")
