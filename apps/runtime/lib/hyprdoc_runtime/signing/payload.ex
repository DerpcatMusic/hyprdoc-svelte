defmodule HyprdocRuntime.Signing.Payload do
  @moduledoc false

  @session_statuses ~w(draft pending in_progress completed cancelled expired)
  @signing_orders ~w(parallel sequential)
  @assignment_statuses ~w(pending invited viewed authenticating ready signing signed declined)
  @auth_methods ~w(none email phone both)
  @challenge_types ~w(email phone)
  @signature_types ~w(draw type upload)

  def normalize_create_session_request(params) when is_map(params) do
    with {:ok, document_id} <- fetch_non_empty_string(params, ["documentId", :documentId]),
         {:ok, signing_order} <- fetch_enum_value(params, ["signingOrder", :signingOrder], @signing_orders) do
      {:ok,
       %{
         "documentId" => document_id,
         "signingOrder" => signing_order,
         "expiresAt" => fetch_optional_number(params, ["expiresAt", :expiresAt]),
         "reminderIntervalHours" =>
           fetch_optional_number(params, ["reminderIntervalHours", :reminderIntervalHours]),
         "settings" => fetch_map_or_nil(params, ["settings", :settings])
       }
       |> reject_nil_values()}
    end
  end

  def normalize_create_session_request(_), do: {:error, :invalid_signing_session_request}

  def normalize_session(payload) when is_map(payload) do
    with {:ok, id} <- fetch_non_empty_string(payload, ["_id", :_id]),
         {:ok, document_id} <- fetch_non_empty_string(payload, ["documentId", :documentId]),
         {:ok, status} <- fetch_enum_value(payload, ["status", :status], @session_statuses),
         {:ok, signing_order} <-
           fetch_enum_value(payload, ["signingOrder", :signingOrder], @signing_orders),
         signers when is_list(signers) <- fetch_value(payload, ["signers", :signers]) do
      {:ok,
       payload
       |> Map.put("_id", id)
       |> Map.put("documentId", document_id)
       |> Map.put("status", status)
       |> Map.put("signingOrder", signing_order)
       |> Map.put("signers", signers)}
    else
      _ -> {:error, :invalid_signing_session}
    end
  end

  def normalize_session(_), do: {:error, :invalid_signing_session}

  def normalize_create_session_response(%{"sessionId" => session_id, "reused" => reused} = payload)
      when is_binary(session_id) and is_boolean(reused) do
    {:ok, payload}
  end

  def normalize_create_session_response(%{sessionId: session_id, reused: reused})
      when is_binary(session_id) and is_boolean(reused) do
    {:ok, %{"sessionId" => session_id, "reused" => reused}}
  end

  def normalize_create_session_response(_), do: {:error, :invalid_create_session_response}

  def normalize_assign_signer_request(params) when is_map(params) do
    with {:ok, email} <- fetch_non_empty_string(params, ["email", :email]),
         {:ok, legal_name} <- fetch_non_empty_string(params, ["legalName", :legalName]),
         {:ok, role} <- fetch_non_empty_string(params, ["role", :role]),
         {:ok, order} <- fetch_number(params, ["order", :order]),
         {:ok, auth_method} <- fetch_enum_value(params, ["authMethod", :authMethod], @auth_methods) do
      {:ok,
       %{
         "slotId" => fetch_optional_string(params, ["slotId", :slotId]),
         "partyId" => fetch_optional_string(params, ["partyId", :partyId]),
         "email" => email,
         "phone" => fetch_optional_string(params, ["phone", :phone]),
         "phoneCountryCode" => fetch_optional_string(params, ["phoneCountryCode", :phoneCountryCode]),
         "legalName" => legal_name,
         "role" => role,
         "color" => fetch_optional_string(params, ["color", :color]),
         "order" => order,
         "authMethod" => auth_method
       }
       |> reject_nil_values()}
    end
  end

  def normalize_assign_signer_request(_), do: {:error, :invalid_signer_assignment_request}

  def normalize_assign_signer_response(%{"assignmentId" => assignment_id, "reused" => reused} = payload)
      when is_binary(assignment_id) and is_boolean(reused) do
    {:ok, payload}
  end

  def normalize_assign_signer_response(%{assignmentId: assignment_id, reused: reused}) 
      when is_binary(assignment_id) and is_boolean(reused) do
    {:ok, %{"assignmentId" => assignment_id, "reused" => reused}}
  end

  def normalize_assign_signer_response(_), do: {:error, :invalid_signer_assignment_response}

  def normalize_start_session_response(%{"success" => success, "signerCount" => signer_count, "alreadyStarted" => already_started} = payload)
      when is_boolean(success) and is_integer(signer_count) and is_boolean(already_started) do
    {:ok, payload}
  end

  def normalize_start_session_response(%{success: success, signerCount: signer_count, alreadyStarted: already_started})
      when is_boolean(success) and is_integer(signer_count) and is_boolean(already_started) do
    {:ok, %{"success" => success, "signerCount" => signer_count, "alreadyStarted" => already_started}}
  end

  def normalize_start_session_response(_), do: {:error, :invalid_start_session_response}

  def normalize_portal(payload) when is_map(payload) do
    cond do
      fetch_value(payload, ["error", :error]) == "expired" ->
        {:ok, %{"error" => "expired"}}

      true ->
        with {:ok, assignment_id} <- fetch_non_empty_string(payload, ["assignmentId", :assignmentId]),
             {:ok, document_id} <- fetch_non_empty_string(payload, ["documentId", :documentId]),
             {:ok, status} <-
               fetch_enum_value(payload, ["status", :status], @assignment_statuses),
             {:ok, session_status} <- portal_session_status(payload),
             {:ok, signing_order} <- portal_signing_order(payload),
             assigned_blocks when is_list(assigned_blocks) <-
               fetch_value(payload, ["assignedBlocks", :assignedBlocks]) do
          session =
            payload
            |> fetch_value(["session", :session])
            |> case do
              value when is_map(value) -> value
              _ -> %{}
            end

          {:ok,
           payload
           |> Map.put("assignmentId", assignment_id)
           |> Map.put("documentId", document_id)
           |> Map.put("status", status)
           |> Map.put("session", Map.merge(session, %{"status" => session_status, "signingOrder" => signing_order}))
           |> Map.put("assignedBlocks", assigned_blocks)}
        else
          _ -> {:error, :invalid_signer_portal}
        end
    end
  end

  def normalize_portal(_), do: {:error, :invalid_signer_portal}

  def normalize_record_view_request(params) when is_map(params) do
    with {:ok, metadata} <- fetch_map(params, ["metadata", :metadata]),
         {:ok, ip_address} <- fetch_non_empty_string(metadata, ["ipAddress", :ipAddress]),
         {:ok, user_agent} <- fetch_non_empty_string(metadata, ["userAgent", :userAgent]) do
      {:ok,
       %{
         "metadata" => %{
           "ipAddress" => ip_address,
           "userAgent" => user_agent,
           "deviceFingerprint" =>
             fetch_optional_string(metadata, ["deviceFingerprint", :deviceFingerprint])
         }
         |> reject_nil_values()
       }}
    end
  end

  def normalize_record_view_request(_), do: {:error, :invalid_record_view_request}

  def normalize_record_view_response(%{
        "assignmentId" => assignment_id,
        "documentId" => document_id,
        "legalName" => legal_name,
        "role" => role,
        "authMethod" => auth_method,
        "needsEmailVerification" => needs_email_verification,
        "needsPhoneVerification" => needs_phone_verification
      } = payload)
      when is_binary(assignment_id) and is_binary(document_id) and is_binary(legal_name) and
             is_binary(role) and auth_method in @auth_methods and
             is_boolean(needs_email_verification) and is_boolean(needs_phone_verification) do
    {:ok, payload}
  end

  def normalize_record_view_response(_), do: {:error, :invalid_record_view_response}

  def normalize_send_challenge_request(params) when is_map(params) do
    with {:ok, type} <- fetch_enum_value(params, ["type", :type], @challenge_types) do
      {:ok, %{"type" => type}}
    end
  end

  def normalize_send_challenge_request(_), do: {:error, :invalid_send_challenge_request}

  def normalize_send_challenge_response(%{"challengeId" => challenge_id, "sentTo" => sent_to, "expiresAt" => expires_at} = payload)
      when is_binary(challenge_id) and is_binary(sent_to) and is_integer(expires_at) do
    {:ok, payload}
  end

  def normalize_send_challenge_response(_), do: {:error, :invalid_send_challenge_response}

  def normalize_verify_challenge_request(params) when is_map(params) do
    with {:ok, code} <- fetch_non_empty_string(params, ["code", :code]) do
      {:ok,
       %{
         "code" => code,
         "metadata" => fetch_map_or_nil(params, ["metadata", :metadata])
       }
       |> reject_nil_values()}
    end
  end

  def normalize_verify_challenge_request(_), do: {:error, :invalid_verify_challenge_request}

  def normalize_verify_challenge_response(%{
        "verified" => verified,
        "isFullyVerified" => is_fully_verified,
        "needsAdditionalVerification" => needs_additional_verification
      } = payload)
      when is_boolean(verified) and is_boolean(is_fully_verified) and
             is_boolean(needs_additional_verification) do
    {:ok, payload}
  end

  def normalize_verify_challenge_response(_), do: {:error, :invalid_verify_challenge_response}

  def normalize_save_field_value_request(params) when is_map(params) do
    with {:ok, block_id} <- fetch_non_empty_string(params, ["blockId", :blockId]),
         {:ok, value} <- fetch_string(params, ["value", :value]) do
      {:ok, %{"blockId" => block_id, "value" => value}}
    end
  end

  def normalize_save_field_value_request(_), do: {:error, :invalid_field_value_request}

  def normalize_save_field_value_response(%{"blockId" => block_id, "stored" => stored} = payload)
      when is_binary(block_id) and is_boolean(stored) do
    {:ok, payload}
  end

  def normalize_save_field_value_response(_), do: {:error, :invalid_field_value_response}

  def normalize_record_signature_request(params) when is_map(params) do
    with {:ok, block_id} <- fetch_non_empty_string(params, ["blockId", :blockId]),
         {:ok, signature_type} <-
           fetch_enum_value(params, ["signatureType", :signatureType], @signature_types),
         {:ok, signature_data} <- fetch_non_empty_string(params, ["signatureData", :signatureData]),
         {:ok, metadata} <- fetch_map(params, ["metadata", :metadata]),
         {:ok, ip_address} <- fetch_non_empty_string(metadata, ["ipAddress", :ipAddress]),
         {:ok, user_agent} <- fetch_non_empty_string(metadata, ["userAgent", :userAgent]) do
      {:ok,
       %{
         "blockId" => block_id,
         "signatureType" => signature_type,
         "signatureData" => signature_data,
         "metadata" => %{
           "ipAddress" => ip_address,
           "userAgent" => user_agent,
           "deviceFingerprint" =>
             fetch_optional_string(metadata, ["deviceFingerprint", :deviceFingerprint]),
           "geolocation" => fetch_map_or_nil(metadata, ["geolocation", :geolocation])
         }
         |> reject_nil_values()
       }}
    end
  end

  def normalize_record_signature_request(_), do: {:error, :invalid_record_signature_request}

  def normalize_record_signature_response(%{"signatureId" => signature_id} = payload)
      when is_binary(signature_id) do
    {:ok, payload}
  end

  def normalize_record_signature_response(_), do: {:error, :invalid_record_signature_response}

  def normalize_complete_response(%{"completed" => completed, "sessionStatus" => session_status} = payload)
      when is_boolean(completed) and session_status in @session_statuses do
    {:ok, payload}
  end

  def normalize_complete_response(_), do: {:error, :invalid_complete_signing_response}

  def portal_block(portal, block_id) when is_map(portal) and is_binary(block_id) do
    portal
    |> Map.get("assignedBlocks", [])
    |> Enum.find(&(map_string_key(&1, "id") == block_id))
  end

  def portal_status(portal) when is_map(portal), do: map_string_key(portal, "status")
  def portal_status(_), do: nil

  def portal_verified?(portal, "email"), do: map_boolean_key(portal, "emailVerified")
  def portal_verified?(portal, "phone"), do: map_boolean_key(portal, "phoneVerified")
  def portal_verified?(_portal, _type), do: false

  def portal_requires_verification?(portal, "email") do
    setting_value(portal, "requireEmailVerification")
  end

  def portal_requires_verification?(portal, "phone") do
    setting_value(portal, "requirePhoneVerification")
  end

  def portal_requires_verification?(_portal, _type), do: false

  def block_type(block) when is_map(block), do: map_string_key(block, "blockType")
  def block_type(_), do: nil

  defp portal_session_status(payload) do
    session = fetch_value(payload, ["session", :session])

    case map_string_key(session, "status") do
      value when value in @session_statuses -> {:ok, value}
      _ -> {:error, :invalid_signer_portal}
    end
  end

  defp portal_signing_order(payload) do
    session = fetch_value(payload, ["session", :session])

    case map_string_key(session, "signingOrder") do
      value when value in @signing_orders -> {:ok, value}
      _ -> {:error, :invalid_signer_portal}
    end
  end

  defp setting_value(portal, key) do
    portal
    |> fetch_value(["settings", :settings])
    |> map_boolean_key(key)
  end

  defp reject_nil_values(map) when is_map(map) do
    Map.reject(map, fn {_key, value} -> is_nil(value) end)
  end

  defp fetch_non_empty_string(map, keys) do
    case fetch_value(map, keys) do
      value when is_binary(value) and value != "" -> {:ok, value}
      _ -> {:error, :missing_required_field}
    end
  end

  defp fetch_string(map, keys) do
    case fetch_value(map, keys) do
      value when is_binary(value) -> {:ok, value}
      _ -> {:error, :missing_required_field}
    end
  end

  defp fetch_number(map, keys) do
    case fetch_value(map, keys) do
      value when is_integer(value) or is_float(value) -> {:ok, value}
      _ -> {:error, :missing_required_field}
    end
  end

  defp fetch_optional_number(map, keys) do
    case fetch_value(map, keys) do
      value when is_integer(value) or is_float(value) -> value
      _ -> nil
    end
  end

  defp fetch_optional_string(map, keys) do
    case fetch_value(map, keys) do
      value when is_binary(value) and value != "" -> value
      _ -> nil
    end
  end

  defp fetch_enum_value(map, keys, allowed) do
    case fetch_value(map, keys) do
      value when value in allowed -> {:ok, value}
      _ -> {:error, :invalid_enum_value}
    end
  end

  defp fetch_map(map, keys) do
    case fetch_value(map, keys) do
      value when is_map(value) -> {:ok, value}
      _ -> {:error, :missing_required_field}
    end
  end

  defp fetch_map_or_nil(map, keys) do
    case fetch_value(map, keys) do
      value when is_map(value) -> value
      _ -> nil
    end
  end

  defp fetch_value(map, keys) do
    Enum.find_value(keys, fn key ->
      case Map.fetch(map, key) do
        {:ok, value} -> value
        :error -> nil
      end
    end)
  end

  defp map_string_key(map, key) when is_map(map) do
    Map.get(map, key) || Map.get(map, String.to_atom(key))
  rescue
    ArgumentError -> nil
  end

  defp map_boolean_key(map, key) when is_map(map) do
    case Map.get(map, key) || Map.get(map, String.to_atom(key)) do
      true -> true
      _ -> false
    end
  rescue
    ArgumentError -> false
  end
end
