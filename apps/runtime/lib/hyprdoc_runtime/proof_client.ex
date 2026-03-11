defmodule HyprdocRuntime.ProofClient do
  @moduledoc """
  Behaviour boundary for the Rust proof kernel.

  The runtime should call a proof adapter for canonical hashing and verification
  instead of duplicating deterministic logic in Elixir.
  """

  @type proof_request :: map()
  @type proof_response :: {:ok, map()} | {:error, term()}

  @callback compute_seal_hash(proof_request()) :: proof_response()
  @callback compute_live_event_hash(proof_request()) :: proof_response()
  @callback compute_lineage_hash(proof_request()) :: proof_response()
  @callback verify_contract(proof_request()) :: proof_response()
end
