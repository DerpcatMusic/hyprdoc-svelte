defmodule HyprdocRuntimeWeb.SigningPortalController do
  use HyprdocRuntimeWeb, :controller

  alias HyprdocRuntime.Signing.Service

  def show(conn, %{"access_token" => access_token}) do
    case Service.load_portal(access_token, request_context(conn)) do
      {:ok, response} -> json(conn, response)
      {:error, reason} -> render_signing_error(conn, reason)
    end
  end

  def record_view(conn, %{"access_token" => access_token} = params) do
    case Service.record_view(access_token, params, request_context(conn)) do
      {:ok, response} -> json(conn, response)
      {:error, reason} -> render_signing_error(conn, reason)
    end
  end

  def send_challenge(conn, %{"access_token" => access_token} = params) do
    case Service.send_auth_challenge(access_token, params, request_context(conn)) do
      {:ok, response} -> json(conn, response)
      {:error, reason} -> render_signing_error(conn, reason)
    end
  end

  def verify_challenge(conn, %{"access_token" => access_token, "challenge_id" => challenge_id} = params) do
    case Service.verify_auth_challenge(access_token, challenge_id, params, request_context(conn)) do
      {:ok, response} -> json(conn, response)
      {:error, reason} -> render_signing_error(conn, reason)
    end
  end

  def save_field_value(conn, %{"access_token" => access_token} = params) do
    case Service.save_field_value(access_token, params, request_context(conn)) do
      {:ok, response} -> json(conn, response)
      {:error, reason} -> render_signing_error(conn, reason)
    end
  end

  def record_signature(conn, %{"access_token" => access_token} = params) do
    case Service.record_signature(access_token, params, request_context(conn)) do
      {:ok, response} -> json(conn, response)
      {:error, reason} -> render_signing_error(conn, reason)
    end
  end

  def complete(conn, %{"access_token" => access_token}) do
    case Service.complete_signing(access_token, request_context(conn)) do
      {:ok, response} -> json(conn, response)
      {:error, reason} -> render_signing_error(conn, reason)
    end
  end

  defp request_context(conn) do
    [authorization: List.first(get_req_header(conn, "authorization"))]
  end

  defp render_signing_error(conn, {:upstream_error, status, body}) do
    conn
    |> put_status(map_upstream_status(status))
    |> json(%{error: "Signing upstream error", detail: body})
  end

  defp render_signing_error(conn, :signing_source_not_configured) do
    conn
    |> put_status(:service_unavailable)
    |> json(%{error: "Signing source is not configured"})
  end

  defp render_signing_error(conn, :portal_expired) do
    conn
    |> put_status(:gone)
    |> json(%{error: "Signing link has expired"})
  end

  defp render_signing_error(conn, reason)
       when reason in [
              :challenge_not_required,
              :challenge_already_verified,
              :block_not_assigned,
              :block_not_text_input,
              :block_not_signature_field,
              :portal_not_signable,
              :portal_not_ready_to_complete,
              :portal_not_viewable,
              :portal_closed
            ] do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{error: "Signing portal request rejected", detail: Atom.to_string(reason)})
  end

  defp render_signing_error(conn, reason)
       when reason in [
              :invalid_signer_portal,
              :invalid_record_view_request,
              :invalid_record_view_response,
              :invalid_send_challenge_request,
              :invalid_send_challenge_response,
              :invalid_verify_challenge_request,
              :invalid_verify_challenge_response,
              :invalid_field_value_request,
              :invalid_field_value_response,
              :invalid_record_signature_request,
              :invalid_record_signature_response,
              :invalid_complete_signing_response
            ] do
    conn
    |> put_status(:bad_gateway)
    |> json(%{error: "Signing portal payload was malformed", detail: Atom.to_string(reason)})
  end

  defp render_signing_error(conn, reason)
       when reason in [:missing_required_field, :invalid_enum_value] do
    conn
    |> put_status(:bad_request)
    |> json(%{error: "Invalid signing portal request", detail: Atom.to_string(reason)})
  end

  defp render_signing_error(conn, reason) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{error: "Signing portal request failed", detail: Atom.to_string(reason)})
  end

  defp map_upstream_status(status) when status in [401, 403, 404], do: status
  defp map_upstream_status(status) when status >= 400 and status < 500, do: 422
  defp map_upstream_status(_status), do: 502
end
