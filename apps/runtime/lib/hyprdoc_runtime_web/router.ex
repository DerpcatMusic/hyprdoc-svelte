defmodule HyprdocRuntimeWeb.Router do
  use HyprdocRuntimeWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", HyprdocRuntimeWeb do
    pipe_through :api

    get "/health", HealthController, :show
    get "/live-contracts/:document_id", LiveContractsController, :show
    post "/live-contracts/:document_id/mutations", LiveContractsController, :mutate
    post "/signing/sessions", SigningSessionsController, :create
    get "/signing/sessions/:session_id", SigningSessionsController, :show
    post "/signing/sessions/:session_id/assignments", SigningSessionsController, :assign
    post "/signing/sessions/:session_id/start", SigningSessionsController, :start
    get "/signing/portal/:access_token", SigningPortalController, :show
    post "/signing/portal/:access_token/view", SigningPortalController, :record_view
    post "/signing/portal/:access_token/challenges", SigningPortalController, :send_challenge
    post "/signing/portal/:access_token/challenges/:challenge_id/verify", SigningPortalController, :verify_challenge
    post "/signing/portal/:access_token/field-values", SigningPortalController, :save_field_value
    post "/signing/portal/:access_token/signatures", SigningPortalController, :record_signature
    post "/signing/portal/:access_token/complete", SigningPortalController, :complete
  end
end
