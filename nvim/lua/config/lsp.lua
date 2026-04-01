-- local cmp = require("cmp")
-- --
-- cmp.setup({
--   mapping = cmp.mapping.preset.insert({
--     -- ["<Tab>"] = cmp.mapping.select_next_item(),
--     ["<Tab>"] = nil, -- Disabled to avoid conflict with copilot
--     ["<S-Tab>"] = cmp.mapping.select_prev_item(),
--     ["<CR>"] = cmp.mapping.confirm({ select = true }),
--   }),
--   sources = {
--     { name = "nvim_lsp" },
--   },
-- })
-- --
--

local M = {
  setup = function()
    vim.diagnostic.config({
      -- virtual_lines = true, -- Uncomment to show virtual lines for all diagnostics
      virtual_lines = { current_line = true }, -- Uncomment to show virtual lines only for the current line
    })


    require("conform").setup({
      formatters_by_ft = {
        javascript = { "prettier" },
        typescript = { "prettier" },
        javascriptreact = { "prettier" },
        typescriptreact = { "prettier" },
        json = { "prettier" },
        html = { "prettier" },
        css = { "prettier" },
        scss = { "prettier" },
        lua = { "stylua" }, -- optional, for lua files
      },
      formatters = {
        prettier = {
          -- Resolve prettier via Node's require.resolve instead of node_modules/.bin/prettier.
          -- Yarn 1 can point the .bin symlink to a nested dependency's older prettier version
          -- (e.g. storybook's prettier 2.x), causing mismatches with ESLint's prettier plugin.
          command = function()
            local bin = vim.fn.system("node -e \"process.stdout.write(require.resolve('prettier/bin/prettier.cjs'))\"")
            if vim.v.shell_error == 0 and bin ~= "" then
              return bin
            end
            return "prettier"
          end,
        },
      },
      format_on_save = {
        timeout_ms = 500,
        lsp_fallback = true, -- fallback to LSP formatting if no formatter configured
      }
    })


    vim.api.nvim_create_autocmd("LspAttach", {
      -- group = vim.api.nvim_create_augroup("my.lsp", {}),
      callback = function(args)
        local client = vim.lsp.get_client_by_id(args.data.client_id)
        if not client then
          return
        end
        if client:supports_method("textDocument/completion") then
          vim.opt.completeopt = { "menu", "menuone", "noinsert", "fuzzy", "popup" }
          vim.lsp.completion.enable(true, client.id, args.buf, { autotrigger = true })
          vim.keymap.set("i", "<C-Space>", vim.lsp.buf.completion, { buffer = args.buf, desc = "LSP Completion" })
        end

        vim.keymap.set('n', '<leader>oi', function()
          vim.lsp.buf.code_action({
            apply = true,
            context = {
              only = { "source.organizeImports" },
              diagnostics = {},
            },
          })
        end, { desc = "Organize Imports" })

        vim.keymap.set({ 'n', 'v' }, '<leader>ca', vim.lsp.buf.code_action)
      end -- callback
    })
  end,

  vim.lsp.enable("closure_ls")
}



return M
