import Config

if config_env() == :prod do
  port = String.to_integer(System.get_env("PORT") || "4100")
  host = System.get_env("PHX_HOST") || "runtime.hyprdoc.local"
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise "environment variable SECRET_KEY_BASE is missing"
  runtime_source_base_url = System.get_env("RUNTIME_SOURCE_BASE_URL")
  runtime_source_secret = System.get_env("RUNTIME_SOURCE_SECRET")
  signing_source_base_url =
    System.get_env("SIGNING_SOURCE_BASE_URL") || runtime_source_base_url
  signing_source_secret =
    System.get_env("SIGNING_SOURCE_SECRET") || runtime_source_secret

  config :hyprdoc_runtime, HyprdocRuntimeWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    http: [ip: {0, 0, 0, 0}, port: port],
    secret_key_base: secret_key_base,
    server: true

  config :hyprdoc_runtime,
    runtime_source_base_url: runtime_source_base_url,
    runtime_source_secret: runtime_source_secret,
    signing_source_base_url: signing_source_base_url,
    signing_source_secret: signing_source_secret
end
