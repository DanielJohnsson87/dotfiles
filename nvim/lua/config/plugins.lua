-- Plugin manager setup (lazy.nvim)
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
    vim.fn.system({ "git", "clone", "--filter=blob:none", "https://github.com/folke/lazy.nvim.git", lazypath })
end
vim.opt.rtp:prepend(lazypath)

require("lazy").setup({
    "ThePrimeagen/vim-be-good",
    "scrooloose/nerdtree",
    "numToStr/Comment.nvim",
    "mhinz/vim-startify",
    { "nvim-telescope/telescope.nvim" },
    {
        "nvim-treesitter/nvim-treesitter",
        build = ":TSUpdate",
        dependencies = {
            "nvim-treesitter/nvim-treesitter-textobjects",
        },
        config = function()
            require("config.treesitter").setup()
        end,
    },
    "github/copilot.vim",
    "folke/tokyonight.nvim",
    { "lewis6991/gitsigns.nvim",      dependencies = { "nvim-lua/plenary.nvim" } },
    { "pmizio/typescript-tools.nvim", dependencies = { "nvim-lua/plenary.nvim", "neovim/nvim-lspconfig" } },
    { "stevearc/conform.nvim",        opts = {} },
    "neovim/nvim-lspconfig",             -- LSP client
    "williamboman/mason.nvim",           -- LSP installer
    "williamboman/mason-lspconfig.nvim", -- bridge between mason and lspconfig
    "hrsh7th/nvim-cmp",                  -- Completion plugin
    "hrsh7th/cmp-nvim-lsp",              -- LSP source for nvim-cmp
    "L3MON4D3/LuaSnip",                  -- Snippet engine
    "saadparwaiz1/cmp_luasnip",          -- Snippet source
    "matze/vim-move",
    {
        "folke/noice.nvim",
        event = "VeryLazy",
        opts = {
            -- add any options here
        },
        dependencies = {
            -- if you lazy-load any plugin below, make sure to add proper `module="..."` entries
            "MunifTanjim/nui.nvim",
            -- OPTIONAL:
            --   `nvim-notify` is only needed, if you want to use the notification view.
            --   If not available, we use `mini` as the fallback
            "rcarriga/nvim-notify",
        }
    },
    -- { "tpope/vim-fugitive" },
    { "ThePrimeagen/harpoon", branch = "harpoon2", dependencies = { "nvim-lua/plenary.nvim", "nvim-telescope/telescope.nvim" } },
})

-- Harpoon setup
require("config.harpoon").setup();

-- Gitsigns setup
require('gitsigns').setup()

-- numToStr/Comment.nvim
require('Comment').setup()
