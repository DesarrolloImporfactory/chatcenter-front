import { useForm } from "react-hook-form";
import "./register.css";
import { useDispatch } from "react-redux";
import { registerThunk } from "./../../store/slices/user.slice";
import { useState } from "react";
import { useNavigate } from "react-router";

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { register, handleSubmit, reset } = useForm();
  const [file, setFile] = useState([]);

  const submit = (data) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("email", data.email);
    formData.append("password", data.password);
    console.log(file[0]);
    formData.append("profileImgUrl", file[0]);
    formData.append("profileImgUrl", data.profileImgUrl);
    formData.append("description", data.description);
    reset({
      name: "",
      email: "",
      password: "",
      profileImgUrl: "",
      description: "",
    });
    dispatch(registerThunk(formData));
    navigate("/");
  };

  return (
    <div className="register">
      <h1 className="register__title">Create a new User</h1>
      <form className="register__form" onSubmit={handleSubmit(submit)}>
        <div className="register__section">
          <label className="register__label" htmlFor="name">
            Name
          </label>
          <input
            className="register__input"
            {...register("name")}
            type="text"
            id="name"
          />
        </div>
        <div className="register__section">
          <label className="register__label" htmlFor="email">
            Email
          </label>
          <input
            className="register__input"
            {...register("email")}
            type="email"
            id="email"
          />
        </div>
        <div className="register__section">
          <label className="register__label" htmlFor="password">
            Password
          </label>
          <input
            className="register__input"
            {...register("password")}
            type="password"
            id="password"
          />
        </div>
        <div className="register__section">
          <label className="register__label" htmlFor="description">
            Description
          </label>
          <input
            className="register__input"
            {...register("description")}
            type="text"
            id="description"
          />
        </div>

        <div className="register__section">
          <label for="archivo" className="register__label" htmlFor="imgProfile">
            Avatar Profile
          </label>
          <input
            required
            type="file"
            id="file"
            name="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files)}
          />
        </div>
        <button className="register__btn">Submit</button>
      </form>
    </div>
  );
};

export default Register;
