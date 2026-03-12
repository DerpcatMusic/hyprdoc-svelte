defmodule HyprdocRuntime.ProofClients.LocalHash do
  @moduledoc false

  @behaviour HyprdocRuntime.ProofClient

  @impl true
  def compute_seal_hash(request), do: {:ok, %{"hash" => hash_term(request)}}

  @impl true
  def compute_live_event_hash(request), do: {:ok, %{"hash" => hash_term(request)}}

  @impl true
  def compute_lineage_hash(request), do: {:ok, %{"hash" => hash_term(request)}}

  @impl true
  def verify_contract(_request), do: {:ok, %{"valid" => true}}

  def compute_state_hash(request), do: {:ok, %{"hash" => hash_term(request)}}

  defp hash_term(term) do
    term
    |> canonicalize()
    |> :erlang.term_to_binary()
    |> then(&:crypto.hash(:sha256, &1))
    |> Base.encode16(case: :lower)
  end

  defp canonicalize(value) when is_map(value) do
    value
    |> Enum.map(fn {key, next_value} -> {to_string(key), canonicalize(next_value)} end)
    |> Enum.sort_by(fn {key, _} -> key end)
  end

  defp canonicalize(value) when is_list(value), do: Enum.map(value, &canonicalize/1)
  defp canonicalize(value), do: value
end
