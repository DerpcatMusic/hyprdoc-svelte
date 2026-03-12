defmodule HyprdocRuntimeWeb.LiveContractsController do
  use HyprdocRuntimeWeb, :controller

  def show(conn, %{"document_id" => document_id}) do
    json(conn, %{
      provider: "phoenix",
      fetchedAt: System.system_time(:millisecond),
      projection: %{
        snapshot: %{
          documentId: document_id,
          documentVersion: 0,
          sealHash: "",
          sealedAt: 0
        },
        anchors: [],
        policies: [],
        chainHeads: [],
        liveEvents: [],
        lineageEvents: [],
        integrity: %{
          baseSealHash: "",
          currentSealHash: "",
          currentStateHash: nil,
          currentLastEventHash: nil,
          isSealAnchorCurrent: false,
          totalLiveEventCount: 0,
          totalLineageEventCount: 0
        }
      }
    })
  end

  def mutate(conn, %{"document_id" => document_id} = params) do
    json(conn, %{
      provider: "phoenix",
      fetchedAt: System.system_time(:millisecond),
      result: %{
        documentId: document_id,
        blockId: params["blockId"],
        path: params["path"],
        value: params["value"],
        eventHash: "",
        stateHash: ""
      }
    })
  end
end
