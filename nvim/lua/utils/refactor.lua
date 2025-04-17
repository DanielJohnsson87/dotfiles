local M = {}

local match_id = nil
local last_pattern = nil

M.prompt_delete_pattern = function()
    local input = vim.fn.input("Delete lines matching pattern: ")
    if input == "" then return end

    local escaped = vim.fn.escape(input, "\\/.*$^~[]")
    local pattern = [[^\s*]] .. escaped .. [[\s*,\?$]]

    if match_id then
        vim.fn.matchdelete(match_id)
    end

    match_id = vim.fn.matchadd("Search", pattern)
    last_pattern = pattern
end

M.confirm_pattern = function()
    if not last_pattern then
        print("No pattern highlighted.")
        return
    end

    vim.cmd("g/" .. last_pattern .. "/d")

    if match_id then
        vim.fn.matchdelete(match_id)
    end
    match_id = nil
    last_pattern = nil
    print("Lines matching pattern deleted.")
end

M.clear_pattern = function()
    if match_id then
        vim.fn.matchdelete(match_id)
        match_id = nil
        print("Highlight cleared.")
    end
    last_pattern = nil
end

return M
