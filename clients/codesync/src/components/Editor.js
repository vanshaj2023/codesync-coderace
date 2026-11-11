import React, { useEffect, useRef } from "react";
import * as Y from "yjs";
import { Compartment, EditorState, Prec } from "@codemirror/state";
import { EditorView, drawSelection, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";

const editorTheme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "#0b110f" },
  // Keep Dracula's syntax colors but sit on the app's ink palette instead of its purple-grey.
  ".cm-gutters": { backgroundColor: "#0b110f", borderRight: "1px solid rgba(255, 255, 255, 0.06)" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "rgba(94, 210, 156, 0.06)" },
  // Headroom so the name tag of a cursor on the first line is not clipped.
  ".cm-content": { paddingTop: "22px" },
  ".cm-ySelectionInfo": {
    opacity: 1,
    top: "-1.45em",
    padding: "1px 6px",
    borderRadius: "4px 4px 4px 0",
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: "11px",
    fontWeight: 500,
    pointerEvents: "none",
  },
});

const isEditable = (provider) =>
  EditorView.editable.of(provider.getSnapshot().hasSynced);

function Editor({ collab }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const { text, awareness, provider } = collab;
    const undoManager = new Y.UndoManager(text);
    const editable = new Compartment();

    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: text.toString(),
        extensions: [
          lineNumbers(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          javascript(),
          dracula,
          Prec.high(editorTheme),
          keymap.of([
            ...closeBracketsKeymap,
            ...yUndoManagerKeymap,
            ...defaultKeymap,
            indentWithTab,
          ]),
          // Locked until the first sync so nobody types into what looks like an empty room.
          editable.of(isEditable(provider)),
          yCollab(text, awareness, { undoManager }),
        ],
      }),
    });

    const unsubscribe = provider.subscribe(() => {
      view.dispatch({ effects: editable.reconfigure(isEditable(provider)) });
    });

    return () => {
      unsubscribe();
      view.destroy();
      undoManager.destroy();
    };
  }, [collab]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}

export default Editor;
