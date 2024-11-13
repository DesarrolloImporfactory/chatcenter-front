import React, { useState } from "react";
import "./styles/formPost.css";
import { useForm } from "react-hook-form";
import usePostCrud from "../../hooks/usePostCrud";

const FormPost = ({ isCloseForm, setIsCloseForm, socket }) => {
  const { handleSubmit, reset, register } = useForm();
  const [file, setFile] = useState([]);

  const handleClick = (e) => {
    setIsCloseForm(true);
  };
  const handleFormClick = (e) => {
    e.stopPropagation();
  };

  const { createNewPost } = usePostCrud();

  const submit = (data) => {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("content", data.description);
    for (let i = 0; i < file.length; i++) {
      formData.append("postImgs", file[i]);
    }
    createNewPost(formData, socket);
    reset();
  };

  return (
    <div
      onClick={handleClick}
      className={`formpost ${isCloseForm && "exit-formpost"}`}
    >
      <form
        onClick={handleFormClick}
        className="formpost__form"
        onSubmit={handleSubmit(submit)}
      >
        <h2 className="formpost__title">Create a new Post</h2>
        <div className="formpost__section">
          <label className="formpost__label" htmlFor="post-title">
            Post Title
          </label>
          <input
            className="formpost__input"
            type="text"
            id="post-title"
            {...register("title")}
          />
        </div>
        <div className="formpost__section">
          <label className="formpost__label" htmlFor="post-description">
            Description
          </label>
          <input
            className="formpost__input"
            type="text"
            id="post-description"
            {...register("description")}
          />
        </div>
        <div className="formpost__section">
          <input
            required
            type="file"
            id="file"
            name="file"
            accept="image/*"
            multiple
            onChange={(e) => setFile(e.target.files)}
          />
        </div>
        <button className="formpost__btn">Create</button>
      </form>
    </div>
  );
};

export default FormPost;
