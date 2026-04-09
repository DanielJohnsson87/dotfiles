local refactor_utils = require("utils.refactor")
local opts = { noremap = true, silent = true }

-- LSP
vim.keymap.set("n", "gd", vim.lsp.buf.definition, { noremap = true, silent = true, desc = "Go to Definition" })
vim.keymap.set("n", "<leader>gd", function()
  vim.cmd("rightbelow vsplit")
  vim.lsp.buf.definition()
end, { desc = "Go to Definition in vsplit" })
vim.keymap.set("n", "K", vim.lsp.buf.hover, opts)
vim.keymap.set("n", "grr", function()
  require("telescope.builtin")
  .lsp_references({
    show_line = false,
    include_declaration = false,
  })
end, opts)

vim.keymap.set({ "n", "v" }, "<leader>f", function()
  require("conform").format({ async = true, lsp_fallback = true })
end, { desc = "Format file or range" })

-- NERDTree key mappings
vim.api.nvim_set_keymap('n', '<leader>n', ':NERDTreeFocus<CR>', { noremap = true, silent = true })
vim.api.nvim_set_keymap('n', '<C-t>', ':NERDTreeToggle<CR>', { noremap = true, silent = true })

vim.keymap.set("n", "<C-u>", "<C-u>zz");
vim.keymap.set("n", "<C-d>", "<C-d>zz");

vim.keymap.set("n", "n", "nzz");
vim.keymap.set("n", "N", "Nzz");
vim.keymap.set("n", "*", "*zz");
vim.keymap.set("n", "#", "#zz");

vim.keymap.set("n", "<leader>r", [[:%s/\<<C-r><C-w>\>/<C-r><C-w>/g<Left><Left>]],
  { desc = "Search & replace word under cursor" })

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

-- Toggle gitsigns base: index (default) ↔ default branch (master/main)
local branch_base_active = false
vim.keymap.set("n", "<leader>gB", function()
  if branch_base_active then
    require("gitsigns").change_base(nil, true)
    branch_base_active = false
    vim.notify("Gitsigns: vs index (default)")
  else
    local base = require("config.telescope.git_diff_branch").get_default_branch()
    require("gitsigns").change_base(base, true)
    branch_base_active = true
    vim.notify("Gitsigns: vs " .. base)
  end
end, { desc = "Toggle gitsigns base: index / branch" })

vim.keymap.set({ 'n', 'x', 'o' }, 's', '<Plug>(leap)')
vim.keymap.set('n', 'S', '<Plug>(leap-from-window)')
