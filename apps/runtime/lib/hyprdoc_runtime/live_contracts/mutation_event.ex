defmodule HyprdocRuntime.LiveContracts.MutationEvent do
  @enforce_keys [
    :event_id,
    :document_id,
    :block_id,
    :type,
    :at,
    :actor,
    :base_seal_hash,
    :sealed_block_hash,
    :event_hash,
    :mutation
  ]
  defstruct [
    :event_id,
    :document_id,
    :block_id,
    :block_type,
    :type,
    :at,
    :actor,
    :base_seal_hash,
    :sealed_block_hash,
    :parent_anchor_hash,
    :previous_event_hash,
    :event_hash,
    :mutation
  ]

  @type actor :: %{
          required(:source) => :system | :owner | :signer | :integration,
          optional(:workos_id) => String.t(),
          optional(:member_id) => String.t(),
          optional(:display_name) => String.t()
        }

  @type mutation :: %{
          required(:op) => :set | :unset | :append | :remove | :replace,
          required(:path) => String.t(),
          optional(:value) => term(),
          optional(:previous_value) => term(),
          optional(:metadata) => map()
        }

  @type t :: %__MODULE__{
          event_id: String.t(),
          document_id: String.t(),
          block_id: String.t(),
          block_type: String.t() | nil,
          type: atom() | String.t(),
          at: non_neg_integer(),
          actor: actor(),
          base_seal_hash: String.t(),
          sealed_block_hash: String.t(),
          parent_anchor_hash: String.t() | nil,
          previous_event_hash: String.t() | nil,
          event_hash: String.t(),
          mutation: mutation()
        }
end
