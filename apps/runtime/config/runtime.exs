import Config

if config_env() == :prod do
  port = String.to_integer(System.get_env("PORT") || "4100")
  host = System.get_env("PHX_HOST") || "runtime.hyprdoc.local"
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise "environment variable SECRET_KEY_BASE is missing"

  config :hyprdoc_runtime, HyprdocRuntimeWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    http: [ip: {0, 0, 0, 0}, port: port],
    secret_key_base: secret_key_base,
    server: true
end
