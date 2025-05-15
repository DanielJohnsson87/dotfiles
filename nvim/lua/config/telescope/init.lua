local M = {}

M.setup = function()
    require('telescope').load_extension('fzf')
    local multigrep = require("config.telescope.multigrep")

    vim.keymap.set("n", "<leader>fg", multigrep.live_multigrep)

    -- vim.api.nvim_set_keymap('n', '<leader>fg', '<cmd>Telescope live_grep<cr>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>fh', '<cmd>Telescope help_tags<cr>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap("n", "<leader>fr", "<cmd>Telescope resume<cr>",
        { noremap = true, silent = true, desc = "Resume last Telescope search" })

    vim.api.nvim_set_keymap('n', '<leader>ff',
        "<cmd>lua require'telescope.builtin'.find_files({ find_command = {'rg', '--files', '--no-ignore', '--hidden', '--glob', '!.git/', '--glob', '!**/node_modules/**', '--glob', '!.vercel/', '--glob', '!.next/', '--glob', '!dist/', '--glob', '!build/'} })<cr>",
        { noremap = true, silent = true })
    vim.keymap.set('n', '<leader>gs', require('telescope.builtin').git_status, { desc = 'Fuzzy find Git status changes' })
    vim.keymap.set('n', '<leader>gcb', require('telescope.builtin').git_bcommits,
        { desc = 'Fuzzy find Git commit history for current buffer' })
end

return M
