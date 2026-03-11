defmodule HyprdocRuntime do
  @moduledoc """
  Runtime boundary for HyprDoc's live-contract orchestration.

  This app is intended to own workflow and authorization decisions around:

  - envelopes
  - sealing transitions
  - post-seal live block updates
  - integration-driven state changes

  Proof-critical hashing stays behind a dedicated client boundary so the
  runtime never becomes the source of truth for cryptographic verification.
  """
end
