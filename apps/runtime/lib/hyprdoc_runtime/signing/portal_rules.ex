defmodule HyprdocRuntime.Signing.PortalRules do
  @moduledoc false

  alias HyprdocRuntime.Signing.Payload

  @active_statuses ~w(invited viewed authenticating ready signing)
  @signable_statuses ~w(ready signing)

  def validate_view(portal) do
    with :ok <- validate_active(portal),
         status when status in @active_statuses <- Payload.portal_status(portal) do
      :ok
    else
      _ -> {:error, :portal_not_viewable}
    end
  end

  def validate_challenge(portal, type) do
    with :ok <- validate_active(portal),
         true <- Payload.portal_requires_verification?(portal, type) or {:error, :challenge_not_required},
         false <- Payload.portal_verified?(portal, type) do
      :ok
    else
      true -> {:error, :challenge_already_verified}
      {:error, _} = error -> error
    end
  end

  def validate_field_save(portal, block_id) do
    with :ok <- validate_signable(portal),
         {:ok, block} <- fetch_block(portal, block_id),
         "text-input" <- Payload.block_type(block) do
      :ok
    else
      nil -> {:error, :block_not_assigned}
      {:error, _} = error -> error
      _ -> {:error, :block_not_text_input}
    end
  end

  def validate_signature(portal, block_id) do
    with :ok <- validate_signable(portal),
         {:ok, block} <- fetch_block(portal, block_id),
         "signature" <- Payload.block_type(block) do
      :ok
    else
      nil -> {:error, :block_not_assigned}
      {:error, _} = error -> error
      _ -> {:error, :block_not_signature_field}
    end
  end

  def validate_complete(portal) do
    with :ok <- validate_active(portal),
         "signing" <- Payload.portal_status(portal) do
      :ok
    else
      _ -> {:error, :portal_not_ready_to_complete}
    end
  end

  defp validate_signable(portal) do
    with :ok <- validate_active(portal),
         status when status in @signable_statuses <- Payload.portal_status(portal) do
      :ok
    else
      _ -> {:error, :portal_not_signable}
    end
  end

  defp validate_active(%{"error" => "expired"}), do: {:error, :portal_expired}

  defp validate_active(portal) do
    case Payload.portal_status(portal) do
      status when status in ["signed", "declined"] -> {:error, :portal_closed}
      status when status in @active_statuses -> :ok
      _ -> {:error, :invalid_signer_portal}
    end
  end

  defp fetch_block(portal, block_id) do
    case Payload.portal_block(portal, block_id) do
      nil -> {:error, :block_not_assigned}
      block -> {:ok, block}
    end
  end
end
