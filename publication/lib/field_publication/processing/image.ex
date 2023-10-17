defmodule FieldPublication.Processing.Image do
  alias FieldPublication.CouchService
  alias Phoenix.PubSub

  alias FieldPublication.FileService
  alias FieldPublication.Publications

  alias FieldPublication.Schemas.{
    Publication
  }

  @filestore_root Application.compile_env(:field_publication, :file_store_directory_root)
  @dev_mode Application.compile_env(:field_publication, :dev_routes)

  def evaluate_web_images_state(%Publication{project_name: project_name, database: database} = publication) do
    %{image: current_raw_files} = FileService.list_raw_data_files(project_name)

    current_web_files = FileService.list_web_image_files(project_name)

    publication_image_categories = Publications.list_with_all_child_categories(publication, "Image")
    {existing, missing} =
      CouchService.get_document_stream(%{
        selector: %{
          "$or":
            Enum.map(publication_image_categories, fn category ->
              [
                %{"resource.category" => category},
                %{"resource.type" => category}
              ]
            end)
            |> List.flatten()
        }
      }, database)
      |> Stream.map(fn(%{"_id" => uuid}) ->
        uuid
      end)
      |> Enum.split_with(fn(uuid) ->
        "#{uuid}.jp2" in current_web_files
      end)

    missing_raw_files = missing -- current_raw_files
    existing_raw_files = missing -- missing_raw_files

    overall_count = Enum.count(existing) + Enum.count(missing)
    existing_count = Enum.count(existing)

    %{
      processed: existing,
      existing_raw_files: existing_raw_files,
      missing_raw_files: missing_raw_files,
      summary: %{overall: overall_count, counter: existing_count, percentage: existing_count / overall_count * 100}
    }
  end

  def start_web_image_processing(%Publication{project_name: project_name} = publication) do

    %{existing_raw_files: existing_raw_files, summary: summary} = evaluate_web_images_state(publication)

    raw_root = FileService.get_raw_data_path(project_name)
    web_root = FileService.get_web_images_path(project_name)

    # TODO: Log missing raw files

    {:ok, counter_pid} =
      Agent.start_link(fn ->summary end)

    existing_raw_files
    |> Enum.chunk_every(5)
    |> Enum.map(fn (batch) ->
      # For each item in the batch start an async task for the conversion...
      Enum.map(batch, fn(uuid) ->
        Task.async(fn() ->
          convert_file(
            "#{raw_root}/image/#{uuid}",
            "#{web_root}/#{uuid}.jp2",
            counter_pid,
            Publications.get_doc_id(publication)
          )
        end)
      end)
      # ...then wait until all tasks in the batch succeeded.
      |> Enum.map(&Task.await(&1, 30_000))
    end)
    |> List.flatten()
  end


  @dialyzer {:nowarn_function, convert_file: 4}
  defp convert_file(input_file_path, target_file_path, counter_pid, channel) do
    if @dev_mode do
      input_file_path = String.replace(input_file_path, "#{@filestore_root}/raw/", "")
      target_file_path = String.replace(target_file_path, "#{@filestore_root}/web_images/", "")

      {"", 0} =
        System.shell(
          "docker exec -u root:root field_publication_cantaloupe convert /source_images/#{input_file_path} /image_root/#{target_file_path}"
        )
    else
      System.cmd("convert", [input_file_path, target_file_path])
    end

    Agent.update(counter_pid, fn state -> Map.put(state, :counter, state[:counter] + 1) end)

    PubSub.broadcast(
      FieldPublication.PubSub,
      channel,
      {
        :web_image_processing,
        Agent.get(counter_pid, fn state -> state end)
      }
    )
  end
end
