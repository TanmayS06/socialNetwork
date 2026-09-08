import CreatePostTrigger from "./CreatePostTrigger"
import PostList from "../posts/PostList"

const Thread = () => {
  return (
    <>
      <div className="sticky top-0 z-10 mb-2 border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <h1 className="px-4 py-3 text-xl font-semibold">Home</h1>
      </div>
      <CreatePostTrigger />
      <PostList />
    </>
  )
}

export default Thread
