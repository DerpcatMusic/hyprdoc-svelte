defmodule HyprdocRuntime.Signing.HttpSource do
  @moduledoc false

  @behaviour HyprdocRuntime.Signing.Source

  @impl true
  def create_session(params, opts) do
    request(:post, "/api/signing/source/sessions", params, opts)
  end

  @impl true
  def fetch_session(session_id, opts) do
    request(:get, "/api/signing/source/sessions/#{URI.encode(session_id)}", nil, opts)
  end

  @impl true
  def assign_signer(session_id, params, opts) do
    request(
      :post,
      "/api/signing/source/sessions/#{URI.encode(session_id)}/assignments",
      params,
      opts
    )
  end

  @impl true
  def start_session(session_id, opts) do
    request(:post, "/api/signing/source/sessions/#{URI.encode(session_id)}/start", nil, opts)
  end

  @impl true
  def fetch_portal(access_token, opts) do
    request(:get, "/api/signing/source/portal/#{URI.encode(access_token)}", nil, opts)
  end

  @impl true
  def record_view(access_token, params, opts) do
    request(:post, "/api/signing/source/portal/#{URI.encode(access_token)}/view", params, opts)
  end

  @impl true
  def send_auth_challenge(access_token, params, opts) do
    request(
      :post,
      "/api/signing/source/portal/#{URI.encode(access_token)}/challenges",
      params,
      opts
    )
  end

  @impl true
  def verify_auth_challenge(access_token, challenge_id, params, opts) do
    request(
      :post,
      "/api/signing/source/portal/#{URI.encode(access_token)}/challenges/#{URI.encode(challenge_id)}/verify",
      params,
      opts
    )
  end

  @impl true
  def save_field_value(access_token, params, opts) do
    request(
      :post,
      "/api/signing/source/portal/#{URI.encode(access_token)}/field-values",
      params,
      opts
    )
  end

  @impl true
  def record_signature(access_token, params, opts) do
    request(
      :post,
      "/api/signing/source/portal/#{URI.encode(access_token)}/signatures",
      params,
      opts
    )
  end

  @impl true
  def complete_signing(access_token, opts) do
    request(:post, "/api/signing/source/portal/#{URI.encode(access_token)}/complete", nil, opts)
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
    case Keyword.get(opts, :base_url) || Application.get_env(:hyprdoc_runtime, :signing_source_base_url) ||
           Application.get_env(:hyprdoc_runtime, :runtime_source_base_url) do
      value when is_binary(value) and value != "" -> {:ok, String.trim_trailing(value, "/")}
      _ -> {:error, :signing_source_not_configured}
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
             Application.get_env(:hyprdoc_runtime, :signing_source_secret) ||
             Application.get_env(:hyprdoc_runtime, :runtime_source_secret) do
        value when is_binary(value) and value != "" ->
          [{"x-hyprdoc-runtime-secret", value}]

        _ ->
          []
      end

    [{"accept", "application/json"}, {"content-type", "application/json"} | auth_headers ++ secret_headers]
  end

  defp encode_body(nil), do: nil
  defp encode_body(body) when is_map(body), do: Jason.encode!(body)

  defp decode_response(%Finch.Response{status: status, body: body})
       when status >= 200 and status < 300 do
    Jason.decode(body)
  end

  defp decode_response(%Finch.Response{status: status, body: body}) do
    {:error, {:upstream_error, status, body}}
  end
end
