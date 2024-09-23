import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { loginThunk } from "./../../store/slices/user.slice";
import { useNavigate } from "react-router-dom";
import "./login.css";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { handleSubmit, reset, register } = useForm();

  const submit = (data) => {
    dispatch(loginThunk(data));
    navigate("/");
    reset({
      email: "",
      con: "",
    });
  };

  return (
    <div className="grid place-content-center h-[calc(100vh_-_400px)]">
      <div className="bg-white p-5">
        <h1 className="text-4xl text-center pb-2">Login</h1>
        <form className="login__form" onSubmit={handleSubmit(submit)}>
          <div className="grid">
            <label className="login__label" htmlFor="email">
              Email
            </label>
            <input
              className="px-2 py-1 border border-gray-300 rounded-md"
              {...register("email")}
              type="email"
              id="email"
            />
          </div>
          <div className="grid">
            <label className="" htmlFor="password">
              Password
            </label>
            <input
              className="px-2 py-1 border border-gray-300 rounded-md"
              {...register("con")}
              type="password"
              id="con"
            />
          </div>
          <div className="grid place-content-center pt-3">
            <button className="py-1 px-4 bg-blue-950 rounded-lg text-white ">
              Acceder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
