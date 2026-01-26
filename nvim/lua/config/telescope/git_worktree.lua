local M = {}

M.setup = function()
  local worktree = require("telescope").load_extension("git_worktree")
  vim.keymap.set("n", "<leader>gw", worktree.git_worktrees, { desc = "Git Worktrees" })
  vim.keymap.set("n", "<leader>gn", worktree.create_git_worktree, { desc = "New Git Worktree" })
end

return M
