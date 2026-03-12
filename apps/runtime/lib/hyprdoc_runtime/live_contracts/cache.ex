defmodule HyprdocRuntime.LiveContracts.Cache do
  @moduledoc false

  use GenServer

  @projection_table :hyprdoc_runtime_projection_cache
  @mutation_table :hyprdoc_runtime_mutation_cache

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def get_projection(document_id) when is_binary(document_id) do
    case :ets.lookup(@projection_table, document_id) do
      [{^document_id, projection}] -> {:ok, projection}
      [] -> {:error, :projection_cache_miss}
    end
  end

  def put_projection(document_id, projection) when is_binary(document_id) and is_map(projection) do
    :ets.insert(@projection_table, {document_id, projection})
    :ok
  end

  def record_mutation(document_id, mutation_envelope)
      when is_binary(document_id) and is_map(mutation_envelope) do
    :ets.insert(@mutation_table, {document_id, System.system_time(:millisecond), mutation_envelope})
    :ok
  end

  def recent_mutations(document_id, limit \\ 10) when is_binary(document_id) do
    @mutation_table
    |> :ets.lookup(document_id)
    |> Enum.sort_by(fn {_, at, _} -> at end, :desc)
    |> Enum.take(limit)
    |> Enum.map(fn {_, _, envelope} -> envelope end)
  end

  @impl true
  def init(state) do
    :ets.new(@projection_table, [:named_table, :public, :set, read_concurrency: true])
    :ets.new(@mutation_table, [:named_table, :public, :bag, read_concurrency: true])
    {:ok, state}
  end
end
