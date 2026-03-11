defmodule HyprdocRuntime.LiveContracts.ContractValidity do
  alias HyprdocRuntime.LiveContracts.LiveBlockPolicy
  alias HyprdocRuntime.LiveContracts.MutationEvent

  @type validity_result :: :valid | {:invalid, atom()}

  @spec validate_event(MutationEvent.t(), LiveBlockPolicy.t()) :: validity_result()
  def validate_event(%MutationEvent{mutation: %{path: path}}, %LiveBlockPolicy{} = policy) do
    cond do
      not LiveBlockPolicy.mutable_after_seal?(policy) ->
        {:invalid, :sealed_block}

      not LiveBlockPolicy.allows_path?(policy, path) ->
        {:invalid, :path_not_allowed}

      true ->
        :valid
    end
  end
end
