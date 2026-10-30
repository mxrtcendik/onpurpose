import { HoldButton, type HoldButtonState } from "onpurpose";
import { type ReactNode, useEffect, useState } from "react";

const usage = `import { HoldButton } from "onpurpose";

<HoldButton onConfirm={() => deleteProject()}>
  Hold to delete
</HoldButton>`;

const install = "npm install onpurpose";

const labelCode = `<HoldButton onConfirm={() => publish()}>
  {(state) => (state === "confirmed" ? "Published" : "Hold to publish")}
</HoldButton>`;

const variablesCode = `.send {
  color: light-dark(#087443, #8dcfb0);
  --hold-fill: color-mix(in srgb, currentColor 28%, transparent);
  --hold-confirmed: light-dark(#087443, #8dcfb0);
}

<HoldButton className="send" onConfirm={() => send()}>
  Hold to send
</HoldButton>`;

const tailwindCode = `<HoldButton
  className="rounded-full text-red-700 dark:text-red-300"
  onConfirm={() => revokeAccess()}>
  Hold to revoke
</HoldButton>`;

const rowCode = `<div className="row" onClick={openProject}>
  <div>
    <p>Northwind</p>
    <p>12 files, shared with 4 people</p>
  </div>
  <HoldButton onConfirm={removeProject}>Remove Northwind</HoldButton>
</div>`;

const handled = [
  {
    title: "Pointer",
    items: [
      "Only the main pointer starts a hold: left click, or one finger. A second finger is ignored, even when it lifts.",
      "The pointer is captured, so letting go still registers if your finger has slid off the button.",
      "Drag off the button and the hold cancels. Sliding back on does not resume it, and releasing outside never confirms.",
      "If the pointer is cancelled, or something else takes over the pointer, the hold cancels.",
      "On a phone, the long-press menu, text selection, and magnifier stay out of the way while you hold.",
      "Scroll the button out from under your finger and the hold cancels.",
    ],
  },
  {
    title: "Keyboard",
    items: [
      "Hold Space or Enter. A key that is already down won't start the timer again, and releasing a different key won't stop it.",
    ],
  },
  {
    title: "Page",
    items: [
      "Tab away, switch windows, or hide the tab, and an unfinished hold cancels. It won't finish in the background.",
      "disabled stops a hold that's already going, and a disabled button can't start one.",
      "Handlers you pass run first. Call preventDefault and the hold never starts.",
      "A short press still clicks, and that click bubbles. It does not confirm. After a finished hold, letting go doesn't click, so a parent handler won't run as well.",
      "type is button unless you say otherwise, so it won't submit a form.",
      "If the button unmounts mid-hold, the timer is cleared. onConfirm does not run after it's gone.",
      "With reduced motion, the button doesn't shrink and an early release snaps back. The fill still moves, because that's how you can tell the hold is working.",
    ],
  },
];

function SyncState({
  state,
  onChange,
  children,
}: {
  state: HoldButtonState;
  onChange: (state: HoldButtonState) => void;
  children: ReactNode;
}) {
  useEffect(() => {
    onChange(state);
  }, [state, onChange]);

  return children;
}

function ProjectRow() {
  const [opened, setOpened] = useState(false);
  const [removed, setRemoved] = useState(false);

  return (
    // The row is the ancestor that receives a bubbled click. The button is the keyboard control.
    // biome-ignore lint/a11y/noStaticElementInteractions: row receives the bubbled click
    // biome-ignore lint/a11y/useKeyWithClickEvents: the remove button is the keyboard control
    <div
      className="row"
      onClick={() => {
        if (!removed) setOpened(true);
      }}
    >
      <div>
        <p className="row-title">Northwind</p>
        <p className="row-meta">
          {removed
            ? "Removed. The row didn't open."
            : opened
              ? "Opened. A short click still hits the row."
              : "12 files, shared with 4 people"}
        </p>
      </div>
      <HoldButton disabled={removed} onConfirm={() => setRemoved(true)}>
        {(state) => (removed || state === "confirmed" ? "Removed" : "Remove Northwind")}
      </HoldButton>
    </div>
  );
}

function Figure({ code, children }: { code: string; children: ReactNode }) {
  return (
    <div className="figure">
      <div className="figure-demo">{children}</div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function App() {
  const [confirmed, setConfirmed] = useState(0);
  const [sendState, setSendState] = useState<HoldButtonState>("idle");

  return (
    <main className="page">
      <header>
        <h1>onpurpose</h1>
        <p className="lede">
          For delete, publish, revoke — the things you don't want on a misclick. Hold the button
          until it fills. Let go early and nothing happens.
        </p>
      </header>

      <div className="hero">
        <Figure code={usage}>
          <HoldButton onConfirm={() => setConfirmed((count) => count + 1)}>
            Hold to delete
          </HoldButton>
          <p className="result" data-testid="confirms" data-count={confirmed}>
            {confirmed === 0
              ? "Hold it through. A click, or letting go halfway, leaves the project where it is."
              : "Project deleted."}
          </p>
        </Figure>
      </div>

      <section className="section">
        <h2>Install</h2>
        <pre>
          <code>{install}</code>
        </pre>
        <p>
          React 18.3 and 19. No provider, and no stylesheet to import. It picks up the font and
          color of the page it's on.
        </p>
      </section>

      <section className="section">
        <h2>Use it</h2>
        <p>
          <code>onConfirm</code> is the only prop you need. The rest is for when you want the label
          or the colors to change.
        </p>

        <ol className="steps">
          <li className="step">
            <h3>Pass the action</h3>
            <p>
              <code>onConfirm</code> runs once, at the end of the hold. The words inside the button
              are the label. The example above is the whole thing.
            </p>
            <p>
              It takes 1.5 seconds. The fill crosses the button in that same time, so you can see
              how close you are. Let go and it eases back. While you're pressing, the button settles
              in a little. <code>type</code> is <code>button</code>, so it won't submit a form you
              drop it into.
            </p>
            <p>
              <code>onConfirm</code> returns right away. If the work is a request, the button is
              idle again while that request is still going, and someone can hold it a second time.
              Disable it yourself until the request finishes.
            </p>
          </li>

          <li className="step">
            <h3>Change the label</h3>
            <p>
              Pass a function as <code>children</code> when the words should change as you hold. It
              receives <code>idle</code>, <code>holding</code>, or <code>confirmed</code>.{" "}
              <code>confirmed</code> stays while you're still holding, then for a moment after you
              let go.
            </p>
            <Figure code={labelCode}>
              <HoldButton onConfirm={() => {}}>
                {(state) => (state === "confirmed" ? "Published" : "Hold to publish")}
              </HoldButton>
            </Figure>
          </li>

          <li className="step">
            <h3>Set the color</h3>
            <p>
              Font and color come from the page, so light and dark usually just work.{" "}
              <code>--hold-fill</code> is the wash that tracks the hold.{" "}
              <code>--hold-confirmed</code> is the solid color at the end. Corners are 0.5em until a
              class changes them.
            </p>
            <p>
              <code>data-state</code> is idle, holding, or confirmed, if you want to style each
              phase yourself. <code>data-disabled</code> is set while the button is disabled.
            </p>
            <Figure code={variablesCode}>
              <HoldButton className="send" onConfirm={() => {}}>
                {(state) => (
                  <SyncState state={state} onChange={setSendState}>
                    Hold to send
                  </SyncState>
                )}
              </HoldButton>
              <p className="state" data-state={sendState}>
                <code>data-state="{sendState}"</code>
              </p>
            </Figure>
          </li>

          <li className="step">
            <h3>Use your own classes</h3>
            <p>
              <code>className</code> goes on the button. The built-in CSS sits in a layer called{" "}
              <code>hold-button</code>, so your classes win. Tailwind works the same way.
            </p>
            <Figure code={tailwindCode}>
              <HoldButton
                className="rounded-full text-red-700 dark:text-red-300"
                onConfirm={() => {}}
              >
                Hold to revoke
              </HoldButton>
            </Figure>
          </li>

          <li className="step">
            <h3>Put it in the row</h3>
            <p>
              It belongs at the end of the thing it will destroy. Click the row and it opens.
              Holding remove deletes it, and that hold doesn't also open the row.
            </p>
            <Figure code={rowCode}>
              <ProjectRow />
            </Figure>
          </li>
        </ol>
      </section>

      <section className="section">
        <h2>What it handles</h2>
        <p>
          A quick click won't run the action. The button also gives up if you drag off, switch away,
          or a second finger gets involved.
        </p>
        {handled.map((group) => (
          <div className="handled" key={group.title}>
            <h3>{group.title}</h3>
            <ul className="list">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="section">
        <h2>Accessibility</h2>
        <p>
          It's a normal button, with a focus ring you can see. The name is the label on it. Use{" "}
          <code>aria-label</code> or <code>aria-labelledby</code> if the name should be something
          else. A hidden note, “Press and hold to confirm”, is attached with{" "}
          <code>aria-describedby</code>. Pass your own and your ids come first. When the hold
          finishes, a live region says “Confirmed”. That note, and the word “Confirmed”, are
          English. There isn't a prop to change them.
        </p>
        <h3>Hit target</h3>
        <p>
          On a touch screen the tappable area is at least 44px tall. The button doesn't grow to get
          there.
        </p>
        <h3>High contrast</h3>
        <p>
          A faint wash can disappear in forced colors, so the fill and the confirmed state use
          Highlight. If the person has asked for more contrast, the fill gets stronger too.
        </p>
        <h3>Screen readers</h3>
        <p>
          Screen readers activate a button with a click. They don't hold it for 1.5 seconds, and
          this button won't treat that click as a confirm. A double-tap can't delete anything. Space
          and Enter only confirm when those keys actually reach the page.
        </p>
        <ul className="list">
          <li>
            macOS VoiceOver: VO+Space is a click, so it doesn't confirm. Holding a real key can
            still get through in Safari, and that does.
          </li>
          <li>
            iOS VoiceOver and TalkBack: a double-tap is a click or a short tap. It doesn't confirm.
          </li>
          <li>
            NVDA and JAWS in browse mode: Enter usually arrives as a click, not a held key. Chrome
            can't tell that click from a mouse click, so it doesn't confirm. Pass-through mode can
            send a real key hold, and that does.
          </li>
        </ul>
      </section>

      <p className="footer">
        <a href="https://github.com/mxrtcendik/onpurpose">MIT</a>. Mert Cendik.
      </p>
    </main>
  );
}
