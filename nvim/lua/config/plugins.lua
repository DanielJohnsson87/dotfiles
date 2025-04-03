

-- Plugin manager setup (lazy.nvim)
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({"git", "clone", "--filter=blob:none", "https://github.com/folke/lazy.nvim.git", lazypath})
end
vim.opt.rtp:prepend(lazypath)

require("lazy").setup({
  { "ThePrimeagen/vim-be-good" },
  { "scrooloose/nerdtree" },
  { "preservim/nerdcommenter" },
  { "mhinz/vim-startify" },
  { "neoclide/coc.nvim", branch = "release" },
  { "sbdchd/neoformat" },
  { "nvim-telescope/telescope.nvim" },
  { "nvim-treesitter/nvim-treesitter", build = ":TSUpdate" },
  { "github/copilot.vim" },
  { "folke/tokyonight.nvim" },
  { "ThePrimeagen/harpoon", branch = "harpoon2", dependencies = { "nvim-lua/plenary.nvim", "nvim-telescope/telescope.nvim" } },
})

-- Harpoon setup
local harpoon = require("harpoon")
harpoon.setup()

