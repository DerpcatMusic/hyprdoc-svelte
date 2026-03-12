defmodule HyprdocRuntime.Signing.Service do
  @moduledoc false

  alias HyprdocRuntime.Signing.Payload
  alias HyprdocRuntime.Signing.PortalRules

  def create_session(params, opts \\ []) do
    with {:ok, request} <- Payload.normalize_create_session_request(params),
         {:ok, response} <- source(opts).create_session(request, source_opts(opts)),
         {:ok, normalized} <- Payload.normalize_create_session_response(response) do
      {:ok, normalized}
    end
  end

  def get_session(session_id, opts \\ []) when is_binary(session_id) do
    with {:ok, response} <- source(opts).fetch_session(session_id, source_opts(opts)),
         {:ok, normalized} <- Payload.normalize_session(response) do
      {:ok, normalized}
    end
  end

  def assign_signer(session_id, params, opts \\ []) when is_binary(session_id) do
    with {:ok, request} <- Payload.normalize_assign_signer_request(params),
         {:ok, response} <- source(opts).assign_signer(session_id, request, source_opts(opts)),
         {:ok, normalized} <- Payload.normalize_assign_signer_response(response) do
      {:ok, normalized}
    end
  end

  def start_session(session_id, opts \\ []) when is_binary(session_id) do
    with {:ok, session} <- get_session(session_id, opts),
         :ok <- validate_session_startable(session),
         {:ok, response} <- source(opts).start_session(session_id, source_opts(opts)),
         {:ok, normalized} <- Payload.normalize_start_session_response(response) do
      {:ok, normalized}
    end
  end

  def load_portal(access_token, opts \\ []) when is_binary(access_token) do
    with {:ok, response} <- source(opts).fetch_portal(access_token, source_opts(opts)),
         {:ok, normalized} <- Payload.normalize_portal(response) do
      {:ok, normalized}
    end
  end

  def record_view(access_token, params, opts \\ []) when is_binary(access_token) do
    with {:ok, request} <- Payload.normalize_record_view_request(params),
         {:ok, portal} <- load_portal(access_token, opts),
         :ok <- PortalRules.validate_view(portal),
         {:ok, response} <- source(opts).record_view(access_token, request, source_opts(opts)),
         {:ok, normalized} <- Payload.normalize_record_view_response(response) do
      {:ok, normalized}
    end
  end

  def send_auth_challenge(access_token, params, opts \\ []) when is_binary(access_token) do
    with {:ok, request} <- Payload.normalize_send_challenge_request(params),
         {:ok, portal} <- load_portal(access_token, opts),
         :ok <- PortalRules.validate_challenge(portal, request["type"]),
         {:ok, response} <-
           source(opts).send_auth_challenge(access_token, request, source_opts(opts)),
         {:ok, normalized} <- Payload.normalize_send_challenge_response(response) do
      {:ok, normalized}
    end
  end

  def verify_auth_challenge(access_token, challenge_id, params, opts \\ [])
      when is_binary(access_token) and is_binary(challenge_id) do
    with {:ok, request} <- Payload.normalize_verify_challenge_request(params),
         {:ok, portal} <- load_portal(access_token, opts),
         :ok <- PortalRules.validate_view(portal),
         {:ok, response} <-
           source(opts).verify_auth_challenge(access_token, challenge_id, request, source_opts(opts)),
         {:ok, normalized} <- Payload.normalize_verify_challenge_response(response) do
      {:ok, normalized}
    end
  end

  def save_field_value(access_token, params, opts \\ []) when is_binary(access_token) do
    with {:ok, request} <- Payload.normalize_save_field_value_request(params),
         {:ok, portal} <- load_portal(access_token, opts),
         :ok <- PortalRules.validate_field_save(portal, request["blockId"]),
         {:ok, response} <-
           source(opts).save_field_value(access_token, request, source_opts(opts)),
         {:ok, normalized} <- Payload.normalize_save_field_value_response(response) do
      {:ok, normalized}
    end
  end

  def record_signature(access_token, params, opts \\ []) when is_binary(access_token) do
    with {:ok, request} <- Payload.normalize_record_signature_request(params),
         {:ok, portal} <- load_portal(access_token, opts),
         :ok <- PortalRules.validate_signature(portal, request["blockId"]),
         {:ok, response} <-
           source(opts).record_signature(access_token, request, source_opts(opts)),
         {:ok, normalized} <- Payload.normalize_record_signature_response(response) do
      {:ok, normalized}
    end
  end

  def complete_signing(access_token, opts \\ []) when is_binary(access_token) do
    with {:ok, portal} <- load_portal(access_token, opts),
         :ok <- PortalRules.validate_complete(portal),
         {:ok, response} <- source(opts).complete_signing(access_token, source_opts(opts)),
         {:ok, normalized} <- Payload.normalize_complete_response(response) do
      {:ok, normalized}
    end
  end

  defp source(opts) do
    Keyword.get(opts, :source_adapter) ||
      Application.get_env(:hyprdoc_runtime, :signing_source_adapter, HyprdocRuntime.Signing.HttpSource)
  end

  defp source_opts(opts) do
    Keyword.take(opts, [:authorization, :base_url, :shared_secret])
  end

  defp validate_session_startable(session) do
    case Map.get(session, "status") do
      "draft" -> :ok
      status when status in ["pending", "in_progress", "completed"] -> :ok
      _ -> {:error, :session_not_startable}
    end
  end
end
