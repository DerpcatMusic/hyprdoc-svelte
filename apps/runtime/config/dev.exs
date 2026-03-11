import Config

config :hyprdoc_runtime, HyprdocRuntimeWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4100],
  check_origin: false,
  code_reloader: true,
  debug_errors: true,
  secret_key_base: "dev-secret-key-base-dev-secret-key-base-dev-secret-key-base",
  watchers: []
