local pickers = require("telescope.pickers")
local finders = require("telescope.finders")
local previewers = require("telescope.previewers")
local make_entry = require("telescope.make_entry")
local conf = require("telescope.config").values
local actions = require("telescope.actions")
local action_state = require("telescope.actions.state")

local M = {}

M.get_default_branch = function()
  local result = vim.fn.system("git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null")
  if vim.v.shell_error == 0 and result then
    return vim.trim(result):gsub("^refs/remotes/origin/", "")
  end
  return "master"
end

M.git_diff_branch = function(opts)
  opts = opts or {}
  opts.cwd = opts.cwd or vim.uv.cwd()
  local base = opts.base or M.get_default_branch()

  local result = vim.fn.systemlist("git diff --name-only " .. base .. "...HEAD")
  if vim.v.shell_error ~= 0 or #result == 0 then
    vim.notify("No changes found compared to " .. base, vim.log.levels.INFO)
    return
  end

  local diff_previewer = previewers.new_buffer_previewer({
    title = "Diff",
    define_preview = function(self, entry)
      local output = vim.fn.systemlist({ "git", "diff", base .. "...HEAD", "--", entry.value })
      vim.api.nvim_buf_set_lines(self.state.bufnr, 0, -1, false, output)
      vim.bo[self.state.bufnr].filetype = "diff"
    end,
  })

  local function get_first_hunk_line(filepath)
    local diff = vim.fn.system({ "git", "diff", base .. "...HEAD", "--", filepath })
    local line = diff:match("@@ %-%d+,?%d* %+(%d+)")
    return line and tonumber(line) or 1
  end

  pickers.new(opts, {
    prompt_title = "Changed files vs " .. base,
    finder = finders.new_table({
      results = result,
      entry_maker = make_entry.gen_from_file(opts),
    }),
    previewer = diff_previewer,
    sorter = conf.file_sorter(opts),
    attach_mappings = function(prompt_bufnr)
      actions.select_default:replace(function()
        local entry = action_state.get_selected_entry()
        actions.close(prompt_bufnr)
        local lnum = get_first_hunk_line(entry.value)
        vim.cmd("edit " .. vim.fn.fnameescape(entry.value))
        vim.api.nvim_win_set_cursor(0, { lnum, 0 })
      end)
      return true
    end,
  }):find()
end

-- Extension idea: add a <leader>gB keymap that opens telescope.builtin.git_branches
-- first, then on selection feeds the chosen branch as opts.base into git_diff_branch().
-- This gives fuzzy search on branch names before fuzzy search on changed files.

M.setup = function()
  vim.keymap.set("n", "<leader>gb", function()
    M.git_diff_branch()
  end, { desc = "Git branch diff files" })
end

return M
