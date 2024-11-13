import PostCard from "../../components/home/PostCard";
import "./home.css";
import { useDispatch, useSelector } from "react-redux";

/* ----  */

const Home = () => {
  const dispatch = useDispatch();

  // sino detecta token, redirige a login

  /* useEffect(() => {
    console.log(posts);
    socket.on("render-new-post", (data) => {
      dispatch(addPost(data));
      console.log("Se ha creado un post", data);
    });
  }, [socket]);
 */
  const handleCreatePost = () => {
    setIsCloseForm(false);
  };

  return (
    <div className="home">
      <h1 className="home__title">Infinite Insights</h1>
      <p className="home__description">
        Discover a unique perspective on Infinite Insights, where we explore a
        wide range of topics and provide you with fresh and surprising ideas.
        From technology to art, from science to culture, our team of experts
        will guide you through a fascinating intellectual journey. Join us in
        the quest for endless knowledge.
      </p>
      <div className="home__post-container"></div>
      <button onClick={handleCreatePost} className="home__btn">
        +
      </button>
    </div>
  );
};

export default Home;
