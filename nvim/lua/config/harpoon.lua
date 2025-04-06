local harpoon = require("harpoon")
local M = {}
local conf = require("telescope.config").values

M.setup = function()
    harpoon.setup();

    vim.keymap.set("n", "<leader>e", function()
            M.toggle_telescope(harpoon:list())
        end,
        { desc = "Open harpoon window" })
    vim.keymap.set("n", "<leader>a", function() harpoon:list():add() end)
    --vim.keymap.set("n", "<leader>e", function() harpoon.ui:toggle_quick_menu(harpoon:list()) end)

    vim.keymap.set("n", "<leader>h", function() harpoon:list():select(1) end)
    vim.keymap.set("n", "<leader>j", function() harpoon:list():select(2) end)
    vim.keymap.set("n", "<leader>k", function() harpoon:list():select(3) end)
    vim.keymap.set("n", "<leader>l", function() harpoon:list():select(4) end)
end;
-- Use the telescope picker to show the marked files

M.toggle_telescope = function(harpoon_files)
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

return M
