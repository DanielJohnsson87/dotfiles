-- Mason setup
require("mason").setup()
require("mason-lspconfig").setup({
    ensure_installed = { "lua_ls", "gopls", "eslint", "jsonls", "astro", "html", "cssls" }, -- add your desired servers
    automatic_installation = true,
})

-- Setup LSP servers
local lspconfig = require("lspconfig")

-- Add capabilities from nvim-cmp
local capabilities = require("cmp_nvim_lsp").default_capabilities()

-- Common on_attach function (keymaps, etc.)
local on_attach = function(client, bufnr)
    local opts = { noremap = true, silent = true, buffer = bufnr }

    -- LSP core mappings
    vim.keymap.set("n", "gd", vim.lsp.buf.definition, opts)
    vim.keymap.set("n", "K", vim.lsp.buf.hover, opts)
    vim.keymap.set("n", "grr", function()
        require("telescope.builtin")
            .lsp_references({
                show_line = false,
                include_declaration = false,
            })
    end, opts)
    vim.keymap.set("n", "grn", vim.lsp.buf.rename, opts)

    vim.o.updatetime = 250 -- shorter delay before CursorHold triggers

    vim.api.nvim_create_autocmd("CursorHold", {
        callback = function()
            vim.diagnostic.open_float(nil, {
                focusable = false,
                border = "rounded",
                source = "always",
                prefix = '',
                scope = "cursor",
            })
        end,
    })

    -- TypeScript: organize imports
    if client.name == "typescript-tools" or client.name == "tsserver" then
        vim.keymap.set("n", "<leader>oi", function()
            vim.cmd("TSToolsOrganizeImports")
        end, { buffer = bufnr, desc = "Organize Imports" })
    end
end

-- Setup servers

-- astro --
lspconfig.astro.setup({
    capabilities = capabilities,
    on_attach = on_attach,
    filetypes = { "astro" },
})

lspconfig.gopls.setup {}

lspconfig.lua_ls.setup({
    on_attach = on_attach,
    capabilities = capabilities,
})

lspconfig.eslint.setup({
    on_attach = on_attach,
    capabilities = capabilities,
    settings = {
        workingDirectory = { mode = "auto" },
    },
})

local cmp = require("cmp")
--
cmp.setup({
    mapping = cmp.mapping.preset.insert({
        ["<Tab>"] = cmp.mapping.select_next_item(),
        ["<S-Tab>"] = cmp.mapping.select_prev_item(),
        ["<CR>"] = cmp.mapping.confirm({ select = true }),
    }),
    sources = {
        { name = "nvim_lsp" },
    },
})
--
require("typescript-tools").setup({
    on_attach = on_attach,
    capabilities = capabilities,
    settings = {
        separate_diagnostic_server = true,
        publish_diagnostic_on = "insert_leave",
        expose_as_code_action = "all",
        tsserver_file_preferences = {
            includeInlayParameterNameHints = "all",
            includeCompletionsForModuleExports = true,
        },
    },
    filetypes = {
        "javascript",
        "typescript",
        "javascriptreact",
        "typescriptreact",
        "astro"
    },
})

require("conform").setup({
    formatters_by_ft = {
        javascript = { "prettier" },
        typescript = { "prettier" },
        javascriptreact = { "prettier" },
        typescriptreact = { "prettier" },
        astro = { "prettier" },
        json = { "prettier" },
        html = { "prettier" },
        css = { "prettier" },
        scss = { "prettier" },
        lua = { "stylua" }, -- optional, for lua files
    },
    format_on_save = {
        timeout_ms = 500,
        lsp_fallback = true, -- fallback to LSP formatting if no formatter configured
    },
})
