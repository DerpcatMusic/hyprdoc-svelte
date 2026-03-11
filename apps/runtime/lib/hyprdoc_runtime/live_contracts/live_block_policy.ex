defmodule HyprdocRuntime.LiveContracts.LiveBlockPolicy do
  @enforce_keys [:block_id, :block_type, :mode]
  defstruct [
    :block_id,
    :block_type,
    :mode,
    :condition,
    :integration,
    allowed_paths: [],
    metadata: %{}
  ]

  @type mode :: :sealed | :live_append_only | :live_replaceable

  @type t :: %__MODULE__{
          block_id: String.t(),
          block_type: String.t(),
          mode: mode(),
          condition: map() | nil,
          integration: map() | nil,
          allowed_paths: [String.t()],
          metadata: map()
        }

  @spec mutable_after_seal?(t()) :: boolean()
  def mutable_after_seal?(%__MODULE__{mode: mode}) do
    mode in [:live_append_only, :live_replaceable]
  end

  @spec allows_path?(t(), String.t()) :: boolean()
  def allows_path?(%__MODULE__{allowed_paths: allowed_paths}, path) when is_binary(path) do
    Enum.any?(allowed_paths, &(&1 == path))
  end
end
