defmodule HyprdocRuntime.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {Phoenix.PubSub, name: HyprdocRuntime.PubSub},
      {Finch, name: HyprdocRuntime.Finch},
      HyprdocRuntime.LiveContracts.Cache,
      HyprdocRuntimeWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: HyprdocRuntime.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    HyprdocRuntimeWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
