defmodule HyprdocRuntimeWeb.HealthController do
  use HyprdocRuntimeWeb, :controller

  def show(conn, _params) do
    json(conn, %{ok: true, service: "hyprdoc-runtime"})
  end
end
