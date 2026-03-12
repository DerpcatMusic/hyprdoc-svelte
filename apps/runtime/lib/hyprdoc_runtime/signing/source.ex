defmodule HyprdocRuntime.Signing.Source do
  @moduledoc """
  Behaviour for the transitional signing lifecycle source of truth.

  Phoenix owns request validation and orchestration while Convex continues to
  service the existing signing workflow during the migration.
  """

  @type response :: {:ok, map()} | {:error, term()}

  @callback create_session(map(), keyword()) :: response()
  @callback fetch_session(String.t(), keyword()) :: response()
  @callback assign_signer(String.t(), map(), keyword()) :: response()
  @callback start_session(String.t(), keyword()) :: response()
  @callback fetch_portal(String.t(), keyword()) :: response()
  @callback record_view(String.t(), map(), keyword()) :: response()
  @callback send_auth_challenge(String.t(), map(), keyword()) :: response()
  @callback verify_auth_challenge(String.t(), String.t(), map(), keyword()) :: response()
  @callback save_field_value(String.t(), map(), keyword()) :: response()
  @callback record_signature(String.t(), map(), keyword()) :: response()
  @callback complete_signing(String.t(), keyword()) :: response()
end
