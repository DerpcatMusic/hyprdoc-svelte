defmodule HyprdocRuntimeWeb.SigningSessionsController do
  use HyprdocRuntimeWeb, :controller

  alias HyprdocRuntime.Signing.Service

  def create(conn, params) do
    case Service.create_session(params, request_context(conn)) do
      {:ok, response} -> json(conn, response)
      {:error, reason} -> render_signing_error(conn, reason)
    end
  end

  def show(conn, %{"session_id" => session_id}) do
    case Service.get_session(session_id, request_context(conn)) do
      {:ok, response} -> json(conn, response)
      {:error, reason} -> render_signing_error(conn, reason)
    end
  end

  def assign(conn, %{"session_id" => session_id} = params) do
    case Service.assign_signer(session_id, params, request_context(conn)) do
      {:ok, response} -> json(conn, response)
      {:error, reason} -> render_signing_error(conn, reason)
    end
  end

  def start(conn, %{"session_id" => session_id}) do
    case Service.start_session(session_id, request_context(conn)) do
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

  defp render_signing_error(conn, :session_not_startable) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{error: "Signing session cannot be started from its current state"})
  end

  defp render_signing_error(conn, reason)
       when reason in [
              :invalid_signing_session_request,
              :invalid_signer_assignment_request,
              :missing_required_field,
              :invalid_enum_value
            ] do
    conn
    |> put_status(:bad_request)
    |> json(%{error: "Invalid signing session request", detail: Atom.to_string(reason)})
  end

  defp render_signing_error(conn, reason)
       when reason in [
              :invalid_create_session_response,
              :invalid_signing_session,
              :invalid_signer_assignment_response,
              :invalid_start_session_response
            ] do
    conn
    |> put_status(:bad_gateway)
    |> json(%{error: "Signing source returned malformed session data", detail: Atom.to_string(reason)})
  end

  defp render_signing_error(conn, reason) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{error: "Signing session request failed", detail: Atom.to_string(reason)})
  end

  defp map_upstream_status(status) when status in [401, 403, 404], do: status
  defp map_upstream_status(status) when status >= 400 and status < 500, do: 422
  defp map_upstream_status(_status), do: 502
end
