defmodule HyprdocRuntime.LiveContracts.HttpSource do
  @moduledoc false

  @behaviour HyprdocRuntime.LiveContracts.Source

  @impl true
  def fetch_projection(document_id, opts) do
    request(:get, "/api/runtime/source/contracts/#{URI.encode(document_id)}", nil, opts)
  end

  @impl true
  def apply_mutation(document_id, mutation, opts) do
    request(
      :post,
      "/api/runtime/source/contracts/#{URI.encode(document_id)}/mutations",
      mutation,
      opts
    )
  end

  defp request(method, path, body, opts) do
    with {:ok, base_url} <- fetch_base_url(opts),
         {:ok, response} <-
           Finch.build(method, base_url <> path, build_headers(opts), encode_body(body))
           |> Finch.request(HyprdocRuntime.Finch),
         {:ok, payload} <- decode_response(response) do
      {:ok, payload}
    else
      {:error, _} = error -> error
    end
  end

  defp fetch_base_url(opts) do
    case Keyword.get(opts, :base_url) || Application.get_env(:hyprdoc_runtime, :runtime_source_base_url) do
      value when is_binary(value) and value != "" -> {:ok, String.trim_trailing(value, "/")}
      _ -> {:error, :runtime_source_not_configured}
    end
  end

  defp build_headers(opts) do
    auth_headers =
      case Keyword.get(opts, :authorization) do
        value when is_binary(value) and value != "" -> [{"authorization", value}]
        _ -> []
      end

    secret_headers =
      case Keyword.get(opts, :shared_secret) ||
             Application.get_env(:hyprdoc_runtime, :runtime_source_secret) do
        value when is_binary(value) and value != "" ->
          [{"x-hyprdoc-runtime-secret", value}]

        _ ->
          []
      end

    [{"accept", "application/json"}, {"content-type", "application/json"} | auth_headers ++ secret_headers]
  end

  defp encode_body(nil), do: nil

  defp encode_body(body) when is_map(body) do
    Jason.encode!(body)
  end

  defp decode_response(%Finch.Response{status: status, body: body})
       when status >= 200 and status < 300 do
    Jason.decode(body)
  end

  defp decode_response(%Finch.Response{status: status, body: body}) do
    {:error, {:upstream_error, status, body}}
  end
end
