defmodule FieldPublicationWeb.PublicationLive.ReplicationFormComponent do
  alias FieldPublication.Replication
  use FieldPublicationWeb, :live_component

  alias FieldPublication.Projects
  alias FieldPublication.Publications
  alias FieldPublication.Schemas.Publication
  alias FieldPublication.Schemas.ReplicationInput

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <.header>
        <%= @page_title %>
      </.header>

      <.simple_form
        for={@form}
        id="replication-form"
        phx-change="validate"
        phx-submit="start"
        phx-target={@myself}
      >
        <h2 class="text-2xl">Connection data</h2>
        <div :if={@initialization_error} class="border-red-800 bg-red-200 p-2 border-2 rounded">
          <%= @initialization_error %>
        </div>
        <.input field={@form[:source_url]} type="url" label="Source URL" />
        <.input field={@form[:source_project_name]} type="text" label="Source project name" />
        <.input field={@form[:source_user]} type="text" label="Source user name" />
        <.input field={@form[:source_password]} type="password" label="Source user password" />
        <.input field={@form[:project_name]} type="hidden" />

        <%= if @action == :new do %>
          <h2 class="text-2xl">Options</h2>

          <.input
            field={@form[:delete_existing_publication]}
            type="checkbox"
            label="Delete existing publication"
          />

          <.live_component
            module={FieldPublicationWeb.TranslationLive.FormComponent}
            id={@form[:comments]}
            form_field={@form[:comments]}
            add="add_comment"
            remove="remove_comment"
            target={@myself}
          />
        <% end %>
        <:actions>
          <.button phx-disable-with="Initializing...">Start replication</.button>
        </:actions>
      </.simple_form>
    </div>
    """
  end

  @impl true
  def update(assigns, socket) do
    {
      :ok,
      socket
      |> assign(:page_title, "Create new publication draft")
      |> assign(assigns)
      |> assign(:initialization_error, nil)
      |> assign(:form,
        assigns
        |> create_changeset()
        |> to_form()
      )
    }
  end

  @impl true
  def handle_event("validate", %{"replication_input" => replication_params}, socket) do
    changeset =
      %ReplicationInput{}
      |> ReplicationInput.changeset(replication_params)
      |> Map.put(:action, :validate)

    {
      :noreply,
      socket
      |> assign(:initialization_error, nil)
      |> assign(:form, to_form(changeset))
    }
  end

  @impl true
  def handle_event("add_comment", _, %{assigns: %{form: %{source: changeset}}} = socket) do
    current_comments = Ecto.Changeset.get_field(changeset, :comments)

    changeset =
      Ecto.Changeset.put_embed(
        changeset,
        :comments,
        current_comments ++ [%{text: "", language: ""}]
      )

    {
      :noreply,
      socket
      |> assign(:form, to_form(changeset))
    }
  end

  @impl true
  def handle_event(
        "remove_comment",
        %{"id" => "parameters_comments_" <> id},
        %{assigns: %{form: %{source: changeset}}} = socket
      ) do
    {index, _remainder} = Integer.parse(id)

    updated_comments =
      changeset
      |> Ecto.Changeset.get_field(:comments)
      |> List.delete_at(index)

    changeset =
      changeset
      |> Ecto.Changeset.put_embed(:comments, updated_comments)

    {
      :noreply,
      socket
      |> assign(:form, to_form(changeset))
    }
  end

  def handle_event("start", %{"replication_input" => replication_params}, %{assigns: assigns} = socket) do

    socket =
      replication_params
      |> ReplicationInput.create()
      |> case do
        {:error, changeset} ->
          socket
          |> assign(:form, to_form(changeset))

        {:ok, parameters} ->
          apply_action(parameters, socket)
      end

    {:noreply, socket}
  end

  defp create_changeset(%{project_name: project_name, draft_date: draft_date, action: :edit}) do
    publication = Publications.get!(project_name, draft_date)

    ReplicationInput.changeset(%ReplicationInput{}, %{
        source_url: publication.source_url,
        source_project_name: publication.source_project_name,
        source_user: publication.source_project_name,
        project_name: publication.project_name
      }
    )
  end

  defp create_changeset(%{project_name: project_name, action: :new}) do
    ReplicationInput.changeset(%ReplicationInput{}, %{
      source_project_name: project_name,
      source_user: project_name,
      project_name: project_name,
      comments: []
    })
  end

  defp apply_action(%ReplicationInput{} = parameters, %{assigns: %{action: :new}} = socket) do
    Replication.initialize(parameters)
    |> case do
      {:ok, %Publication{} = publication} ->
        notify_parent({parameters, publication})
        socket

      {:error, %Ecto.Changeset{} = changeset} ->
        socket
        |> assign(:form, to_form(changeset))

      {:error, msg} ->
        socket
        |> assign(:initialization_error, msg)
    end
  end

  defp apply_action(%ReplicationInput{} = parameters, %{assigns: %{action: :edit}} = socket) do
    Replication.check_source_connection(parameters)
    |> case do
      {:ok, :connection_successful} ->
        notify_parent({parameters})
        socket

      {:error, msg} ->
        socket
        |> assign(:initialization_error, msg)
    end
  end

  defp notify_parent(msg), do: send(self(), {__MODULE__, msg})
end
