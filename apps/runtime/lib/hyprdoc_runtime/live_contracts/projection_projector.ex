defmodule HyprdocRuntime.LiveContracts.ProjectionProjector do
  @moduledoc false

  def apply_mutation(projection, mutation, mutation_envelope)
      when is_map(projection) and is_map(mutation) and is_map(mutation_envelope) do
    fetched_at = Map.get(mutation_envelope, "fetchedAt", System.system_time(:millisecond))
    result = Map.get(mutation_envelope, "result", %{})
    projection_body = Map.get(projection, "projection", %{})

    previous_resolved =
      projection_body
      |> Map.get("resolvedBlocks", [])
      |> Enum.find(&(resolved_match?(&1, mutation)))

    next_value =
      compute_next_value(
        Map.get(previous_resolved || %{}, "value"),
        Map.get(mutation, :op),
        Map.get(mutation, :value)
      )

    next_resolved_blocks =
      upsert_resolved_block(
        Map.get(projection_body, "resolvedBlocks", []),
        mutation,
        next_value,
        Map.get(mutation, :source),
        Map.get(result, "eventHash"),
        fetched_at
      )

    previous_chain_head =
      projection_body
      |> Map.get("chainHeads", [])
      |> Enum.find(&(Map.get(&1, "blockId") == Map.get(mutation, :block_id)))

    live_event = %{
      "id" => Map.get(result, "eventHash"),
      "documentId" => get_in(projection, ["projection", "snapshot", "documentId"]),
      "eventType" => "authorized_mutation",
      "source" => Atom.to_string(Map.get(mutation, :source)),
      "payload" => %{
        "blockId" => Map.get(mutation, :block_id),
        "path" => Map.get(mutation, :path),
        "op" => Atom.to_string(Map.get(mutation, :op)),
        "value" => Map.get(mutation, :value),
        "reason" => Map.get(mutation, :reason),
        "how" => Map.get(mutation, :how),
        "metadata" => Map.get(mutation, :metadata, %{})
      },
      "createdAt" => fetched_at,
      "eventHash" => Map.get(result, "eventHash"),
      "previousHash" => previous_chain_head && Map.get(previous_chain_head, "currentEventHash"),
      "matchedBlockId" => Map.get(mutation, :block_id),
      "matchedBy" => "blockId",
      "createdBy" => nil
    }

    next_chain_heads =
      upsert_chain_head(
        Map.get(projection_body, "chainHeads", []),
        mutation,
        result,
        fetched_at
      )

    next_integrity =
      projection_body
      |> Map.get("integrity", %{})
      |> Map.put("currentStateHash", Map.get(result, "stateHash"))
      |> Map.put("currentLastEventHash", Map.get(result, "eventHash"))
      |> Map.update("totalLiveEventCount", 1, &(&1 + 1))

    projection
    |> Map.put("fetchedAt", fetched_at)
    |> Map.put(
      "projection",
      projection_body
      |> Map.put("resolvedBlocks", next_resolved_blocks)
      |> Map.put("chainHeads", next_chain_heads)
      |> Map.put("liveEvents", Map.get(projection_body, "liveEvents", []) ++ [live_event])
      |> Map.put("integrity", next_integrity)
    )
  end

  defp resolved_match?(resolved, mutation) do
    Map.get(resolved, "blockId") == Map.get(mutation, :block_id) and
      Map.get(resolved, "path") == Map.get(mutation, :path)
  end

  defp upsert_resolved_block(resolved_blocks, mutation, next_value, source, event_hash, updated_at) do
    next_block = %{
      "blockId" => Map.get(mutation, :block_id),
      "path" => Map.get(mutation, :path),
      "value" => next_value,
      "source" => Atom.to_string(source),
      "eventHash" => event_hash,
      "updatedAt" => updated_at
    }

    case Enum.split_with(resolved_blocks, &(not resolved_match?(&1, mutation))) do
      {remaining, []} -> remaining ++ [next_block]
      {remaining, [_existing | rest]} -> remaining ++ [next_block | rest]
    end
  end

  defp upsert_chain_head(chain_heads, mutation, result, updated_at) do
    block_id = Map.get(mutation, :block_id)

    next_head =
      chain_heads
      |> Enum.find(&(Map.get(&1, "blockId") == block_id))
      |> case do
        nil ->
          %{
            "documentId" => Map.get(result, "documentId"),
            "blockId" => block_id,
            "baseSealHash" => "",
            "sealedBlockHash" => "",
            "updatedAt" => updated_at
          }

        head ->
          head
      end
      |> Map.put("currentEventHash", Map.get(result, "eventHash"))
      |> Map.put("currentStateHash", Map.get(result, "stateHash"))
      |> Map.put("matchedBy", "blockId")
      |> Map.put("eventType", "authorized_mutation")
      |> Map.put("source", Atom.to_string(Map.get(mutation, :source)))
      |> Map.put("updatedAt", updated_at)

    case Enum.split_with(chain_heads, &(Map.get(&1, "blockId") != block_id)) do
      {remaining, []} -> remaining ++ [next_head]
      {remaining, [_existing | rest]} -> remaining ++ [next_head | rest]
    end
  end

  defp compute_next_value(current_value, :append, next_value) do
    cond do
      is_binary(current_value) -> current_value <> to_string(next_value || "")
      is_nil(current_value) -> to_string(next_value || "")
      true -> next_value
    end
  end

  defp compute_next_value(_current_value, op, _next_value) when op in [:unset, :remove], do: nil
  defp compute_next_value(_current_value, _op, next_value), do: next_value
end
