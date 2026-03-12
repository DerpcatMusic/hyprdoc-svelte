defmodule HyprdocRuntime.LiveContracts.CompositeSource do
  @moduledoc false

  @behaviour HyprdocRuntime.LiveContracts.Source

  alias HyprdocRuntime.LiveContracts.Cache
  alias HyprdocRuntime.LiveContracts.HttpSource
  alias HyprdocRuntime.LiveContracts.LocalSource

  @impl true
  def fetch_projection(document_id, opts) do
    case Cache.get_projection(document_id) do
      {:ok, projection} -> {:ok, projection}
      {:error, :projection_cache_miss} -> HttpSource.fetch_projection(document_id, opts)
    end
  end

  @impl true
  def apply_mutation(document_id, mutation, opts) do
    case Cache.get_projection(document_id) do
      {:ok, _projection} -> LocalSource.apply_mutation(document_id, mutation, opts)
      {:error, :projection_cache_miss} -> HttpSource.apply_mutation(document_id, mutation, opts)
    end
  end
end
