defmodule HyprdocRuntime.LiveContracts.Service do
  @moduledoc false

  alias HyprdocRuntime.LiveContracts.Cache
  alias HyprdocRuntime.LiveContracts.ConditionEvaluator
  alias HyprdocRuntime.LiveContracts.ContractValidity
  alias HyprdocRuntime.LiveContracts.MutationEvent
  alias HyprdocRuntime.LiveContracts.Payload
  alias HyprdocRuntime.LiveContracts.ProjectionProjector

  def load_projection(document_id, opts \\ []) when is_binary(document_id) do
    case source(opts).fetch_projection(document_id, source_opts(opts))
         |> then(&normalize_projection_response(&1)) do
      {:ok, projection} ->
        Cache.put_projection(document_id, projection)
        {:ok, projection}

      {:error, _} = error ->
        case Cache.get_projection(document_id) do
          {:ok, projection} -> {:ok, projection}
          {:error, :projection_cache_miss} -> error
        end
    end
  end

  def apply_mutation(document_id, params, opts \\ []) when is_binary(document_id) do
    with {:ok, mutation} <- Payload.normalize_mutation_request(params),
         {:ok, projection} <- load_projection(document_id, opts),
         {:ok, policy} <- Payload.policy_from_projection(projection, mutation.block_id),
         :ok <- validate_condition(policy, projection),
         {:ok, event} <- build_mutation_event(document_id, mutation, projection),
         :valid <- ContractValidity.validate_event(event, policy),
         {:ok, envelope} <-
           source(opts).apply_mutation(document_id, encode_mutation(mutation), source_opts(opts)),
         {:ok, normalized_envelope} <- Payload.normalize_mutation_envelope(envelope) do
      normalized_envelope = Map.put(normalized_envelope, "provider", "phoenix")
      Cache.record_mutation(document_id, normalized_envelope)
      project_cached_mutation(document_id, projection, mutation, normalized_envelope)
      {:ok, normalized_envelope}
    else
      {:invalid, reason} -> {:error, {:policy_violation, reason}}
      {:error, _} = error -> error
    end
  end

  defp normalize_projection_response({:ok, payload}) do
    with {:ok, normalized} <- Payload.normalize_projection_envelope(payload) do
      {:ok, Map.put(normalized, "provider", "phoenix")}
    end
  end

  defp normalize_projection_response({:error, _} = error), do: error

  defp build_mutation_event(document_id, mutation, projection) do
    with {:ok, base_seal_hash} <- Payload.base_seal_hash(projection),
         {:ok, anchor} <- Payload.anchor_for_block(projection, mutation.block_id),
         {:ok, chain_head} <- Payload.chain_head_for_block(projection, mutation.block_id) do
      {:ok,
       %MutationEvent{
         event_id: "pending:#{document_id}:#{mutation.block_id}",
         document_id: document_id,
         block_id: mutation.block_id,
         block_type: nil,
         type: :authorized_mutation,
         at: System.system_time(:millisecond),
         actor: %{source: mutation.source},
         base_seal_hash: base_seal_hash,
         sealed_block_hash: Map.get(anchor, "sealedBlockHash") || "",
         parent_anchor_hash: Map.get(anchor, "parentAnchorHash"),
         previous_event_hash: chain_head && Map.get(chain_head, "currentEventHash"),
         event_hash: "pending",
         mutation: %{
           op: mutation.op,
           path: mutation.path,
           value: mutation.value,
           metadata: mutation.metadata
         }
       }}
    end
  end

  defp encode_mutation(mutation) do
    %{
      "blockId" => mutation.block_id,
      "path" => mutation.path,
      "op" => Atom.to_string(mutation.op),
      "source" => Atom.to_string(mutation.source),
      "value" => mutation.value,
      "reason" => mutation.reason,
      "how" => mutation.how,
      "metadata" => mutation.metadata
    }
  end

  defp source(opts) do
    Keyword.get(opts, :source_adapter) ||
      Application.get_env(
        :hyprdoc_runtime,
        :live_contracts_source_adapter,
        HyprdocRuntime.LiveContracts.HttpSource
      )
  end

  defp source_opts(opts) do
    Keyword.take(opts, [:authorization, :base_url, :shared_secret])
  end

  defp validate_condition(%{condition: nil}, _projection), do: :ok

  defp validate_condition(%{condition: condition}, projection) do
    if ConditionEvaluator.evaluate(condition, projection) do
      :ok
    else
      {:error, {:policy_violation, :condition_not_met}}
    end
  end

  defp project_cached_mutation(document_id, projection, mutation, normalized_envelope) do
    projection
    |> ProjectionProjector.apply_mutation(mutation, normalized_envelope)
    |> then(&Cache.put_projection(document_id, &1))
  end
end
