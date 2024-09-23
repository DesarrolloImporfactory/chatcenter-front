import { Route, Routes } from "react-router-dom";
import "./App.css";
import Home from "./pages/home/Home";
import Login from "./pages/login/Login";
import Register from "./pages/register/Register";
import PostId from "./pages/postId/PostId";
import ProtectedRoutes from "./pages/shared/ProtectedRoutes";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { getAllPostThunk } from "./store/slices/posts.slice";
import { getMyPostsThunk } from "./store/slices/myPosts.slice";
import Header from "./components/shared/Header";
import { UserId } from "./pages/userId/UserId";
import { Profile } from "./pages/profile/Profile";
import { Footer } from "./components/shared/Footer";
import { renewThunk } from "./store/slices/user.slice";

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(renewThunk());
  }, []);

  return (
    <div className="appflex flex-col h-screen bg-gray-100  ">
      <Header />
      <Routes>
        {/* <Route element={<ProtectedRoutes />}>
         
        </Route>
         */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<h1>Esta ruta no existe</h1>} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;
