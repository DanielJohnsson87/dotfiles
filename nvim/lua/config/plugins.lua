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
    { 'nvim-telescope/telescope-fzf-native.nvim', build = 'make' },
    {
        "nvim-lualine/lualine.nvim",
        dependencies = { 'nvim-tree/nvim-web-devicons' }
    },
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
    {
        "nvim-treesitter/nvim-treesitter-context",
        config = function()
            require("treesitter-context").setup({
                enable = true,
                max_lines = 3, -- how many lines of context to show
            })
        end,
    },
    "github/copilot.vim",
    "folke/tokyonight.nvim",
    { "catppuccin/nvim",              name = "catppuccin",                                                priority = 1000 },
    { "lewis6991/gitsigns.nvim",      dependencies = { "nvim-lua/plenary.nvim" } },
    { "pmizio/typescript-tools.nvim", dependencies = { "nvim-lua/plenary.nvim", "neovim/nvim-lspconfig" } },
    { "stevearc/conform.nvim",        opts = {} },
    "neovim/nvim-lspconfig",             -- LSP client
    "williamboman/mason.nvim",           -- LSP installer
    "williamboman/mason-lspconfig.nvim", -- bridge between mason and lspconfig
    "hrsh7th/nvim-cmp",                  -- Completion plugin
    "hrsh7th/cmp-nvim-lsp",              -- LSP source for nvim-cmp
    {
        "folke/lazydev.nvim",
        ft = "lua", -- only load on lua files
        opts = {
            library = {
                -- See the configuration section for more details
                -- Load luvit types when the `vim.uv` word is found
                { path = "${3rd}/luv/library", words = { "vim%.uv" } },
            },
        },
    },
    "matze/vim-move",
    "tpope/vim-surround",
    { "ThePrimeagen/harpoon", branch = "harpoon2", dependencies = { "nvim-lua/plenary.nvim", "nvim-telescope/telescope.nvim" } },
})

-- Harpoon setup
require("config.harpoon").setup();

-- Gitsigns setup
require('gitsigns').setup()

-- numToStr/Comment.nvim
require('Comment').setup()

require('lualine').setup({
    sections = {
        lualine_c = {
            {
                'filename',
                path = 1 -- 0 = just filename, 1 = relative path, 2 = absolute path
            }
        }
    }
})

require("config.telescope").setup()
