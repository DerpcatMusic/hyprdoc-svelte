defmodule HyprdocRuntime.LiveContracts.ConditionEvaluator do
  @moduledoc false

  def evaluate(nil, _projection), do: true

  def evaluate(%{"field" => field, "operator" => operator} = condition, projection)
      when is_binary(field) and is_binary(operator) and is_map(projection) do
    values = resolved_values(projection)
    current_value = Map.get(values, field)
    target_value = Map.get(condition, "value")

    case operator do
      "exists" -> not is_nil(current_value)
      "eq" -> current_value == target_value
      "neq" -> current_value != target_value
      "gt" -> compare_numbers(current_value, target_value, :gt)
      "gte" -> compare_numbers(current_value, target_value, :gte)
      "lt" -> compare_numbers(current_value, target_value, :lt)
      "lte" -> compare_numbers(current_value, target_value, :lte)
      "in" -> is_list(target_value) and Enum.member?(target_value, current_value)
      _ -> false
    end
  end

  def evaluate(_condition, _projection), do: false

  defp resolved_values(projection) do
    projection
    |> get_in(["projection", "resolvedBlocks"])
    |> List.wrap()
    |> Enum.reduce(%{}, fn block, acc ->
      block_id = Map.get(block, "blockId")
      path = Map.get(block, "path")
      value = Map.get(block, "value")

      case {block_id, path} do
        {block_id, path} when is_binary(block_id) and is_binary(path) ->
          Map.put(acc, "block:#{block_id}:#{path}", value)

        _ ->
          acc
      end
    end)
  end

  defp compare_numbers(left, right, operator)
       when is_number(left) and is_number(right) do
    case operator do
      :gt -> left > right
      :gte -> left >= right
      :lt -> left < right
      :lte -> left <= right
    end
  end

  defp compare_numbers(_, _, _), do: false
end
