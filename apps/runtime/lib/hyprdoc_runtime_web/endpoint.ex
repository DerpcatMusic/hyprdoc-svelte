defmodule HyprdocRuntimeWeb.Endpoint do
  use HyprdocRuntimeWeb, :endpoint

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]
  plug Phoenix.CodeReloader
  plug Plug.Parsers,
    parsers: [:json],
    pass: ["*/*"],
    json_decoder: Jason

  plug HyprdocRuntimeWeb.Router
end
