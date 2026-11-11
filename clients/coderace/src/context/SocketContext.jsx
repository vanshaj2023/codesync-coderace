import { useEffect, useMemo } from "react";
import { io } from "socket.io-client";
import { SocketContext } from "./socketStore.js";
import { BACKEND_URL } from "../utils/backendUrl.js";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || BACKEND_URL;

export const SocketProvider = ({ children }) => {
  // CodeRace lives on its own namespace so its rooms stay separate from CodeSync's.
  const socket = useMemo(() => io(`${SOCKET_URL}/race`), []);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("🔌 Connected:", socket.id);
    });

    return () => socket.disconnect();
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

