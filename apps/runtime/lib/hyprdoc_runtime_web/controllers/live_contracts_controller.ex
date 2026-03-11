defmodule HyprdocRuntimeWeb.LiveContractsController do
  use HyprdocRuntimeWeb, :controller

  def show(conn, %{"document_id" => document_id}) do
    json(conn, %{
      documentId: document_id,
      status: "stub",
      message: "Phoenix runtime projection not wired yet"
    })
  end
end
