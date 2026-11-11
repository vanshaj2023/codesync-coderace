import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { SocketProvider } from "./socket-provider";
import { getUserColor } from "./user-colors";

/**
 * Creates the shared document for one room visit: the code (`text`), room settings
 * such as the language (`meta`), and presence (`awareness`), synced over `socket`.
 */
export const createCollabSession = ({ socket, roomId, username, onError }) => {
  const doc = new Y.Doc();
  const awareness = new Awareness(doc);
  awareness.setLocalStateField("user", { name: username, ...getUserColor(username) });

  const provider = new SocketProvider({
    socket,
    roomId,
    username,
    doc,
    awareness,
    onError,
  });

  return {
    doc,
    awareness,
    provider,
    text: doc.getText("code"),
    meta: doc.getMap("meta"),
    destroy() {
      provider.destroy();
      doc.destroy();
    },
  };
};
