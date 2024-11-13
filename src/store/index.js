import { configureStore } from "@reduxjs/toolkit";

import user from "./slices/user.slice";
import number from "./slices/number.slice";

export default configureStore({
  reducer: {
    user,
    number,
  },
});
