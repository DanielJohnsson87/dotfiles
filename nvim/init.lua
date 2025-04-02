-- Set leader key
vim.g.mapleader = " "

-- Basic settings
vim.opt.compatible = false  -- Disable compatibility with Vi
vim.opt.showmatch = true   -- Show matching brackets
vim.opt.ignorecase = true  -- Case insensitive search
vim.opt.mouse = "a"        -- Enable mouse support
vim.opt.hlsearch = true    -- Highlight search results
vim.opt.incsearch = true   -- Incremental search
vim.opt.tabstop = 4        -- Tab size
vim.opt.softtabstop = 4    -- Spaces per tab
vim.opt.expandtab = true   -- Convert tabs to spaces
vim.opt.shiftwidth = 4     -- Indentation width
vim.opt.autoindent = true  -- Maintain indentation
vim.opt.number = true      -- Show line numbers
vim.opt.relativenumber = true -- Show relative line numbers
vim.opt.wildmode = { "longest", "list" } -- Bash-like tab completion
vim.opt.colorcolumn = "80" -- 80-column indicator
vim.opt.cursorline = true  -- Highlight current line
vim.opt.clipboard = "unnamedplus" -- Use system clipboard
vim.opt.spell = true       -- Enable spell checking
vim.opt.ttyfast = true     -- Speed up scrolling
vim.cmd("filetype plugin indent on")
vim.cmd("syntax on")

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

-- Colorscheme
vim.cmd("colorscheme tokyonight")

-- Telescope key mappings
vim.api.nvim_set_keymap('n', '<leader>ff', '<cmd>Telescope find_files<cr>', { noremap = true, silent = true })
vim.api.nvim_set_keymap('n', '<leader>fg', '<cmd>Telescope live_grep<cr>', { noremap = true, silent = true })
vim.api.nvim_set_keymap('n', '<leader>fh', '<cmd>Telescope help_tags<cr>', { noremap = true, silent = true })

-- Neoformat configuration
vim.g.neoformat_try_node_exe = 1
vim.g.neoformat_enabled_javascript = { 'prettier' }
vim.g.neoformat_enabled_typescript = { 'prettier' }
vim.g.neoformat_enabled_json = { 'prettier' }
vim.g.neoformat_enabled_css = { 'prettier' }
vim.g.neoformat_enabled_html = { 'prettier' }
vim.g.neoformat_enabled_astro = { 'prettier' }
vim.g.neoformat_enabled_javascriptreact = { 'prettier' }
vim.g.neoformat_enabled_typescriptreact = { 'prettier' }



vim.cmd([[ autocmd BufWritePre *.js,*.jsx,*.json,*.ts,*.tsx,*.css,*.html,*.astro Neoformat ]])
vim.api.nvim_set_keymap('n', '<leader>f', ':Neoformat<CR>', { noremap = true, silent = true })


-- NERDTree key mappings
vim.api.nvim_set_keymap('n', '<leader>n', ':NERDTreeFocus<CR>', { noremap = true, silent = true })
vim.api.nvim_set_keymap('n', '<C-t>', ':NERDTreeToggle<CR>', { noremap = true, silent = true })

-- CoC key mappings
vim.api.nvim_set_keymap('n', 'gd', '<Plug>(coc-definition)', { silent = true })
vim.api.nvim_set_keymap('n', 'gy', '<Plug>(coc-type-definition)', { silent = true })
vim.api.nvim_set_keymap('n', 'gi', '<Plug>(coc-implementation)', { silent = true })
vim.api.nvim_set_keymap('n', 'gr', '<Plug>(coc-references)', { silent = true })
vim.api.nvim_set_keymap('n', 'K', ':lua ShowDocumentation()<CR>', { silent = true })



-- Use <Enter> to confirm completion
vim.api.nvim_set_keymap('i', '<CR>', 'pumvisible() ? coc#_select_confirm() : "\\<CR>"', { noremap = true, expr = true, silent = true })
--[[vim.api.nvim_set_keymap('n', '<leader>cl', '<Plug>(coc-codelens-action)', {silent = true})]]

-- Function for showing documentation
function ShowDocumentation()
    if vim.fn.CocAction('hasProvider', 'hover') then
        vim.fn.CocActionAsync('doHover')
    else
        vim.api.nvim_feedkeys('K', 'in', true)
    end
end

-- Harpoon setup
local harpoon = require("harpoon")
harpoon.setup()

-- basic telescope configuration
local conf = require("telescope.config").values
local actions = require("telescope.actions")
local action_state = require("telescope.actions.state")
local function toggle_telescope(harpoon_files)
    local file_paths = {}
    for _, item in ipairs(harpoon_files.items) do
        table.insert(file_paths, item.value)
    end

    local finder = function()
        local paths = {}
        for _, item in ipairs(harpoon_files.items) do
            table.insert(paths, item.value)
        end

        return require("telescope.finders").new_table({
            results = paths,
        })
    end

    require("telescope.pickers").new({}, {
        prompt_title = "Harpoon",
        finder = require("telescope.finders").new_table({
            results = file_paths,
        }),
        previewer = conf.file_previewer({}),
        sorter = conf.generic_sorter({}),
                attach_mappings = function(prompt_bufnr, map)
            map("i", "<C-d>", function()
                local state = require("telescope.actions.state")
                local selected_entry = state.get_selected_entry()
                local current_picker = state.get_current_picker(prompt_bufnr)

                table.remove(harpoon_files.items, selected_entry.index)
                current_picker:refresh(finder())
            end)
            return true
        end,
    }):find()
end

vim.keymap.set("n", "<leader>e", function() toggle_telescope(harpoon:list()) end,
    { desc = "Open harpoon window" })
vim.keymap.set("n", "<leader>a", function() harpoon:list():add() end)
--vim.keymap.set("n", "<leader>e", function() harpoon.ui:toggle_quick_menu(harpoon:list()) end)


vim.keymap.set("n", "<leader>h", function() harpoon:list():select(1) end)
vim.keymap.set("n", "<leader>j", function() harpoon:list():select(2) end)
vim.keymap.set("n", "<leader>k", function() harpoon:list():select(3) end)
vim.keymap.set("n", "<leader>l", function() harpoon:list():select(4) end)

