-- matze/vim-move
vim.g.move_key_modifier = 'C'
vim.g.move_key_modifier_visualmode = 'C'

require("config.options")
require("config.plugins")
local lspConifg = require("config.lsp")
require("config.keymaps")

lspConifg.setup()

-- Colorscheme
vim.cmd("colorscheme catppuccin")
