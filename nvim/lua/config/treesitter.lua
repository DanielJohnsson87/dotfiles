local M = {}

function M.setup()
    require("nvim-treesitter.configs").setup({
        ensure_installed = { "go", "gomod", "gosum", "lua", "html", "javascript", "typescript", "tsx", "css" },
        highlight = {
            enable = true,
        },
        indent = {
            enable = true,
        },
        textobjects = {
            select = {
                enable = true,
                lookahead = true,
                keymaps = {
                    ["af"] = "@function.outer",
                    ["if"] = "@function.inner",
                    ["at"] = "@tag.outer",
                    ["it"] = "@tag.inner",
                },
            },
        },
    })
end

return M
