local M = {}

M.setup = function()
  vim.keymap.set('n', '<leader>ts', '<cmd>Telescope tmux sessions<cr>')
  vim.keymap.set('n', '<leader>tw', '<cmd>Telescope tmux windows<cr>')
end

return M
