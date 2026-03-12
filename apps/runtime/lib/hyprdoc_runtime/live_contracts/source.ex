defmodule HyprdocRuntime.LiveContracts.Source do
  @moduledoc """
  Behaviour for the transitional live-contract source of truth.

  Phoenix is becoming the runtime authority, but during the cutover it still
  needs to load projections and apply mutations against an upstream data source.
  """

  @type response :: {:ok, map()} | {:error, term()}

  @callback fetch_projection(String.t(), keyword()) :: response()
  @callback apply_mutation(String.t(), map(), keyword()) :: response()
end
