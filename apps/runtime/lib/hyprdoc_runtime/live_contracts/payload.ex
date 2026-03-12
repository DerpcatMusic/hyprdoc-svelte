defmodule HyprdocRuntime.LiveContracts.Payload do
  @moduledoc false

  @providers ~w(phoenix convex)
  @sources ~w(system owner signer integration)
  @ops ~w(set unset append remove replace)
  @modes ~w(sealed live_append_only live_replaceable)

  @type normalized_mutation :: %{
          block_id: String.t(),
          path: String.t(),
          op: atom(),
          source: atom(),
          value: term(),
          reason: String.t(),
          how: String.t() | nil,
          metadata: map()
        }

  def normalize_projection_envelope(%{
        "provider" => provider,
        "fetchedAt" => fetched_at,
        "projection" => projection
      })
      when provider in @providers and is_integer(fetched_at) and is_map(projection) do
    {:ok,
     %{
       "provider" => provider,
       "fetchedAt" => fetched_at,
       "projection" => projection
     }}
  end

  def normalize_projection_envelope(_), do: {:error, :invalid_projection_envelope}

  def normalize_mutation_envelope(%{
        "provider" => provider,
        "fetchedAt" => fetched_at,
        "result" => result
      })
      when provider in @providers and is_integer(fetched_at) and is_map(result) do
    {:ok,
     %{
       "provider" => provider,
       "fetchedAt" => fetched_at,
       "result" => result
     }}
  end

  def normalize_mutation_envelope(_), do: {:error, :invalid_mutation_envelope}

  def normalize_mutation_request(params) when is_map(params) do
    with {:ok, block_id} <- fetch_non_empty_string(params, ["blockId", :blockId]),
         {:ok, path} <- fetch_non_empty_string(params, ["path", :path]),
         {:ok, op} <- fetch_enum_value(params, ["op", :op], @ops),
         {:ok, source} <- fetch_enum_value(params, ["source", :source], @sources),
         {:ok, reason} <- fetch_non_empty_string(params, ["reason", :reason]) do
      {:ok,
       %{
         block_id: block_id,
         path: path,
         op: String.to_atom(op),
         source: String.to_atom(source),
         value: fetch_value(params, ["value", :value]),
         reason: reason,
         how: fetch_optional_string(params, ["how", :how]),
         metadata: fetch_map(params, ["metadata", :metadata])
       }}
    end
  end

  def normalize_mutation_request(_), do: {:error, :invalid_mutation_request}

  def policy_from_projection(projection, block_id) when is_map(projection) do
    projection
    |> Map.get("projection", %{})
    |> Map.get("policies", [])
    |> Enum.find(&(policy_block_id(&1) == block_id))
    |> case do
      nil -> {:error, :policy_not_found}
      policy -> normalize_policy(policy)
    end
  end

  def anchor_for_block(projection, block_id) when is_map(projection) do
    projection
    |> Map.get("projection", %{})
    |> Map.get("anchors", [])
    |> Enum.find(&(map_string_key(&1, "blockId") == block_id))
    |> case do
      nil -> {:error, :anchor_not_found}
      anchor -> {:ok, anchor}
    end
  end

  def chain_head_for_block(projection, block_id) when is_map(projection) do
    head =
      projection
      |> Map.get("projection", %{})
      |> Map.get("chainHeads", [])
      |> Enum.find(&(map_string_key(&1, "blockId") == block_id))

    {:ok, head}
  end

  def base_seal_hash(projection) when is_map(projection) do
    integrity = get_in(projection, ["projection", "integrity"]) || %{}
    snapshot = get_in(projection, ["projection", "snapshot"]) || %{}

    case map_string_key(integrity, "baseSealHash") || map_string_key(snapshot, "sealHash") do
      value when is_binary(value) and value != "" -> {:ok, value}
      _ -> {:error, :base_seal_hash_missing}
    end
  end

  defp normalize_policy(policy) when is_map(policy) do
    with {:ok, block_id} <- fetch_non_empty_string(policy, ["blockId", :blockId]),
         {:ok, block_type} <- fetch_non_empty_string(policy, ["blockType", :blockType]),
         {:ok, mode} <- fetch_enum_value(policy, ["mode", :mode], @modes) do
      allowed_paths =
        policy
        |> fetch_value(["allowedPaths", :allowedPaths])
        |> case do
          paths when is_list(paths) -> Enum.filter(paths, &is_binary/1)
          _ -> []
        end

      {:ok,
       %HyprdocRuntime.LiveContracts.LiveBlockPolicy{
         block_id: block_id,
         block_type: block_type,
         mode: String.to_atom(mode),
         allowed_paths: allowed_paths,
         condition: fetch_map_or_nil(policy, ["condition", :condition]),
         integration: fetch_map_or_nil(policy, ["integration", :integration]),
         metadata: fetch_map(policy, ["metadata", :metadata])
       }}
    end
  end

  defp normalize_policy(_), do: {:error, :invalid_policy}

  defp policy_block_id(policy), do: map_string_key(policy, "blockId")

  defp fetch_non_empty_string(map, keys) do
    case fetch_value(map, keys) do
      value when is_binary(value) and value != "" -> {:ok, value}
      _ -> {:error, :missing_required_field}
    end
  end

  defp fetch_optional_string(map, keys) do
    case fetch_value(map, keys) do
      value when is_binary(value) and value != "" -> value
      _ -> nil
    end
  end

  defp fetch_enum_value(map, keys, allowed) do
    case fetch_value(map, keys) do
      value when value in allowed -> {:ok, value}
      _ -> {:error, :invalid_enum_value}
    end
  end

  defp fetch_map(map, keys) do
    case fetch_value(map, keys) do
      value when is_map(value) -> value
      _ -> %{}
    end
  end

  defp fetch_map_or_nil(map, keys) do
    case fetch_value(map, keys) do
      value when is_map(value) -> value
      _ -> nil
    end
  end

  defp fetch_value(map, keys) do
    Enum.find_value(keys, fn key ->
      case Map.fetch(map, key) do
        {:ok, value} -> value
        :error -> nil
      end
    end)
  end

  defp map_string_key(map, key) when is_map(map) do
    Map.get(map, key) || Map.get(map, String.to_atom(key))
  rescue
    ArgumentError -> nil
  end
end
