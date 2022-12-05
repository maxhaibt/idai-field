defmodule FieldHub.CouchService do
  defmodule Credentials do
    defstruct name: "<user_name>", password: "<user_password>"
  end

  require Logger

  def authenticate(database_name, %Credentials{} = credentials) do
    response =
      HTTPoison.get(
        "#{url()}/#{database_name}",
        headers(credentials)
      )

    case response do
      {:ok, %{status_code: 200}} ->
        :ok
      {:ok, res} ->
        {:error, res}
      error ->
        error
    end
  end

  def initial_setup(%Credentials{} = credentials) do
    {
      HTTPoison.put!(
        "#{url()}/_users",
        "",
        headers(credentials)
      ),
      HTTPoison.put!(
      "#{url()}/_replicator",
      "",
      headers(credentials)
      )
    }
  end

  def create_project(project_name, %Credentials{} = credentials) do

    database_name = encode_project_name(project_name)

    HTTPoison.put!(
      "#{url()}/#{database_name}",
      "",
      headers(credentials)
    )
  end

  def delete_project(project_name, %Credentials{} = credentials) do

    database_name = encode_project_name(project_name)

    HTTPoison.delete!(
      "#{url()}/#{database_name}",
      headers(credentials)
    )
  end

  def create_user(name, password, %Credentials{} = credentials) do
    HTTPoison.put!(
      "#{url()}/_users/org.couchdb.user:#{name}",
      Jason.encode!(%{name: name, password: password, roles: [], type: "user"}),
      headers(credentials)
    )
  end

  def delete_user(name, %Credentials{} = credentials) do

    %{"_rev" => rev } =
      HTTPoison.get!(
        "#{url()}/_users/org.couchdb.user:#{name}",
        headers(credentials)
      )
      |> Map.get(:body)
      |> Jason.decode!()

    HTTPoison.delete!(
      "#{url()}/_users/org.couchdb.user:#{name}",
      headers(credentials) ++ [{"If-Match", rev}]
    )
  end

  def set_password(user_name, new_password, %Credentials{} = credentials) do

    %{"_rev" => rev } =
      HTTPoison.get!(
        "#{url()}/_users/org.couchdb.user:#{user_name}",
        headers(credentials)
      )
      |> Map.get(:body)
      |> Jason.decode!()

    HTTPoison.put!(
      "#{url()}/_users/org.couchdb.user:#{user_name}",
      Jason.encode!(%{name: user_name, password: new_password, roles: [], type: "user"}),
      headers(credentials) ++ [{"If-Match", rev}]
    )
  end

  def add_project_admin(user_name, project_name, %Credentials{} = credentials) do

    database_name = encode_project_name(project_name)

    %{ body: body } =
      HTTPoison.get!(
        "#{url()}/#{database_name}/_security",
        headers(credentials)
      )

    %{ "admins" => existing_admins, "members" => existing_members } = Jason.decode!(body)

    update_data =
      %{
        admins: %{
          names:
            Map.get(existing_admins, "names", []) ++ [user_name]
            |> Enum.dedup(),
          roles: existing_admins["roles"]
        },
        members: existing_members
      }
      |> Jason.encode!()

    HTTPoison.put!(
      "#{url()}/#{database_name}/_security",
      update_data,
      headers(credentials)
    )
  end


  def add_project_member(user_name, project_name, %Credentials{} = credentials) do

    database_name = encode_project_name(project_name)

    %{ body: body } =
      HTTPoison.get!(
        "#{url()}/#{database_name}/_security",
        headers(credentials)
      )

    %{ "admins" => existing_admins, "members" => existing_members } = Jason.decode!(body)

    update_data =
      %{
        admins: existing_admins,
        members: %{
          names:
            Map.get(existing_members, "names", []) ++ [user_name]
            |> Enum.dedup(),
          roles: existing_members["roles"]
        }
      }
      |> Jason.encode!()

    HTTPoison.put!(
      "#{url()}/#{database_name}/_security",
      update_data,
      headers(credentials)
    )
  end

  def remove_user_from_project(user_name, project_name, %Credentials{} = credentials) do

    database_name = encode_project_name(project_name)

    %{ body: body } =
      HTTPoison.get!(
        "#{url()}/#{database_name}/_security",
        headers(credentials)
      )

    %{ "admins" => existing_admins, "members" => existing_members } = Jason.decode!(body)

    update_data =
      %{
        admins: %{
          names:
            Map.get(existing_admins, "names", [])
            |> List.delete(user_name),
          roles: existing_admins["roles"]
        },
        members: %{
          names:
            Map.get(existing_members, "names", [])
            |> List.delete(user_name),
          roles: existing_members["roles"]
        }
      }
      |> Jason.encode!()

    HTTPoison.put!(
      "#{url()}/#{database_name}/_security",
      update_data,
      headers(credentials)
    )
  end

  defp headers(%Credentials{name: user_name, password: user_password}) do
    credentials =
      "#{user_name}:#{user_password}"
      |> Base.encode64()

    [
      {"Content-Type", "application/json"},
      {"Authorization", "Basic #{credentials}"}
    ]
  end

  def encode_project_name(project_name) do
    encoded =
      project_name
      |> URI.encode()
      |> String.replace("%", "$")

    if String.contains?(encoded, "$") do
      "project_#{encoded}"
      |> String.downcase()
    else
      encoded
    end
  end

  def decode_project_name(database_name) do
    if String.contains?(database_name, "$") do
      database_name
      |> String.replace("project_", "")
      |> String.replace("$", "%")
      |> URI.decode()
    else
      database_name
    end
  end

  def url() do
    Application.get_env(:field_hub, :couchdb_url)
  end
end
