import { type NextPage } from "next";
import { useSession } from "next-auth/react";
import Head from "next/head";
import { useState } from "react";
import { Header } from "~/components/Header";
import { NoteCard } from "~/components/NoteCard";
import { NoteEditor } from "~/components/NoteEditor";
import { Loading } from "~/components/ui/Loading";
import { api, type RouterOutputs } from "~/utils/api";
import { useAlert } from "~/hooks/useAlert";
import { AlertMessage } from "~/components/ui/AlertMessage";
import { Bars3Icon, TrashIcon } from "@heroicons/react/24/outline";
import { TopicsMenu } from "~/components/TopicsMenu";

const Home: NextPage = () => {
  const { data: session } = useSession();
  return (
    <>
      <Head>
        <title>T3 Notetaker</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <Header />

        {!session?.user ? "Please log in..." : <Content />}
      </main>
    </>
  );
};

export default Home;

export type Topic = RouterOutputs["topic"]["getAll"][0];

export const Content: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [topicsMenuIsOpen, setTopicsMenuIsOpen] = useState(false);

  const { alert, setAlert } = useAlert();

  const { data: session } = useSession();

  const utils = api.useContext();

  const { data: topics } = api.topic.getAll.useQuery(undefined, {
    enabled: session?.user !== undefined,
    onSuccess: (data) => setSelectedTopic(selectedTopic ?? data[0] ?? null),
  });

  const deleteTopic = api.topic.delete.useMutation({
    onSuccess: () => {
      void utils.topic.getAll.invalidate();
      void utils.note.getAll.invalidate();
      setSelectedTopic(null);
      setAlert({
        type: "SUCCESS",
        message: "Topic deleted",
      });
    },
  });

  const {
    data: notes,
    status,
    fetchStatus,
  } = api.note.getAll.useQuery(
    { topicId: selectedTopic?.id ?? "" },
    { enabled: session?.user !== undefined && selectedTopic !== null }
  );

  const createNote = api.note.create.useMutation({
    onSuccess: () => {
      void utils.note.getAll.invalidate();
    },
    onError: (error) => {
      setAlert({
        type: "ERROR",
        message: error.message,
      });
    },
  });

  const deleteNote = api.note.delete.useMutation({
    onSuccess: () => {
      void utils.note.getAll.invalidate();
      setAlert({
        type: "SUCCESS",
        message: "Note deleted",
      });
    },
  });

  const handleCreateNote = ({
    title,
    content,
  }: {
    title: string;
    content: string;
  }) => {
    if (!selectedTopic?.id) {
      setAlert({
        type: "ERROR",
        message: "No topic selected",
      });
      return;
    }

    createNote.mutate({
      title,
      content: content,
      topicId: selectedTopic.id,
    });
  };

  const handleDeleteNote = (id: string) => {
    deleteNote.mutate({
      id,
    });
  };

  return (
    <div className="drawer">
      <input
        id="my-drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={topicsMenuIsOpen}
        onChange={() => null}
      />
      <div className="drawer-content">
        <div className="relative mx-5 mt-5 grid grid-cols-4 gap-2">
          <div className="hidden md:block">
            <TopicsMenu
              selectedTopic={selectedTopic}
              setSelectedTopic={setSelectedTopic}
            />
          </div>
          <div className="col-span-4 md:col-span-3">
            <div className="flex items-center">
              <button
                onClick={() => setTopicsMenuIsOpen(true)}
                className="btn-primary drawer-button btn mr-4 flex max-w-[300px] md:hidden"
              >
                <div className="flex w-full items-center">
                  <Bars3Icon className="mr-3 h-6 w-6" />
                  {selectedTopic && (
                    <div className="shrink overflow-hidden text-ellipsis">
                      {selectedTopic?.title}
                    </div>
                  )}
                </div>{" "}
              </button>
              <h2 className="mx-3 hidden text-xl font-bold text-gray-400 md:block">
                /{selectedTopic?.title}
              </h2>
              {selectedTopic && (
                <div className="dropdown">
                  <label tabIndex={0} className="cursor-pointer">
                    <TrashIcon className="h-7 w-7 stroke-gray-500 hover:stroke-red-600" />
                  </label>
                  <ul
                    tabIndex={0}
                    className="dropdown-content menu rounded-box w-52 bg-base-100 p-2 shadow"
                  >
                    <li>
                      <button
                        onClick={() => {
                          deleteTopic.mutate({
                            id: selectedTopic.id,
                          });
                        }}
                      >
                        Delete
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
            {status === "loading" && fetchStatus !== "idle" ? (
              <Loading />
            ) : (
              notes?.map((note) => (
                <div key={note.id}>
                  <NoteCard onDelete={handleDeleteNote} note={note} />
                </div>
              ))
            )}

            {!topics ||
              (topics?.length === 0 && (
                <div className="text-center">
                  <h3 className="text-2xl font-semibold">
                    Create a topic to get started!
                  </h3>
                </div>
              ))}

            {topics && topics.length > 0 && (
              <NoteEditor
                isDisabled={!selectedTopic}
                onSave={handleCreateNote}
              />
            )}
          </div>

          {alert && <AlertMessage alert={alert} />}
        </div>
      </div>
      <div className="drawer-side">
        <label
          htmlFor="my-drawer"
          className="drawer-overlay"
          onClick={() => setTopicsMenuIsOpen(false)}
        ></label>
        <TopicsMenu
          selectedTopic={selectedTopic}
          setSelectedTopic={setSelectedTopic}
        />
      </div>
    </div>
  );
};