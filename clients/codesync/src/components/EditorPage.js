import React, { useEffect, useRef, useState } from "react";
import Client from "./Client";
import Editor from "./Editor";
import { Logo } from "./Logo";
import { getBackendUrl, initSocket } from "../Socket";
import { createCollabSession } from "../collab/collab-session";
import { ACTIONS } from "../Actions";
import {
  useNavigate,
  useLocation,
  Navigate,
  useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";

const LANGUAGES = [
  "python3",
  "java",
  "cpp",
  "nodejs",
  "c",
  "ruby",
  "go",
  "scala",
  "bash",
  "sql",
  "pascal",
  "csharp",
  "php",
  "swift",
  "rust",
  "r",
];

const DEFAULT_LANGUAGE = "cpp";

function EditorPage() {
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [isCompileWindowOpen, setIsCompileWindowOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LANGUAGE);
  const [collab, setCollab] = useState(null);
  const outputRef = useRef("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 900 : false
  );

  const Location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const socketRef = useRef(null);
  const usernameRef = useRef(Location.state?.username);

  useEffect(() => {
    if (!usernameRef.current) return undefined;

    let isCancelled = false;
    let session = null;

    const init = async () => {
      try {
        const socket = await initSocket();
        if (isCancelled) {
          socket.disconnect();
          return;
        }
        socketRef.current = socket;

        const handleErrors = (err) => {
          console.log("Error", err);
          toast.error("Socket connection failed, Try again later");
          navigate("/");
        };

        // After the first connect, drops are transient: Socket.IO reconnects and
        // the collab session resyncs, so the user stays in the room.
        let hasConnected = false;
        socket.on("connect", () => {
          setSocketConnected(true);
          if (hasConnected) toast.success("Reconnected", { id: "connection" });
          hasConnected = true;
        });
        socket.on("connect_error", (err) => {
          if (!hasConnected) handleErrors(err);
        });
        socket.on("connect_failed", (err) => handleErrors(err));
        socket.on("disconnect", () => {
          setSocketConnected(false);
          if (socket.active) {
            toast.error("Connection lost, reconnecting...", { id: "connection" });
          }
        });

        socket.on(ACTIONS.JOINED, ({ clients, username }) => {
          if (username !== usernameRef.current) {
            toast.success(`${username} joined the room.`);
          }
          setClients(clients);
        });

        socket.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
          toast.success(`${username} left the room`);
          setClients((prev) => {
            return prev.filter((client) => client.socketId !== socketId);
          });
        });

        socket.on(ACTIONS.OUTPUT_CHANGE, ({ output }) => {
          const nextOutput =
            typeof output === "string" ? output : JSON.stringify(output);
          setOutput(nextOutput);
          outputRef.current = nextOutput;
        });

        session = createCollabSession({
          socket,
          roomId,
          username: usernameRef.current,
          onError: (err) => {
            console.log("Collab error", err);
            toast.error("Failed to join the room, try again later");
            navigate("/");
          },
        });
        setCollab(session);
      } catch (err) {
        console.log("Socket initialization error:", err);
        toast.error("Failed to initialize socket connection");
        navigate("/");
      }
    };

    init();

    return () => {
      isCancelled = true;
      session?.destroy();
      setCollab(null);
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off(ACTIONS.OUTPUT_CHANGE);
        socketRef.current.off("connect");
        socketRef.current.off("connect_error");
        socketRef.current.off("connect_failed");
        socketRef.current.off("disconnect");
        socketRef.current.disconnect();
      }
    };
  }, [roomId, navigate]);

  useEffect(() => {
    if (!collab) return undefined;

    const syncLanguage = () => {
      setSelectedLanguage(collab.meta.get("language") ?? DEFAULT_LANGUAGE);
    };
    collab.meta.observe(syncLanguage);
    syncLanguage();

    return () => collab.meta.unobserve(syncLanguage);
  }, [collab]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!Location.state) {
    return <Navigate to="/" />;
  }

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success(`Room ID is copied`);
    } catch (error) {
      console.log(error);
      toast.error("Unable to copy the room ID");
    }
  };

  const leaveRoom = async () => {
    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.LEAVE);
      socketRef.current.disconnect();
    }
    navigate("/");
  };

  const handleLanguageChange = (language) => {
    if (!collab) return;
    collab.meta.set("language", language);
  };

  const runCode = async () => {
    if (!socketConnected || !collab) {
      toast.error("Connection lost. Trying to reconnect...");
      return;
    }

    setIsCompiling(true);
    try {
      const response = await axios.post(`${getBackendUrl()}/api/codesync/compile`, {
        code: collab.text.toString(),
        language: selectedLanguage,
        roomId
      });
      
      const result = response.data.output || JSON.stringify(response.data);
      setOutput(result);
      outputRef.current = result;
      
      // socketRef.current.emit(ACTIONS.OUTPUT_CHANGE, {
      //   roomId,
      //   output: result
      // });
    } catch (error) {
      const errorMessage = error.response?.data?.error || "An error occurred";
      setOutput(errorMessage);
      outputRef.current = errorMessage;
      
      // socketRef.current.emit(ACTIONS.OUTPUT_CHANGE, {
      //   roomId,
      //   output: errorMessage
      // });
    } finally {
      setIsCompiling(false);
    }
  };

  const toggleCompileWindow = () => {
    setIsCompileWindowOpen(!isCompileWindowOpen);
  };

  const containerStyle = {
    ...styles.container,
    flexDirection: isMobile ? "column" : "row",
  };
  const sidebarStyle = {
    ...styles.sidebar,
    width: isMobile ? "100%" : "280px",
    height: isMobile ? "auto" : "100%",
    borderRight: isMobile ? "none" : styles.sidebar.borderRight,
    borderBottom: isMobile ? "1px solid rgba(255,255,255,0.05)" : "none",
  };
  const editorAreaStyle = {
    ...styles.editorArea,
    minHeight: isMobile ? "60vh" : "auto",
  };

  return (
    <div style={containerStyle}>
      <div style={sidebarStyle}>
        <div style={styles.logoContainer}>
          <Logo size={50} style={styles.logo} />
          <div style={styles.roomIndicator}>
            <span style={styles.roomLabel}>Room:</span>
            <span style={styles.roomId}>{roomId.substring(0, 8)}...</span>
          </div>
        </div>
        
        <div style={styles.membersContainer}>
          <div style={styles.sectionHeader}>
            <i className="fas fa-users" style={styles.sectionIcon}></i>
            <h4 style={styles.sectionTitle}>Active Members</h4>
            <span style={styles.memberCount}>{clients.length}</span>
          </div>
          <div style={styles.membersList}>
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>
        
        <div style={styles.sidebarButtons}>
          <button 
            style={styles.copyButton} 
            onClick={copyRoomId}
          >
            <i className="fas fa-copy" style={styles.buttonIcon}></i>
            Copy Room ID
          </button>
          <button 
            style={styles.leaveButton} 
            onClick={leaveRoom}
          >
            <i className="fas fa-sign-out-alt" style={styles.buttonIcon}></i>
            Leave Room
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div style={editorAreaStyle}>
        <div style={styles.toolbar}>
          <div style={styles.languageSelector}>
            <i className="fas fa-code" style={styles.selectorIcon}></i>
            <select
              style={styles.languageSelect}
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang} style={styles.option}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.editorWrapper}>
          {collab && <Editor collab={collab} />}
        </div>
      </div>

     
      <button
        style={styles.compilerToggle}
        onClick={toggleCompileWindow}
      >
        <i className={`fas ${isCompileWindowOpen ? 'fa-times' : 'fa-terminal'}`} 
           style={styles.toggleIcon}></i>
        {isCompileWindowOpen ? "Close Console" : "Open Console"}
      </button>

      {/* Compiler Output Panel */}
      <div style={{
        ...styles.compilerPanel,
        height: isCompileWindowOpen ? "30vh" : "0",
        padding: isCompileWindowOpen ? "16px" : "0",
        borderTop: isCompileWindowOpen ? "1px solid rgba(255,255,255,0.1)" : "none"
      }}>
        <div style={styles.compilerHeader}>
          <div style={styles.outputHeader}>
            <i className="fas fa-play-circle" style={styles.outputIcon}></i>
            <h5 style={styles.compilerTitle}>
              {selectedLanguage.toUpperCase()} Output
              <span style={styles.statusIndicator}>
                {isCompiling ? " (Running)" : ""}
              </span>
            </h5>
          </div>
          <div style={styles.compilerActions}>
            <button
              style={{
                ...styles.runButton,
                ...(isCompiling ? styles.runButtonDisabled : {})
              }}
              onClick={runCode}
              disabled={isCompiling}
            >
              <i className="fas fa-play" style={styles.actionIcon}></i>
              {isCompiling ? "Running..." : "Run Code"}
            </button>
            <button 
              style={styles.closeButton}
              onClick={toggleCompileWindow}
            >
              <i className="fas fa-times" style={styles.actionIcon}></i>
              Close
            </button>
          </div>
        </div>
        <pre style={styles.output}>
          {output || (
            <div style={styles.placeholder}>
              <i className="fas fa-arrow-up" style={styles.placeholderIcon}></i>
              <p>Click "Run Code" to see your output here</p>
            </div>
          )}
        </pre>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#070b0a',
    color: '#e8efec',
    overflow: 'hidden',
    fontFamily: "'Inter', sans-serif"
  },
  sidebar: {
    width: '280px',
    backgroundColor: 'rgba(7, 11, 10, 0.8)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    borderRight: '1px solid rgba(255,255,255,0.05)',
    boxShadow: '4px 0 15px rgba(0,0,0,0.1)',
    zIndex: 2
  },
  logoContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  logo: {
    height: '50px',
    width: '50px',
    marginBottom: '15px',
    filter: 'drop-shadow(0 0 10px rgba(94, 210, 156, 0.5))'
  },
  roomIndicator: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 28, 25, 0.5)',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px'
  },
  roomLabel: {
    color: '#8a9a94',
    marginRight: '6px'
  },
  roomId: {
    fontWeight: '600',
    color: '#e8efec'
  },
  membersContainer: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  sectionIcon: {
    color: '#5ed29c',
    marginRight: '10px',
    fontSize: '14px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#c9d4cf',
    margin: 0,
    flex: 1
  },
  memberCount: {
    backgroundColor: 'rgba(94, 210, 156, 0.2)',
    color: '#5ed29c',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '600'
  },
  membersList: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '8px'
  },
  sidebarButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '20px'
  },
  buttonIcon: {
    marginRight: '8px'
  },
  copyButton: {
    backgroundColor: 'rgba(94, 210, 156, 0.2)',
    color: '#5ed29c',
    border: '1px solid rgba(94, 210, 156, 0.3)',
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'rgba(94, 210, 156, 0.3)'
    }
  },
  leaveButton: {
    backgroundColor: 'rgba(229, 62, 62, 0.2)',
    color: '#e53e3e',
    border: '1px solid rgba(229, 62, 62, 0.3)',
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'rgba(229, 62, 62, 0.3)'
    }
  },
  editorArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    minHeight: 0
  },
  editorWrapper: {
    flex: 1,
    minHeight: 0
  },
  toolbar: {
    backgroundColor: 'rgba(7, 11, 10, 0.8)',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'flex-end',
    backdropFilter: 'blur(5px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    zIndex: 1
  },
  languageSelector: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 28, 25, 0.5)',
    borderRadius: '6px',
    padding: '4px 8px',
    border: '1px solid rgba(138, 154, 148, 0.5)'
  },
  selectorIcon: {
    color: '#5ed29c',
    marginRight: '8px',
    fontSize: '14px'
  },
  languageSelect: {
    backgroundColor: 'transparent',
    color: 'white',
    border: 'none',
    padding: '4px 8px',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    fontWeight: '500'
  },
  option: {
    backgroundColor: '#0e1512',
    padding: '8px'
  },
  compilerToggle: {
    position: 'fixed',
    bottom: '25px',
    right: '25px',
    backgroundColor: '#5ed29c',
    color: '#070b0a',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '50px',
    cursor: 'pointer',
    fontWeight: '500',
    zIndex: 100,
    boxShadow: '0 4px 15px rgba(94, 210, 156, 0.3)',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#5ed29c',
      transform: 'translateY(-2px)'
    }
  },
  toggleIcon: {
    marginRight: '8px',
    fontSize: '14px'
  },
  compilerPanel: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(7, 11, 10, 0.95)',
    backdropFilter: 'blur(10px)',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 99,
    display: 'flex',
    flexDirection: 'column'
  },
  compilerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  outputHeader: {
    display: 'flex',
    alignItems: 'center'
  },
  outputIcon: {
    color: '#5ed29c',
    marginRight: '10px',
    fontSize: '18px'
  },
  compilerTitle: {
    fontSize: '15px',
    fontWeight: '600',
    margin: 0,
    color: '#e8efec',
    display: 'flex',
    alignItems: 'center'
  },
  statusIndicator: {
    color: '#8a9a94',
    fontSize: '13px',
    marginLeft: '8px',
    fontWeight: 'normal'
  },
  compilerActions: {
    display: 'flex',
    gap: '10px'
  },
  actionIcon: {
    marginRight: '6px',
    fontSize: '12px'
  },
  runButton: {
    backgroundColor: 'rgba(94, 210, 156, 0.2)',
    color: '#5ed29c',
    border: '1px solid rgba(94, 210, 156, 0.3)',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'rgba(94, 210, 156, 0.3)'
    }
  },
  runButtonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed'
  },
  closeButton: {
    backgroundColor: 'rgba(138, 154, 148, 0.2)',
    color: '#c9d4cf',
    border: '1px solid rgba(138, 154, 148, 0.3)',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'rgba(138, 154, 148, 0.3)'
    }
  },
  output: {
    flex: 1,
    backgroundColor: 'rgba(18, 28, 25, 0.5)',
    padding: '15px',
    borderRadius: '6px',
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowY: 'auto',
    fontFamily: "'Fira Code', monospace",
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#e8efec'
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#64748b',
    fontSize: '14px'
  },
  placeholderIcon: {
    fontSize: '24px',
    marginBottom: '10px',
    opacity: 0.5
  }
};

export default EditorPage;
