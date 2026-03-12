defmodule HyprdocRuntime.LiveContracts.LocalSource do
  @moduledoc false

  @behaviour HyprdocRuntime.LiveContracts.Source

  alias HyprdocRuntime.LiveContracts.Cache
  alias HyprdocRuntime.LiveContracts.Payload
  alias HyprdocRuntime.LiveContracts.ProjectionProjector

  @impl true
  def fetch_projection(document_id, _opts) do
    Cache.get_projection(document_id)
  end

  @impl true
  def apply_mutation(document_id, mutation, opts) do
    with {:ok, projection} <- Cache.get_projection(document_id),
         {:ok, previous_hash} <- previous_event_hash(projection, mutation),
         {:ok, event_hash} <- compute_event_hash(document_id, mutation, previous_hash, opts),
         {:ok, envelope} <- build_mutation_envelope(document_id, mutation, projection, event_hash, opts) do
      {:ok, envelope}
    end
  end

  defp previous_event_hash(projection, mutation) do
    case Payload.chain_head_for_block(projection, fetch_value(mutation, ["blockId", :blockId])) do
      {:ok, nil} -> {:ok, nil}
      {:ok, head} -> {:ok, Map.get(head, "currentEventHash")}
      {:error, _} = error -> error
    end
  end

  defp compute_event_hash(document_id, mutation, previous_hash, opts) do
    proof_client(opts).compute_live_event_hash(%{
      document_id: document_id,
      event_type: "authorized_mutation",
      source: fetch_value(mutation, ["source", :source]),
      payload: %{
        block_id: fetch_value(mutation, ["blockId", :blockId]),
        path: fetch_value(mutation, ["path", :path]),
        op: fetch_value(mutation, ["op", :op]),
        value: fetch_value(mutation, ["value", :value]),
        reason: fetch_value(mutation, ["reason", :reason]),
        how: fetch_value(mutation, ["how", :how]),
        metadata: fetch_value(mutation, ["metadata", :metadata]) || %{}
      },
      created_at: System.system_time(:millisecond),
      previous_hash: previous_hash
    })
    |> case do
      {:ok, %{"hash" => hash}} -> {:ok, hash}
      {:ok, %{hash: hash}} -> {:ok, hash}
      {:error, _} = error -> error
      _ -> {:error, :invalid_event_hash_response}
    end
  end

  defp build_mutation_envelope(document_id, mutation, projection, event_hash, opts) do
    fetched_at = System.system_time(:millisecond)

    envelope = %{
      "provider" => "phoenix",
      "fetchedAt" => fetched_at,
      "result" => %{
        "documentId" => document_id,
        "blockId" => fetch_value(mutation, ["blockId", :blockId]),
        "path" => fetch_value(mutation, ["path", :path]),
        "value" => fetch_value(mutation, ["value", :value]),
        "eventHash" => event_hash,
        "stateHash" => ""
      }
    }

    projected =
      ProjectionProjector.apply_mutation(
        projection,
        normalize_mutation(mutation),
        envelope
      )

    with {:ok, state_hash} <- compute_state_hash(projected, opts) do
      {:ok, put_in(envelope, ["result", "stateHash"], state_hash)}
    end
  end

  defp normalize_mutation(mutation) do
    %{
      block_id: fetch_value(mutation, ["blockId", :blockId]),
      path: fetch_value(mutation, ["path", :path]),
      op: normalize_op(fetch_value(mutation, ["op", :op])),
      source: normalize_source(fetch_value(mutation, ["source", :source])),
      value: fetch_value(mutation, ["value", :value]),
      reason: fetch_value(mutation, ["reason", :reason]),
      how: fetch_value(mutation, ["how", :how]),
      metadata: fetch_value(mutation, ["metadata", :metadata]) || %{}
    }
  end

  defp compute_state_hash(projected, opts) do
    client = proof_client(opts)

    cond do
      function_exported?(client, :compute_state_hash, 1) ->
        client.compute_state_hash(%{
          projection: Map.get(projected, "projection", %{}),
          fetched_at: Map.get(projected, "fetchedAt")
        })
        |> case do
          {:ok, %{"hash" => hash}} -> {:ok, hash}
          {:ok, %{hash: hash}} -> {:ok, hash}
          {:error, _} = error -> error
          _ -> {:error, :invalid_state_hash_response}
        end

      true ->
        {:error, :proof_client_missing_state_hash}
    end
  end

  defp proof_client(opts) do
    Keyword.get(opts, :proof_client) ||
      Application.get_env(:hyprdoc_runtime, :proof_client, HyprdocRuntime.ProofClients.LocalHash)
  end

  defp normalize_op(value) when is_atom(value), do: value
  defp normalize_op(value) when is_binary(value), do: String.to_atom(value)

  defp normalize_source(value) when is_atom(value), do: value
  defp normalize_source(value) when is_binary(value), do: String.to_atom(value)

  defp fetch_value(map, keys) do
    Enum.find_value(keys, fn key ->
      case Map.fetch(map, key) do
        {:ok, value} -> {:found, value}
        :error -> nil
      end
    end)
    |> case do
      {:found, value} -> value
      nil -> nil
    end
  end
end
