-- Set leader key
vim.g.mapleader = " "

-- Basic settings
vim.opt.compatible = false               -- Disable compatibility with Vi
vim.opt.showmatch = true                 -- Show matching brackets
vim.opt.ignorecase = true                -- Case insensitive search
vim.opt.mouse = "a"                      -- Enable mouse support
vim.opt.hlsearch = true                  -- Highlight search results
vim.opt.incsearch = true                 -- Incremental search
vim.opt.tabstop = 4                      -- Tab size
vim.opt.softtabstop = 4                  -- Spaces per tab
vim.opt.expandtab = true                 -- Convert tabs to spaces
vim.opt.shiftwidth = 4                   -- Indentation width
vim.opt.autoindent = true                -- Maintain indentation
vim.opt.number = true                    -- Show line numbers
vim.opt.relativenumber = true            -- Show relative line numbers
vim.opt.wildmode = { "longest", "list" } -- Bash-like tab completion
vim.opt.colorcolumn = "80"               -- 80-column indicator
vim.opt.cursorline = true                -- Highlight current line
vim.opt.clipboard = "unnamedplus"        -- Use system clipboard
vim.opt.spell = true                     -- Enable spell checking
vim.opt.ttyfast = true                   -- Speed up scrolling
vim.cmd("filetype plugin indent on")
vim.cmd("syntax on")
