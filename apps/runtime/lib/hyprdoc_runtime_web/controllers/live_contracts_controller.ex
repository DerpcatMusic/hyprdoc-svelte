defmodule HyprdocRuntimeWeb.LiveContractsController do
  use HyprdocRuntimeWeb, :controller

  alias HyprdocRuntime.LiveContracts.Service

  def show(conn, %{"document_id" => document_id}) do
    case Service.load_projection(document_id, request_context(conn)) do
      {:ok, projection} ->
        json(conn, projection)

      {:error, reason} ->
        render_runtime_error(conn, reason)
    end
  end

  def mutate(conn, %{"document_id" => document_id} = params) do
    case Service.apply_mutation(document_id, params, request_context(conn)) do
      {:ok, envelope} ->
        json(conn, envelope)

      {:error, reason} ->
        render_runtime_error(conn, reason)
    end
  end

  defp request_context(conn) do
    [authorization: List.first(get_req_header(conn, "authorization"))]
  end

  defp render_runtime_error(conn, {:upstream_error, status, body}) do
    conn
    |> put_status(map_upstream_status(status))
    |> json(%{error: "Runtime upstream error", detail: body})
  end

  defp render_runtime_error(conn, {:policy_violation, reason}) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{error: "Runtime mutation rejected", detail: Atom.to_string(reason)})
  end

  defp render_runtime_error(conn, :runtime_source_not_configured) do
    conn
    |> put_status(:service_unavailable)
    |> json(%{error: "Runtime source is not configured"})
  end

  defp render_runtime_error(conn, :policy_not_found) do
    conn
    |> put_status(:not_found)
    |> json(%{error: "No runtime policy exists for the requested block"})
  end

  defp render_runtime_error(conn, :anchor_not_found) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{error: "No sealed anchor exists for the requested block"})
  end

  defp render_runtime_error(conn, :invalid_projection_envelope) do
    conn
    |> put_status(:bad_gateway)
    |> json(%{error: "Runtime projection envelope was malformed"})
  end

  defp render_runtime_error(conn, :invalid_mutation_envelope) do
    conn
    |> put_status(:bad_gateway)
    |> json(%{error: "Runtime mutation envelope was malformed"})
  end

  defp render_runtime_error(conn, :invalid_mutation_request) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: "Runtime mutation request was malformed"})
  end

  defp render_runtime_error(conn, :missing_required_field) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: "Runtime mutation request is missing required fields"})
  end

  defp render_runtime_error(conn, :invalid_enum_value) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: "Runtime mutation request used an unsupported enum value"})
  end

  defp render_runtime_error(conn, :invalid_policy) do
    conn
    |> put_status(:bad_gateway)
    |> json(%{error: "Runtime projection contained an invalid block policy"})
  end

  defp render_runtime_error(conn, :base_seal_hash_missing) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{error: "Base seal hash is missing from the runtime projection"})
  end

  defp render_runtime_error(conn, _reason) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{error: "Runtime request failed"})
  end

  defp map_upstream_status(status) when status in [401, 403, 404], do: status
  defp map_upstream_status(status) when status >= 400 and status < 500, do: 422
  defp map_upstream_status(_status), do: 502
  end
end
