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
  className="rounded-full font-medium text-red-700 dark:text-red-300"
  onConfirm={() => revokeAccess()}
>
  Hold to revoke
</HoldButton>`;

const handled = [
  {
    title: "Pointer",
    items: [
      "Only the primary pointer can start a hold. A second finger is ignored, including its release.",
      "The pointer is captured, so a release is still received if it lands outside the button.",
      "Dragging off the button cancels the hold. Dragging back does not resume it. Releasing outside never confirms.",
      "A cancelled pointer, or losing pointer capture, cancels the hold.",
      "On touch, the long-press callout, text selection, and magnifier stay off during the hold.",
      "A scroll that carries the button off the pointer cancels the hold.",
    ],
  },
  {
    title: "Keyboard",
    items: [
      "Space and Enter hold. Key repeat is ignored. Only the key that started the hold can end it.",
    ],
  },
  {
    title: "Page",
    items: [
      "Blur, the window losing focus, or the tab being hidden cancels an in-progress hold.",
      "disabled cancels a hold and cannot start one.",
      "Handlers you pass run first. If they call preventDefault, the hold does not start.",
      "A short press still fires a click. That click does not confirm, and it bubbles.",
      "type defaults to button, so the hold does not submit a form.",
      "Unmounting during a hold clears the timer. onConfirm does not run after the button is gone.",
      "The hold takes 1.5 seconds. The fill moves linearly across that same time. Letting go early retracts it, and nothing runs.",
      "After confirming, the button stays inverted while you are still holding, then for a moment after you let go.",
      "Reduced motion removes the press scale and makes the retract instant. The fill still moves, and the confirmed colors stay.",
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
        <p className="lede">A button for actions you should not be able to do by accident.</p>
      </header>

      <div className="hero">
        <Figure code={usage}>
          <HoldButton onConfirm={() => setConfirmed((count) => count + 1)}>
            Hold to delete
          </HoldButton>
          <p className="result" data-testid="confirms" data-count={confirmed}>
            {confirmed === 0
              ? "Hold until it fills. Letting go early does nothing."
              : "Project deleted."}
          </p>
        </Figure>
      </div>

      <section className="section">
        <h2>Install</h2>
        <pre>
          <code>{install}</code>
        </pre>
        <p>React 18.3 or 19. No provider, and no stylesheet to import.</p>
      </section>

      <section className="section">
        <h2>Examples</h2>

        <article className="example">
          <h3>Label</h3>
          <p>Children can be a function of the state: idle, holding, or confirmed.</p>
          <Figure code={labelCode}>
            <HoldButton onConfirm={() => {}}>
              {(state) => (state === "confirmed" ? "Published" : "Hold to publish")}
            </HoldButton>
          </Figure>
        </article>

        <article className="example">
          <h3>CSS variables</h3>
          <p>
            <code>--hold-fill</code> is the progress wash. <code>--hold-confirmed</code> is the
            solid color after the hold completes. Color and font are inherited. The radius is 0.5em
            unless a class replaces it.
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
        </article>

        <article className="example">
          <h3>Tailwind</h3>
          <p>
            Pass utilities through className. The component’s styles sit in a layer, so those
            classes win.
          </p>
          <Figure code={tailwindCode}>
            <HoldButton
              className="rounded-full font-medium text-red-700 dark:text-red-300"
              onConfirm={() => {}}
            >
              Hold to revoke
            </HoldButton>
          </Figure>
        </article>
      </section>

      <section className="section">
        <h2>What it handles</h2>
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
          It is a real button, with a visible focus ring. The accessible name is the visible label.
          A hidden description, “Press and hold to confirm”, is attached with aria-describedby. If
          you pass your own aria-describedby, your ids come first. When the hold completes, a polite
          live region says “Confirmed”.
        </p>
        <h3>Hit target</h3>
        <p>
          On a coarse pointer the hit area grows until it is at least 44px tall. The visual size of
          the button stays the same.
        </p>
        <h3>High contrast</h3>
        <p>
          In forced colors the fill and the confirmed state use Highlight, so the progress stays
          visible when a translucent wash would disappear. Stronger contrast also deepens the fill.
        </p>
        <h3>Screen readers</h3>
        <p>
          A plain screen reader activate is a click, not a 1.5 second hold. This button does not
          confirm on that click. Space or Enter confirm only when those keys actually reach the
          page. A tap still cannot delete anything.
        </p>
        <ul className="list">
          <li>
            macOS VoiceOver: VO+Space clicks, so it does not confirm. A physical key held down can
            still send key events in Safari, and those do confirm.
          </li>
          <li>
            iOS VoiceOver and TalkBack: a double-tap fires a click or a short tap. It does not
            confirm.
          </li>
          <li>
            NVDA and JAWS in browse mode: Enter usually arrives as a click, not a key. On Chrome
            that click cannot be distinguished from a real mouse click, so it does not confirm.
            Pass-through can deliver a real key hold, which does confirm.
          </li>
        </ul>
      </section>

      <p className="footer">
        <a href="https://github.com/mxrtcendik/onpurpose">MIT</a>. Mert Cendik.
      </p>
    </main>
  );
}
