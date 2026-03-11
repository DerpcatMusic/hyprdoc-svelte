defmodule HyprdocRuntimeWeb.Router do
  use HyprdocRuntimeWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", HyprdocRuntimeWeb do
    pipe_through :api

    get "/health", HealthController, :show
    get "/live-contracts/:document_id", LiveContractsController, :show
  end
end
