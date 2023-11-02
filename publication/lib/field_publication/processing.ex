defmodule FieldPublication.Processing do
  use GenServer
  alias FieldPublication.Processing.Image
  alias FieldPublication.Schemas.Publication
  alias FieldPublication.Publications

  require Logger

  def start_link(_opts) do
    Logger.debug("Starting Processing GenServer")
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  def init(_) do
    Logger.debug("Initializing Processing GenServer")
    {:ok, []}
  end

  ## API Functions to be called from the rest of the application

  def start(%Publication{} = publication) do
    GenServer.call(__MODULE__, {:start, publication, :web_images})
  end

  def start(%Publication{} = publication, type) when type in [:web_images] do
    GenServer.call(__MODULE__, {:start, publication, type})
  end

  def show() do
    GenServer.call(__MODULE__, :show)
  end

  def show(%Publication{} = publication) do
    GenServer.call(__MODULE__, {:show, publication})
  end

  def show(%Publication{} = publication, type) when type in [:web_images] do
    GenServer.call(__MODULE__, {:show, publication, type})
  end

  def stop() do
    GenServer.call(__MODULE__, :stop)
  end

  def stop(%Publication{} = publication) do
    GenServer.call(__MODULE__, {:stop, publication})
  end

  def stop(%Publication{} = publication, type) when type in [:web_images] do
    GenServer.call(__MODULE__, {:stop, publication, type})
  end

  ## GenServer functions that are triggered by the API functions above.

  def handle_call({:start, %Publication{} = publication, :web_images}, _from, running_tasks) do
    publication_id = Publications.get_doc_id(publication)

    Enum.any?(running_tasks, fn {_task, :web_images, context} ->
      publication_id == context
    end)
    |> case do
      false ->
        task =
          Task.Supervisor.async_nolink(
            FieldPublication.ProcessingSupervisor,
            Image,
            :start_web_image_processing,
            [publication]
          )

        {:reply, :ok, running_tasks ++ [{task, :web_images, publication_id}]}

      true ->
        {:reply, :already_running, running_tasks}
    end
  end

  def handle_call(:show, _from, running_tasks) do
    {:reply, running_tasks, running_tasks}
  end

  def handle_call({:show, %Publication{} = publication}, _from, running_tasks) do
    publication_tasks =
      Enum.filter(running_tasks, fn {_task, _type, context} ->
        context == Publications.get_doc_id(publication)
      end)

    {:reply, publication_tasks, running_tasks}
  end

  def handle_call({:show, %Publication{} = publication, requested_type}, _from, running_tasks) do
    requested_task =
      Enum.find(running_tasks, fn {_task, type, context} ->
        context == Publications.get_doc_id(publication) and type == requested_type
      end)

    {:reply, requested_task, running_tasks}
  end

  def handle_call(:stop, _from, running_tasks) do
    Logger.debug("Stopping all processing for all publications.")

    Enum.each(running_tasks, fn {task, _type, _context} ->
      Process.exit(task.pid, :stopped)
    end)

    {:reply, :ok, []}
  end

  def handle_call({:stop, %Publication{} = publication}, _from, running_tasks) do
    Logger.debug(
      "Stopping all processing for publication #{Publications.get_doc_id(publication)}."
    )

    {publication_tasks, remaining_tasks} =
      Enum.split_with(running_tasks, fn {_task, _type, context} ->
        context == Publications.get_doc_id(publication)
      end)

    Enum.each(publication_tasks, fn {task, _type, _context} ->
      Process.exit(task.pid, :stopped)
    end)

    {:reply, :ok, remaining_tasks}
  end

  def handle_call({:stop, %Publication{} = publication, requested_type}, _from, running_tasks) do
    Logger.debug(
      "Stopping '#{requested_type}' processing for publication #{Publications.get_doc_id(publication)}."
    )

    {publication_tasks, remaining_tasks} =
      Enum.split_with(running_tasks, fn {_task, type, context} ->
        context == Publications.get_doc_id(publication) and type == requested_type
      end)

    Enum.each(publication_tasks, fn {task, _type, _context} ->
      Process.exit(task.pid, :stopped)
    end)

    {:reply, :ok, remaining_tasks}
  end

  def handle_info({ref, _answer}, running_tasks) do
    Logger.debug("A processing task has completed successfully.")
    Process.demonitor(ref, [:flush])
    {:noreply, cleanup(ref, running_tasks)}
  end

  def handle_info({:DOWN, ref, :process, _pid, :stopped}, running_tasks) do
    Logger.debug("A processing task was stopped by user.")
    {:noreply, cleanup(ref, running_tasks)}
  end

  def handle_info({:DOWN, ref, :process, _pid, _reason}, running_tasks) do
    Logger.error("A processing task failed irregularly.")
    {:noreply, cleanup(ref, running_tasks)}
  end

  defp cleanup(ref, task_list) do
    Enum.split_with(task_list, fn {task, _type, _context} ->
      task.ref == ref
    end)
    |> case do
      {[{_task, type, context}], rest} ->
        Logger.debug("Removing task '#{type}' for '#{context}' from task list.")
        rest

      {[], rest} ->
        rest
    end
  end
end
