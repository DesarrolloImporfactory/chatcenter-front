import { configureStore } from "@reduxjs/toolkit";

import user from "./slices/user.slice";
import number from "./slices/number.slice";
import comunidad from "./slices/comunidad.slice";

export default configureStore({
  reducer: {
    user,
    number,
    comunidad,
  },
});
