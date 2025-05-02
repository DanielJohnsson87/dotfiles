local refactor_utils = require("utils.refactor")


vim.keymap.set({ "n", "v" }, "<leader>f", function()
    require("conform").format({ async = true, lsp_fallback = true })
end, { desc = "Format file or range" })

-- NERDTree key mappings
vim.api.nvim_set_keymap('n', '<leader>n', ':NERDTreeFocus<CR>', { noremap = true, silent = true })
vim.api.nvim_set_keymap('n', '<C-t>', ':NERDTreeToggle<CR>', { noremap = true, silent = true })

vim.keymap.set("n", "<leader>oi", function() vim.cmd("TSToolsOrganizeImports") end, { desc = "Organize Imports" })
vim.keymap.set("n", "<C-u>", "<C-u>zz");
vim.keymap.set("n", "<C-d>", "<C-d>zz");

vim.keymap.set("n", "<leader>rd", function()
    refactor_utils.prompt_delete_pattern()
    print("Pattern highlighted. Use <leader>rdy to confirm deletion or <leader>rdn to remove highlight.")
end, { desc = "Delete lines matching pattern" })

vim.keymap.set("n", "<leader>rdy", function()
    refactor_utils.confirm_pattern()
end, { desc = "Confirm deletion of lines matching pattern" })

vim.keymap.set("n", "<leader>rdn", function()
    refactor_utils.clear_pattern()
end, { desc = "Clear highlight of lines matching pattern" })
