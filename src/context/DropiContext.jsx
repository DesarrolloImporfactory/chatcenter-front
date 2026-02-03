import React, { createContext, useContext } from "react";

export const DropiContext = createContext({
  isDropiLinked: null,
  loadingDropiLinked: false,
  refreshDropiLinked: async () => {},
});

export const useDropi = () => useContext(DropiContext);
