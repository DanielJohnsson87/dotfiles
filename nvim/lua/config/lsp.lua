-- Mason setup
require("mason").setup()
require("mason-lspconfig").setup({
    ensure_installed = { "lua_ls", "eslint", "jsonls", "astro", "html", "cssls" }, -- add your desired servers
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
    --    vim.keymap.set("n", "gr", vim.lsp.buf.references, opts)
    vim.keymap.set("n", "gr", function()
        require("telescope.builtin")
            .lsp_references({
                show_line = false,
                include_declaration = false,
            })
    end, opts)
    vim.keymap.set("n", "<leader>rn", vim.lsp.buf.rename, opts)

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

lspconfig.lua_ls.setup({
    on_attach = on_attach,
    capabilities = capabilities,
    settings = {
        Lua = {
            runtime = {
                version = "LuaJIT", -- most common for Neovim
            },
            diagnostics = {
                globals = { "vim" }, -- avoids "undefined global 'vim'"
            },
            workspace = {
                library = vim.api.nvim_get_runtime_file("", true),
                checkThirdParty = false, -- stops prompts about "luv" etc.
            },
            telemetry = {
                enable = false,
            },
        },
    },
})

lspconfig.eslint.setup({
    on_attach = on_attach,
    capabilities = capabilities,
    settings = {
        workingDirectory = { mode = "auto" },
    },
})

local cmp = require("cmp")
local luasnip = require("luasnip")

cmp.setup({
    snippet = {
        expand = function(args)
            luasnip.lsp_expand(args.body)
        end,
    },
    mapping = cmp.mapping.preset.insert({
        ["<Tab>"] = cmp.mapping.select_next_item(),
        ["<S-Tab>"] = cmp.mapping.select_prev_item(),
        ["<CR>"] = cmp.mapping.confirm({ select = true }),
    }),
    sources = {
        { name = "nvim_lsp" },
        { name = "luasnip" },
    },
})

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
        lua = { "stylua" }, -- optional, for lua files
    },
    format_on_save = {
        timeout_ms = 500,
        lsp_fallback = true, -- fallback to LSP formatting if no formatter configured
    },
})

require("noice").setup({
    lsp = {
        -- override markdown rendering so that **cmp** and other plugins use **Treesitter**
        override = {
            ["vim.lsp.util.convert_input_to_markdown_lines"] = true,
            ["vim.lsp.util.stylize_markdown"] = true,
            ["cmp.entry.get_documentation"] = true, -- requires hrsh7th/nvim-cmp
        },
    },
    -- you can enable a preset for easier configuration
    presets = {
        bottom_search = true,         -- use a classic bottom cmdline for search
        command_palette = true,       -- position the cmdline and popupmenu together
        long_message_to_split = true, -- long messages will be sent to a split
        inc_rename = false,           -- enables an input dialog for inc-rename.nvim
        lsp_doc_border = false,       -- add a border to hover docs and signature help
    },
})
