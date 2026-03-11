import Config

config :hyprdoc_runtime,
  ecto_repos: []

config :hyprdoc_runtime, HyprdocRuntimeWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: HyprdocRuntimeWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: HyprdocRuntime.PubSub,
  live_view: [signing_salt: "replace-me"]

config :phoenix, :json_library, Jason

import_config "#{config_env()}.exs"
